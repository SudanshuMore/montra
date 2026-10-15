import { type Context, account, auditStmt } from './access.ts';
import { many, stmt, type Row } from './db.ts';
import { fail, money, validDate, uid, now, hash } from './money.ts';
export function compare(imported:Row[],statement:Row[]){
 const grouped=new Map<string,Row[]>();for(const r of statement){const list=grouped.get(r.providerId)??[];list.push(r);grouped.set(r.providerId,list)}
 const duplicates=[...grouped.entries()].filter(([,v])=>v.length>1).map(([id])=>id);
 const db=new Map(imported.map(t=>[t.provider_id,t]));const missing:string[]=[],changed:string[]=[];
 for(const [id,rows] of grouped){const s=rows[0],t=db.get(id);if(!t){missing.push(id);continue}if(t.amount!==s.amount||t.currency!==s.currency||t.direction!==s.direction||t.booked_at!==s.bookedAt||t.status!==s.status||t.narration!==s.narration)changed.push(id);}
 const unexplained=imported.filter(t=>!grouped.has(t.provider_id)).map(t=>t.provider_id);
 return {missing,duplicates,changed,unexplained,importedCount:imported.length,statementCount:statement.length,complete:![missing,duplicates,changed,unexplained].some(x=>x.length),note:'Comparison is against the supplied statement only. Completeness requires an authorized statement and finance review.'};
}
export async function reconcile(c:Context,p:Row){
 const a=await account(c,p.accountId),start=validDate(p.start),end=validDate(p.end);
 if(start>end||end>=now().slice(0,10))fail(400,'Choose a closed period ending before today');
 if(p.authorized!==true)fail(400,'Confirm authorization to use this statement');
 if(!Array.isArray(p.rows)||p.rows.length>5000)fail(400,'Statement must contain at most 5000 rows');
 const rows=p.rows.map((r:Row)=>{if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.providerId!=='string'||!r.providerId||!['credit','debit'].includes(r.direction)||!['booked','reversed'].includes(r.status)||typeof r.narration!=='string')fail(400,'Invalid statement row');const m=money(r.amount,r.currency),date=validDate(r.bookedAt);if(r.currency!==a.currency||date<start||date>end)fail(400,'Statement row outside account currency or period');return {...r,amount:m.amount};});
 const tx=await many(c.db,"SELECT * FROM transactions WHERE org_id=? AND account_id=? AND status IN ('booked','reversed') AND booked_at>=? AND booked_at<=?",c.org,a.id,start,end);
 const report=compare(tx,rows),id=uid();await c.db.batch([stmt(c.db,'INSERT INTO reconciliations(id,org_id,account_id,start_date,end_date,statement_hash,report,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)',id,c.org,a.id,start,end,await hash(JSON.stringify(rows)),JSON.stringify(report),c.user.id,now()),auditStmt(c,'statement.reconciled',id)]);
 return {id,...report};
}

