import { type Database, type Row, stmt, one, many } from './db.ts';
import { type Context, connection, auditStmt } from './access.ts';
import { fail, now, uid, hash, money } from './money.ts';
import { provider, type Provider, TransientError } from './providers.ts';
export async function enqueue(c:Context,id:string){
 const conn=await connection(c,id,true);if(conn.status!=='connected')fail(409,'Connection is not active');
 if(!await one(c.db,'SELECT 1 FROM authorizations WHERE org_id=? AND connection_id=? AND revoked_at IS NULL AND expires_at>?',c.org,id,now()))fail(409,'Authorization expired; renew before retrieving');
 const run=uid();await c.db.batch([stmt(c.db,"INSERT OR IGNORE INTO sync_runs(id,org_id,connection_id,state,due_at,created_at) VALUES(?,?,?,'queued',?,?)",run,c.org,id,now(),now()),auditStmt(c,'sync.queued',id)]);
 return one(c.db,"SELECT * FROM sync_runs WHERE org_id=? AND connection_id=? AND state IN ('queued','running','retry')",c.org,id);
}
export async function disconnect(c:Context,id:string){
 const conn=await connection(c,id,true);
 await c.db.batch([stmt(c.db,"UPDATE connections SET status='disconnected',generation=generation+1,next_scheduled=NULL WHERE org_id=? AND id=?",c.org,id),stmt(c.db,"UPDATE sync_runs SET state='cancelled',finished_at=?,lease_token=NULL WHERE org_id=? AND connection_id=? AND state IN ('queued','retry','running')",now(),c.org,id),stmt(c.db,'UPDATE authorizations SET revoked_at=? WHERE org_id=? AND connection_id=? AND revoked_at IS NULL',now(),c.org,id),auditStmt(c,'connection.disconnected',id)]);
 const p=provider(conn.provider);return p.capabilities.remoteRevocation?await p.disconnect():{remoteRevoked:false,notice:'Retrieval stopped locally. Remote revocation unsupported; use the provider or bank portal where applicable.'};
}
export async function processJobs(db:Database,org:string,adapterOverride?:Provider){
 if(!await one(db,'SELECT 1 FROM organizations WHERE id=? AND demo=1',org))return {processed:false};
 const t=now(),lease=uid();
 const candidate=await one(db,"SELECT j.* FROM sync_runs j JOIN connections c ON c.id=j.connection_id AND c.org_id=j.org_id WHERE j.org_id=? AND c.status='connected' AND ((j.state IN ('queued','retry') AND j.due_at<=?) OR (j.state='running' AND j.lease_until<?)) ORDER BY j.created_at LIMIT 1",org,t,t);
 if(!candidate)return {processed:false};
 const claimed=await stmt(db,"UPDATE sync_runs SET state='running',lease_token=?,lease_until=?,attempts=attempts+1 WHERE org_id=? AND id=? AND ((state IN ('queued','retry') AND due_at<=?) OR (state='running' AND lease_until<?)) RETURNING *",lease,new Date(Date.now()+60000).toISOString(),org,candidate.id,t,t).first<Row>();
 if(!claimed)return {processed:false};
 const conn=await one(db,'SELECT * FROM connections WHERE org_id=? AND id=?',org,claimed.connection_id);
 const runId=claimed.id;
 const guard="EXISTS(SELECT 1 FROM sync_runs j JOIN connections c ON c.id=j.connection_id AND c.org_id=j.org_id WHERE j.id=? AND j.org_id=? AND j.lease_token=? AND j.state='running' AND j.lease_until>? AND c.status='connected' AND EXISTS(SELECT 1 FROM authorizations au WHERE au.org_id=c.org_id AND au.connection_id=c.id AND au.revoked_at IS NULL AND au.expires_at>?))";
 const g=()=>[runId,org,lease,now(),now()];
 try{
  await stmt(db,'UPDATE connections SET last_attempt=? WHERE org_id=? AND id=?',now(),org,conn!.id).run();
  if(!await one(db,'SELECT 1 FROM authorizations WHERE org_id=? AND connection_id=? AND revoked_at IS NULL AND expires_at>?',org,conn!.id,now())){
   await db.batch([stmt(db,"UPDATE connections SET status='expired',exception='AUTHORIZATION_EXPIRED' WHERE org_id=? AND id=? AND status='connected'",org,conn!.id),stmt(db,"UPDATE sync_runs SET state='failed',error_code='AUTHORIZATION_EXPIRED',finished_at=? WHERE org_id=? AND id=? AND lease_token=?",now(),org,runId,lease)]);return {processed:true,state:'failed'};
  }
  if(claimed.attempts>4)throw new Error('RETRIES_EXHAUSTED');

  const p=adapterOverride??provider(conn!.provider);
  const accts=await many(db,'SELECT * FROM accounts WHERE org_id=? AND connection_id=? AND supported=1',org,conn!.id);
  if(accts.length!==1)throw new Error('PILOT_ACCOUNT_COUNT');
  const a=accts[0];let checkpoint=claimed.checkpoint;let pages=0;
  while(pages++<20){
   if(!await one(db,'SELECT 1 WHERE '+guard,...g()))return {processed:true,state:'stopped'};
   const page=await p.transactions({accountId:a.provider_id,checkpoint,scenario:conn!.scenario,attempt:claimed.attempts});
   if(page.next===checkpoint&&page.next!==null)throw new Error('CHECKPOINT_NOT_ADVANCING');
   const queries=[];
   for(const raw of page.records){
    const m=money(raw.amount,raw.currency);if(raw.currency!==a.currency)throw new Error('ACCOUNT_CURRENCY_MISMATCH');
    if(!['debit','credit'].includes(raw.direction)||!['pending','booked','reversed'].includes(raw.status)||!raw.id)throw new Error('INVALID_PROVIDER_RECORD');
    const sourceId=await hash(org+':'+a.id+':'+raw.id),content=JSON.stringify(raw),digest=await hash(content),revId=await hash(sourceId+':'+digest),txId=sourceId;
    queries.push(stmt(db,'INSERT OR IGNORE INTO source_records(id,org_id,account_id,provider_id) SELECT ?,?,?,? WHERE '+guard,sourceId,org,a.id,raw.id,...g()));
    queries.push(stmt(db,'INSERT OR IGNORE INTO source_revisions(id,org_id,source_id,hash,payload,source_at,retrieved_at) SELECT ?,?,?,?,?,?,? WHERE '+guard,revId,org,sourceId,digest,content,raw.sourceAt??null,now(),...g()));
    const newer="(transactions.source_at IS NULL OR (? IS NOT NULL AND ? > transactions.source_at))";
    queries.push(stmt(db,"UPDATE allocations SET status='needs_review' WHERE org_id=? AND transaction_id=? AND status='confirmed' AND revision_id<>? AND EXISTS(SELECT 1 FROM transactions WHERE id=? AND org_id=? AND "+newer+") AND "+guard,org,txId,revId,txId,org,raw.sourceAt??null,raw.sourceAt??null,...g()));
    queries.push(stmt(db,`INSERT INTO transactions(id,org_id,account_id,source_id,revision_id,provider_id,amount,units,currency,direction,status,narration,counterparty,booked_at,source_at,retrieved_at,reversal_of) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(org_id,account_id,provider_id) DO UPDATE SET revision_id=excluded.revision_id,amount=excluded.amount,units=excluded.units,direction=excluded.direction,status=excluded.status,narration=excluded.narration,counterparty=excluded.counterparty,booked_at=excluded.booked_at,source_at=excluded.source_at,retrieved_at=excluded.retrieved_at,reversal_of=excluded.reversal_of WHERE transactions.revision_id<>excluded.revision_id AND (transactions.source_at IS NULL OR (excluded.source_at IS NOT NULL AND excluded.source_at>transactions.source_at))`,txId,org,a.id,sourceId,revId,raw.id,m.amount,m.units,m.currency,raw.direction,raw.status,raw.narration,raw.counterparty??null,raw.bookedAt??null,raw.sourceAt??null,now(),raw.reversalOf??null,...g()));
   }
   queries.push(stmt(db,'UPDATE sync_runs SET checkpoint=?,pages=pages+1,lease_until=? WHERE '+guard+' AND id=?',page.next,new Date(Date.now()+60000).toISOString(),...g(),runId));
   if(page.next===null){
    if(p.capabilities.balances)for(const b of await p.balances()){
     money(b.amount,b.currency);queries.push(stmt(db,'INSERT INTO balance_snapshots(id,org_id,account_id,amount,currency,type,source_at,retrieved_at) SELECT ?,?,?,?,?,?,?,? WHERE '+guard,uid(),org,a.id,b.amount,b.currency,b.type,b.sourceAt,now(),...g()));
    }
    queries.push(stmt(db,'UPDATE connections SET last_success=?,data_through=?,checkpoint=NULL,exception=NULL WHERE id=? AND org_id=? AND '+guard,now(),page.dataThrough,conn!.id,org,...g()));
    queries.push(stmt(db,"INSERT INTO audit_events(id,org_id,actor,action,resource_id,created_at) SELECT ?,?,'worker','sync.succeeded',?,? WHERE "+guard,uid(),org,runId,now(),...g()));
    queries.push(stmt(db,"UPDATE sync_runs SET state='succeeded',finished_at=?,lease_token=NULL WHERE id=? AND org_id=? AND "+guard,now(),runId,org,...g()));
   }
   await db.batch(queries);
   if(page.next===null){const saved=await one(db,'SELECT state FROM sync_runs WHERE org_id=? AND id=?',org,runId);return {processed:true,state:saved?.state==='succeeded'?'succeeded':'stopped'};}
   checkpoint=page.next;
  }
  throw new Error('PAGE_LIMIT');
 }catch(e){
  const retry=e instanceof TransientError&&claimed.attempts<4;const code=retry?'PROVIDER_TEMPORARY':'SYNC_REVIEW_REQUIRED';
  await db.batch([stmt(db,'UPDATE sync_runs SET state=?,error_code=?,due_at=?,finished_at=?,lease_token=NULL WHERE id=? AND org_id=? AND lease_token=? AND state=\'running\'',retry?'retry':'failed',code,new Date(Date.now()+Math.max(e instanceof TransientError?e.retryAfter:0,2**claimed.attempts)*1000).toISOString(),retry?null:now(),runId,org,lease),stmt(db,"UPDATE connections SET exception=? WHERE id=? AND org_id=? AND status='connected'",code,conn!.id,org)]);
  return {processed:true,state:retry?'retry':'failed',error:code};
 }
}

