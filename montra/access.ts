import { type Database, type Row, one, many, stmt } from './db.ts';
import { fail, now, uid } from './money.ts';
export type Identity={id:string;email:string};
export type Context={db:Database;user:Identity;org:string;member:Row};
export async function context(db:Database,user:Identity,org:string):Promise<Context>{
 const member=await one(db,'SELECT * FROM memberships WHERE org_id=? AND user_id=?',org,user.id);
 if(!member)fail(404,'Organization not found');
 if(!await one(db,'SELECT 1 FROM organizations WHERE id=? AND demo=1',org))fail(503,'Live data access is disabled');
 return {db,user,org,member};
}
export function role(c:Context,...roles:string[]){if(!roles.includes(c.member.role))fail(403,'Your role does not permit this action')}
export async function account(c:Context,id:string){
 const row=await one(c.db,'SELECT * FROM accounts WHERE org_id=? AND id=?',c.org,id);
 if(!row)fail(404,'Account not found');
 if(!c.member.all_accounts&&!await one(c.db,'SELECT 1 FROM account_grants WHERE org_id=? AND user_id=? AND account_id=?',c.org,c.user.id,id))fail(404,'Account not found');
 return row;
}
export async function accounts(c:Context){return many(c.db,'SELECT a.* FROM accounts a WHERE a.org_id=? AND (?=1 OR EXISTS(SELECT 1 FROM account_grants g WHERE g.org_id=a.org_id AND g.account_id=a.id AND g.user_id=?)) ORDER BY a.name',c.org,c.member.all_accounts,c.user.id);}
const scopedTables=new Set(['transactions','documents','balance_snapshots','reconciliations']);
export async function resource(c:Context,table:string,id:string){if(!scopedTables.has(table))fail(400,'Invalid resource');const row=await one(c.db,'SELECT * FROM '+table+' WHERE org_id=? AND id=?',c.org,id);if(!row)fail(404,'Record not found');await account(c,row.account_id);return row;}
export async function connection(c:Context,id:string,manage=false){if(manage)role(c,'administrator');const row=await one(c.db,'SELECT * FROM connections WHERE org_id=? AND id=?',c.org,id);if(!row)fail(404,'Connection not found');const permitted=(await accounts(c)).filter(a=>a.connection_id===id);if(!permitted.length)fail(404,'Connection not found');if(manage){const total=await one(c.db,'SELECT count(*) n FROM accounts WHERE org_id=? AND connection_id=?',c.org,id);if(total!.n!==permitted.length)fail(403,'All connection accounts must be permitted');}return row;}
export const auditStmt=(c:Context,action:string,resourceId:string|null=null)=>stmt(c.db,'INSERT INTO audit_events(id,org_id,actor,action,resource_id,created_at) VALUES(?,?,?,?,?,?)',uid(),c.org,c.user.id,action,resourceId,now());
export async function audit(c:Context,action:string,id:string|null=null){await auditStmt(c,action,id).run();}

