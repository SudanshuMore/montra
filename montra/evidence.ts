import { type Context, role, resource, account, auditStmt, audit } from './access.ts';
import { type Row, stmt, one, many } from './db.ts';
import { fail, money, uid, now, hash } from './money.ts';
export interface ObjectStore {put(key:string,value:ArrayBuffer|string,options?:any):Promise<any>;get(key:string):Promise<any>;delete(key:string):Promise<any>}
export interface MalwareScanner { scan(bytes:ArrayBuffer):Promise<'clean'|'infected'|'unavailable'> }
export class UnconfiguredScanner implements MalwareScanner{async scan(_bytes:ArrayBuffer):Promise<'unavailable'>{return 'unavailable'}}
export async function upload(c:Context,bucket:ObjectStore,p:Row){
 role(c,'administrator','evidence_reviewer');await account(c,p.accountId);
 const org=await one(c.db,'SELECT * FROM organizations WHERE id=?',c.org);if(!org!.demo)fail(503,'Real uploads require a configured malware scanner');
 if(typeof p.text!=='string'||!p.text.startsWith('MONTRA SYNTHETIC INVOICE\n')||/[^\x09\x0A\x0D\x20-\x7E]/.test(p.text))fail(400,'Only labelled ASCII synthetic text invoices are enabled');
 const bytes=new TextEncoder().encode(p.text);if(bytes.length>256*1024)fail(413,'Invoice limit is 256 KiB');
 if(typeof p.name!=='string'||!/^[a-zA-Z0-9 _.-]{1,100}\.txt$/.test(p.name))fail(400,'Use a simple .txt filename');
 const a=await account(c,p.accountId),m=money(p.amount,p.currency);if(a.currency!==p.currency)fail(400,'Invoice currency must match the account');
 if(m.units===0)fail(400,'Invoice amount must be positive');
 const id=uid(),key=c.org+'/'+id;await bucket.put(key,bytes.buffer,{httpMetadata:{contentType:'text/plain'}});
 try{await c.db.batch([stmt(c.db,'INSERT INTO documents(id,org_id,account_id,name,object_key,mime,size,sha256,amount,units,currency,scan_status,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,c.org,a.id,p.name,key,'text/plain',bytes.length,await hash(bytes.buffer),m.amount,m.units,m.currency,'synthetic_text_only',c.user.id,now()),auditStmt(c,'document.uploaded',id)]);}catch(e){await bucket.delete(key);throw e}
 return {id};
}
export async function propose(c:Context,p:Row){
 role(c,'administrator','evidence_reviewer');
 const tx=await resource(c,'transactions',p.transactionId),doc=await resource(c,'documents',p.documentId);
 if(doc.deleted_at||!['synthetic_text_only','clean'].includes(doc.scan_status))fail(409,'Document unavailable');
 if(tx.account_id!==doc.account_id||tx.currency!==doc.currency)fail(400,'Same account and currency are required');
 if(tx.status!=='booked')fail(409,'Only booked transactions can be allocated');
 const m=money(p.amount,tx.currency);if(!m.units||m.units>tx.units||m.units>doc.units)fail(400,'Invalid allocation amount');
 const id=uid();await c.db.batch([stmt(c.db,"INSERT INTO allocations(id,org_id,transaction_id,document_id,amount,units,currency,status,revision_id,created_at) VALUES(?,?,?,?,?,?,?,'suggested',?,?)",id,c.org,tx.id,doc.id,m.amount,m.units,m.currency,tx.revision_id,now()),auditStmt(c,'allocation.suggested',id)]);return {id,status:'suggested'};
}
export async function review(c:Context,id:string,p:Row){
 role(c,'administrator','evidence_reviewer');
 const alloc=await one(c.db,'SELECT * FROM allocations WHERE id=? AND org_id=?',id,c.org);if(!alloc)fail(404,'Allocation not found');
 const tx=await resource(c,'transactions',alloc.transaction_id),doc=await resource(c,'documents',alloc.document_id);
 if(typeof p.note!=='string'||p.note.trim().length<5||p.note.length>1000)fail(400,'Record a review note of 5–1000 characters');
 if(!['confirmed','rejected'].includes(p.decision))fail(400,'Invalid review decision');
 if(alloc.status===p.decision)fail(409,'This decision is already recorded');
 if(p.revisionId!==tx.revision_id)fail(409,'Source changed. Reopen the transaction before reviewing.');
 const rid=uid();
 // INSERT gate and UPDATE run in one atomic batch, preventing concurrent over-allocation.
 const gate=p.decision==='confirmed'?`AND t.status='booked' AND t.revision_id=? AND d.deleted_at IS NULL AND d.scan_status IN ('clean','synthetic_text_only') AND t.currency=d.currency AND t.account_id=d.account_id AND a.units+COALESCE((SELECT SUM(x.units) FROM allocations x WHERE x.org_id=a.org_id AND x.transaction_id=a.transaction_id AND x.id<>a.id AND x.status='confirmed'),0)<=t.units AND a.units+COALESCE((SELECT SUM(x.units) FROM allocations x WHERE x.org_id=a.org_id AND x.document_id=a.document_id AND x.id<>a.id AND x.status='confirmed'),0)<=d.units`:'';
 await c.db.batch([
  stmt(c.db,`INSERT INTO match_reviews(id,org_id,allocation_id,reviewer_id,decision,note,created_at) SELECT ?,a.org_id,a.id,?,?,?,? FROM allocations a JOIN transactions t ON t.id=a.transaction_id AND t.org_id=a.org_id JOIN documents d ON d.id=a.document_id AND d.org_id=a.org_id WHERE a.id=? AND a.org_id=? AND a.status<>? ${gate}`,rid,c.user.id,p.decision,p.note.trim(),now(),id,c.org,p.decision,...(p.decision==='confirmed'?[p.revisionId]:[])),
  stmt(c.db,'UPDATE allocations SET status=?,revision_id=(SELECT revision_id FROM transactions WHERE id=allocations.transaction_id AND org_id=allocations.org_id) WHERE id=? AND org_id=? AND EXISTS(SELECT 1 FROM match_reviews WHERE id=?)',p.decision,id,c.org,rid),
  stmt(c.db,'INSERT INTO audit_events(id,org_id,actor,action,resource_id,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM match_reviews WHERE id=?)',uid(),c.org,c.user.id,'allocation.'+p.decision,id,now(),rid)
 ]);
 if(!await one(c.db,'SELECT 1 FROM match_reviews WHERE id=? AND org_id=?',rid,c.org))fail(409,'Review rejected: allocation exceeds remaining amount or source/document changed');
 return {id,decision:p.decision};
}
export async function detail(c:Context,id:string){
 const tx=await resource(c,'transactions',id);
 return {transaction:tx,revisions:await many(c.db,'SELECT * FROM source_revisions WHERE org_id=? AND source_id=? ORDER BY retrieved_at DESC',c.org,tx.source_id),
 allocations:await many(c.db,'SELECT a.*,d.name document_name FROM allocations a JOIN documents d ON d.id=a.document_id AND d.org_id=a.org_id WHERE a.org_id=? AND a.transaction_id=?',c.org,id),
 reviews:await many(c.db,'SELECT r.* FROM match_reviews r JOIN allocations a ON a.id=r.allocation_id AND a.org_id=r.org_id WHERE r.org_id=? AND a.transaction_id=? ORDER BY r.created_at DESC',c.org,id)};
}
export async function downloadGrant(c:Context,id:string){const d=await resource(c,'documents',id);if(d.deleted_at||!['synthetic_text_only','clean'].includes(d.scan_status))fail(404,'Document unavailable');const token=uid(),expiresAt=new Date(Date.now()+60000).toISOString();await c.db.batch([stmt(c.db,'INSERT INTO download_grants(id,org_id,user_id,document_id,expires_at) VALUES(?,?,?,?,?)',await hash(token),c.org,c.user.id,id,expiresAt),auditStmt(c,'document.download_granted',id)]);return {token,expiresAt};}
export async function download(c:Context,bucket:ObjectStore,token:string){
 const grant=await one(c.db,'SELECT * FROM download_grants WHERE id=? AND org_id=? AND user_id=? AND expires_at>?',await hash(token),c.org,c.user.id,now());if(!grant)fail(404,'Download link expired or unavailable');
 const doc=await resource(c,'documents',grant.document_id);if(doc.deleted_at||!['synthetic_text_only','clean'].includes(doc.scan_status))fail(404,'Document unavailable');
 const object=await bucket.get(doc.object_key);if(!object)fail(404,'Document unavailable');await audit(c,'document.downloaded',doc.id);
 return new Response(object.body??object,{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="'+doc.name+'"','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; sandbox"}});
}

