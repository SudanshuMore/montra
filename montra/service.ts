import { type Database, type Row, one, many, stmt } from './db.ts';
import { type Identity, context, accounts, account, connection, resource, role, audit, auditStmt } from './access.ts';
import { AppError, fail, uid, now, decimal, hash } from './money.ts';
import { onboard } from './onboarding.ts';
import { enqueue, disconnect, processJobs } from './sync.ts';
import { upload, propose, review, detail, downloadGrant, download, type ObjectStore } from './evidence.ts';
import { reconcile } from './reconciliation.ts';
import { provider } from './providers.ts';
import { integrationReadiness } from './integration-readiness.ts';
export type Runtime={db:Database;bucket:ObjectStore;defer?:(f:()=>Promise<void>)=>void};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
async function readBody(req:Request){
 if(!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'JSON required');
 const reader=req.body?.getReader();if(!reader)return {};const chunks:Uint8Array[]=[];let n=0;
 while(true){const x=await reader.read();if(x.done)break;n+=x.value.length;if(n>512*1024){await reader.cancel();fail(413,'Request limit is 512 KiB')}chunks.push(x.value)}
 const bytes=new Uint8Array(n);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length}
 try{const p=JSON.parse(new TextDecoder().decode(bytes));if(!p||Array.isArray(p)||typeof p!=='object')fail(400,'JSON object required');return p}catch(e){if(e instanceof AppError)throw e;return fail(400,'Invalid JSON')}
}
export async function background(runtime:Runtime,org:string){
 // after()/waitUntil starts immediately. Durable rows survive interruption. Later authenticated reads resume due retries (no production scheduler is configured).
 for(let i=0;i<4;i++){const r=await processJobs(runtime.db,org);if(!r.processed)break;if(r.state==='retry')await new Promise(resolve=>setTimeout(resolve,2200));}
 const due=await many(runtime.db,"SELECT r.*,d.object_key FROM deletion_requests r JOIN documents d ON d.id=r.document_id AND d.org_id=r.org_id WHERE r.org_id=? AND r.state='queued' AND r.due_at<=?",org,now());
 for(const d of due){await runtime.bucket.delete(d.object_key);await runtime.db.batch([stmt(runtime.db,"UPDATE documents SET name='Deleted document',sha256='',object_key='' WHERE org_id=? AND id=?",org,d.document_id),stmt(runtime.db,"UPDATE deletion_requests SET state='purged' WHERE org_id=? AND id=?",org,d.id)]);}
}
export async function handle(req:Request,user:Identity|null,runtime:Runtime):Promise<Response>{
 try{
  if(!user)fail(401,'Sign in to continue');
  const url=new URL(req.url),path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=req.method;
  if(!['GET','POST'].includes(method))fail(405,'Method not allowed');
  if(method==='POST'&&(req.headers.get('origin')!==url.origin||req.headers.get('x-montra-request')!=='1'))fail(403,'Same-origin request required');
  const p=method==='POST'?await readBody(req):{};
  const {db,bucket}=runtime;
  if(path[0]==='session'){
   const orgs=await many(db,'SELECT o.*,m.role FROM organizations o JOIN memberships m ON m.org_id=o.id WHERE m.user_id=? AND o.demo=1 ORDER BY o.created_at,o.name',user.id);
   return json({user,organizations:orgs});
  }
  if(path[0]==='onboard'&&method==='POST'){
   const result=await onboard(db,user,p.name);
   const ms=await many(db,'SELECT org_id FROM memberships WHERE user_id=?',user.id);for(const m of ms)runtime.defer?.(()=>background(runtime,m.org_id));return json(result,201);
  }
  const org=url.searchParams.get('org');if(!org)fail(400,'Organization required');
  const c=await context(db,user,org);
  if(path[0]==='integration-readiness'){
   role(c,'administrator');
   if(method!=='GET'||path.length!==1)fail(405,'Read-only readiness report');
   return json(integrationReadiness());
  }
  if(path[0]==='state'&&method==='GET'){
   const list=await accounts(c),ids=list.map(a=>a.id),mark=ids.map(()=>'?').join(',')||'NULL';
   const tx=await many(db,`SELECT t.*,a.name account_name,a.mask,a.bank,(SELECT COALESCE(SUM(al.units),0) FROM allocations al WHERE al.org_id=t.org_id AND al.transaction_id=t.id AND al.status='confirmed') confirmed_units FROM transactions t JOIN accounts a ON a.org_id=t.org_id AND a.id=t.account_id WHERE t.org_id=? AND t.account_id IN (${mark}) ORDER BY COALESCE(t.booked_at,t.source_at) DESC,t.id LIMIT 1000`,org,...ids);
   const docs=await many(db,`SELECT id,org_id,account_id,name,mime,size,amount,currency,scan_status,created_at,deleted_at FROM documents WHERE org_id=? AND account_id IN (${mark}) AND deleted_at IS NULL ORDER BY created_at DESC`,org,...ids);
   const connections=await many(db,`SELECT DISTINCT c.* FROM connections c JOIN accounts a ON a.connection_id=c.id AND a.org_id=c.org_id WHERE c.org_id=? AND a.id IN (${mark})`,org,...ids);
   // Totals cover the entire authorized ledger, independently of the display cap.
   // Return SQLite integer sums as text to preserve precision across the JS boundary.
   const sums=await many(db,`SELECT currency,direction,CAST(SUM(units) AS TEXT) units FROM transactions WHERE org_id=? AND account_id IN (${mark}) AND status IN ('booked','reversed') GROUP BY currency,direction`,org,...ids);
   const count=await one(db,`SELECT COUNT(*) total FROM transactions WHERE org_id=? AND account_id IN (${mark})`,org,...ids);
   const summaries:Record<string,{credit:bigint;debit:bigint}>={};
   for(const t of sums){const s=summaries[t.currency]??={credit:0n,debit:0n};s[t.direction as 'credit'|'debit']=BigInt(t.units)}
   const totals=Object.entries(summaries).map(([currency,s])=>({currency,in:decimal(s.credit,currency),out:decimal(s.debit,currency)}));
   const balances=await many(db,`SELECT * FROM balance_snapshots WHERE org_id=? AND account_id IN (${mark}) ORDER BY retrieved_at DESC LIMIT 100`,org,...ids);
   const connectionIds=connections.map(x=>x.id),cm=connectionIds.map(()=>'?').join(',')||'NULL';
   const runs=await many(db,`SELECT * FROM sync_runs WHERE org_id=? AND connection_id IN (${cm}) ORDER BY created_at DESC LIMIT 30`,org,...connectionIds);
   if(c.member.role==='administrator')runtime.defer?.(()=>background(runtime,org));
   return json({accounts:list,transactions:tx,documents:docs,connections:connections.map(x=>({...x,capabilities:provider(x.provider).capabilities})),balances,runs,totals,transactionCount:count!.total,role:c.member.role,limited:count!.total>tx.length,organization:await one(db,'SELECT * FROM organizations WHERE id=?',org)});
  }
  if(path[0]==='accounts'&&method==='GET')return json(await account(c,path[1]));
  if(path[0]==='entities'&&method==='GET'){const a=await accounts(c);const ids=new Set(a.map(x=>x.entity_id));const e=await one(db,'SELECT * FROM entities WHERE org_id=? AND id=?',org,path[1]);if(!e||!ids.has(e.id))fail(404,'Entity not found');return json(e);}
  if(path[0]==='transactions'&&method==='GET')return json(await detail(c,path[1]));
  if(path[0]==='balances'&&method==='GET')return json(await resource(c,'balance_snapshots',path[1]));
  if(path[0]==='sources'&&method==='GET'){const s=await one(db,'SELECT * FROM source_records WHERE org_id=? AND id=?',org,path[1]);if(!s)fail(404,'Source not found');await account(c,s.account_id);return json({source:s,revisions:await many(db,'SELECT * FROM source_revisions WHERE org_id=? AND source_id=?',org,s.id)});}
  if(path[0]==='revisions'&&method==='GET'){const r=await one(db,'SELECT r.*,s.account_id FROM source_revisions r JOIN source_records s ON s.id=r.source_id AND s.org_id=r.org_id WHERE r.org_id=? AND r.id=?',org,path[1]);if(!r)fail(404,'Revision not found');await account(c,r.account_id);return json(r);}
  if(path[0]==='connections'){
   const conn=await connection(c,path[1],method==='POST');
   if(method==='GET')return json({...conn,authorizations:await many(db,'SELECT * FROM authorizations WHERE org_id=? AND connection_id=?',org,conn.id),capabilities:provider(conn.provider).capabilities});
   if(path[2]==='sync'){const job=await enqueue(c,conn.id);runtime.defer?.(()=>background(runtime,org));return json(job,202)}
   if(path[2]==='disconnect')return json(await disconnect(c,conn.id));
   if(path[2]==='renew'){if(conn.provider!=='mock'||conn.status==='disconnected')fail(409,'Only an active demo can be renewed');await db.batch([stmt(db,'UPDATE authorizations SET revoked_at=? WHERE org_id=? AND connection_id=? AND revoked_at IS NULL',now(),org,conn.id),stmt(db,"INSERT INTO authorizations(id,org_id,connection_id,authorized_by,method,scopes,created_at,expires_at) VALUES(?,?,?,?,'Explicit synthetic renewal','accounts:read transactions:read balances:read',?,?)",uid(),org,conn.id,user.id,now(),new Date(Date.now()+30*86400000).toISOString()),stmt(db,"UPDATE connections SET status='connected',exception=NULL WHERE org_id=? AND id=?",org,conn.id),auditStmt(c,'authorization.renewed',conn.id)]);return json({renewed:true});}
   if(path[2]==='scenario'){if(conn.provider!=='mock'||!['normal','duplicate','retry','updated','reversal'].includes(p.scenario))fail(400,'Invalid demo scenario');await db.batch([stmt(db,'UPDATE connections SET scenario=? WHERE org_id=? AND id=?',p.scenario,org,conn.id),auditStmt(c,'demo.scenario_changed',conn.id)]);return json({updated:true});}
  }
  if(path[0]==='jobs'&&method==='GET'){const j=await one(db,'SELECT * FROM sync_runs WHERE org_id=? AND id=?',org,path[1]);if(!j)fail(404,'Job not found');await connection(c,j.connection_id);return json(j);}
  if(path[0]==='authorizations'&&method==='GET'){const a=await one(db,'SELECT * FROM authorizations WHERE org_id=? AND id=?',org,path[1]);if(!a)fail(404,'Authorization not found');await connection(c,a.connection_id);return json(a);}
  if(path[0]==='documents'){
   if(method==='POST'&&!path[1])return json(await upload(c,bucket,p),201);
   const d=await resource(c,'documents',path[1]);if(d.deleted_at)fail(404,'Document unavailable');
   if(method==='GET'){const {object_key,...safe}=d;return json(safe)}
   if(path[2]==='download')return json(await downloadGrant(c,d.id));
   if(path[2]==='delete'){role(c,'administrator');const o=await one(db,'SELECT retention_days FROM organizations WHERE id=?',org);await db.batch([stmt(db,'UPDATE documents SET deleted_at=? WHERE org_id=? AND id=?',now(),org,d.id),stmt(db,"INSERT INTO deletion_requests(id,org_id,document_id,requested_by,due_at,state,created_at) VALUES(?,?,?,?,?,'queued',?)",uid(),org,d.id,user.id,new Date(Date.now()+o!.retention_days*86400000).toISOString(),now()),stmt(db,"UPDATE allocations SET status='needs_review' WHERE org_id=? AND document_id=? AND status='confirmed'",org,d.id),auditStmt(c,'document.deletion_requested',d.id)]);return json({deleted:true,purgeAfterDays:o!.retention_days});}
  }
  if(path[0]==='download'&&method==='GET')return await download(c,bucket,path[1]);
  if(path[0]==='allocations'){
   if(method==='POST'&&!path[1])return json(await propose(c,p),201);
   const a=await one(db,'SELECT * FROM allocations WHERE org_id=? AND id=?',org,path[1]);if(!a)fail(404,'Allocation not found');await resource(c,'transactions',a.transaction_id);await resource(c,'documents',a.document_id);
   if(method==='GET')return json(a);
   if(path[2]==='review')return json(await review(c,a.id,p));
  }
  if(path[0]==='reviews'&&method==='GET'){const r=await one(db,'SELECT r.*,a.transaction_id,a.document_id FROM match_reviews r JOIN allocations a ON a.id=r.allocation_id AND a.org_id=r.org_id WHERE r.org_id=? AND r.id=?',org,path[1]);if(!r)fail(404,'Review not found');await resource(c,'transactions',r.transaction_id);await resource(c,'documents',r.document_id);return json(r);}
  if(path[0]==='reconcile'&&method==='POST')return json(await reconcile(c,p));
  if(path[0]==='reconciliations'&&method==='GET')return json(await resource(c,'reconciliations',path[1]));
  if(path[0]==='export'&&method==='GET'){
   const a=await account(c,url.searchParams.get('account')??'');const rows=await many(db,'SELECT provider_id,amount,currency,direction,status,narration,booked_at,source_at,retrieved_at FROM transactions WHERE org_id=? AND account_id=? ORDER BY booked_at',org,a.id);await audit(c,'transactions.exported',a.id);
   return new Response(JSON.stringify({organization:org,account:a.id,exportedAt:now(),transactions:rows},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="montra-transactions.json"','Cache-Control':'no-store'}});
  }
  if(path[0]==='members'){
   role(c,'administrator');
   if(method==='GET')return json(await many(db,'SELECT m.*,u.email FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.org_id=?',org));
   if(!['administrator','finance_viewer','evidence_reviewer'].includes(p.role)||typeof p.userId!=='string'||!Array.isArray(p.accountIds))fail(400,'User ID, role and account grants required');
   if(p.userId===user.id)fail(409,'Self-permission changes are disabled in the pilot');
   if(!await one(db,'SELECT 1 FROM users WHERE id=?',p.userId))fail(400,'User must sign in and onboard first');
   for(const id of p.accountIds)await account(c,id);
   const q=[stmt(db,'INSERT INTO memberships(org_id,user_id,role,all_accounts) VALUES(?,?,?,?) ON CONFLICT(org_id,user_id) DO UPDATE SET role=excluded.role,all_accounts=excluded.all_accounts',org,p.userId,p.role,p.role==='administrator'?1:0),stmt(db,'DELETE FROM account_grants WHERE org_id=? AND user_id=?',org,p.userId)];
   for(const id of new Set(p.accountIds))q.push(stmt(db,'INSERT INTO account_grants(org_id,user_id,account_id) VALUES(?,?,?)',org,p.userId,id));
   q.push(auditStmt(c,'membership.updated',p.userId));await db.batch(q);return json({updated:true});
  }
  if(path[0]==='audit'&&method==='GET'){role(c,'administrator');return json(await many(db,'SELECT * FROM audit_events WHERE org_id=? ORDER BY created_at DESC LIMIT 100',org));}
  if(path[0]==='retention'&&method==='POST'){role(c,'administrator');if(!Number.isInteger(p.days)||p.days<1||p.days>3650)fail(400,'Retention must be 1–3650 days');await db.batch([stmt(db,'UPDATE organizations SET retention_days=? WHERE id=?',p.days,org),auditStmt(c,'retention.updated',org)]);return json({days:p.days});}
  if(path[0]==='deletions'&&method==='GET'){role(c,'administrator');return json(await many(db,'SELECT * FROM deletion_requests WHERE org_id=?',org));}
  if(path[0]==='work'&&method==='POST'){role(c,'administrator');return json(await processJobs(db,org));}
  if(path[0]==='events')return await provider('mock').verifyEvent(req);
  fail(404,'Route not found');
 }catch(e){if(e instanceof AppError)return json({error:e.message},e.status);return json({error:'Service temporarily unavailable. Your existing records are preserved.'},503)}
}



