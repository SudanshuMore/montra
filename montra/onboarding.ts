import { type Database, stmt, one, many } from './db.ts';
import { type Identity } from './access.ts';
import { now, uid, fail } from './money.ts';
export async function onboard(db:Database,user:Identity,name:string){
 if(typeof name!=='string'||name.trim().length<2||name.length>80)fail(400,'Organization name must have 2–80 characters');
 const existing=await many(db,'SELECT * FROM memberships WHERE user_id=?',user.id);if(existing.length)fail(409,'Your demo organizations already exist');
 const t=now(),q=[stmt(db,'INSERT INTO users(id,email) VALUES(?,?)',user.id,user.email)];
 for(const label of [name.trim(),'Cedar Works']){
  const org=uid(),entity=uid(),conn=uid(),acc=uid();
  q.push(stmt(db,'INSERT INTO organizations(id,name,created_at) VALUES(?,?,?)',org,label,t),
  stmt(db,"INSERT INTO memberships(org_id,user_id,role,all_accounts) VALUES(?,?,'administrator',1)",org,user.id),
  stmt(db,"INSERT INTO entities(id,org_id,name,country) VALUES(?,?,?,'Synthetic')",entity,org,label),
  stmt(db,"INSERT INTO connections(id,org_id,entity_id,provider,status) VALUES(?,?,?,'mock','connected')",conn,org,entity),
  stmt(db,"INSERT INTO accounts(id,org_id,entity_id,connection_id,provider_id,name,mask,bank,currency,type) VALUES(?,?,?,?,'operating','Operating account','4821','Demo Bank','USD','Corporate current')",acc,org,entity,conn),
  stmt(db,"INSERT INTO authorizations(id,org_id,connection_id,authorized_by,method,scopes,created_at,expires_at) VALUES(?,?,?,?,'Explicit synthetic authorization','accounts:read transactions:read balances:read',?,?)",uid(),org,conn,user.id,t,new Date(Date.now()+30*86400000).toISOString()),
  stmt(db,"INSERT INTO sync_runs(id,org_id,connection_id,state,due_at,created_at) VALUES(?,?,?,'queued',?,?)",uid(),org,conn,t,t),
  stmt(db,"INSERT INTO audit_events(id,org_id,actor,action,resource_id,created_at) VALUES(?,?,?,'organization.created',?,?)",uid(),org,user.id,org,t));
 }
 await db.batch(q);return {created:true};
}

