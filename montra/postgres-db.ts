import type { Database, Statement, Row } from './db.ts';

// Only translate our static, parameterized application SQL. Values remain bound.
export function postgresSQL(input:string){
 let i=0,quote='',out='';
 for(let at=0;at<input.length;at++){
  const c=input[at];
  if(quote){out+=c;if(c===quote){if(input[at+1]===quote){out+=input[++at]}else quote=''}continue;}
  if(c==="'"||c==='"'){quote=c;out+=c;continue;}
  if(c==='?'){out+='$'+(++i);continue;}
  out+=c;
 }
 out=out.replace(/(\$\d+) IS NOT NULL/g,'CAST($1 AS TEXT) IS NOT NULL');
 if(/^INSERT OR IGNORE /i.test(out))out=out.replace(/^INSERT OR IGNORE /i,'INSERT ')+ ' ON CONFLICT DO NOTHING';
 return {sql:out,parameters:i};
}
export type QueryResult={rows:Row[]};
export interface PgExecutor {query(sql:string,values:unknown[]):Promise<QueryResult>;transaction<T>(work:(tx:PgExecutor)=>Promise<T>):Promise<T>}
const LOCK='SELECT pg_advisory_xact_lock(708219641)';
export function postgresDatabase(executor:PgExecutor):Database {
 class Bound implements Statement {
  readonly sql:string;readonly values:unknown[];
  constructor(sql:string,values:unknown[]=[]){this.sql=sql;this.values=values;}
  bind(...values:unknown[]){return new Bound(this.sql,values)}
  async execute(tx:PgExecutor){const q=postgresSQL(this.sql);if(q.parameters!==this.values.length)throw new Error('SQL parameter mismatch');return tx.query(q.sql,this.values);}
  async result(){
   if(/^\s*SELECT\b/i.test(this.sql))return this.execute(executor);
   return executor.transaction(async tx=>{await tx.query(LOCK,[]);return this.execute(tx)});
  }
  async first<T=Row>():Promise<T|null>{return ((await this.result()).rows[0] as T)??null;}
  async all<T=Row>(){return {results:(await this.result()).rows as T[]}}
  async run(){return this.result()}
 }
 return {prepare:sql=>new Bound(sql),async batch(statements){
  if(statements.some(s=>!(s instanceof Bound)))throw new Error('Statement belongs to a different database adapter');
  // A coarse transaction lock preserves the pilot's SQLite write-serialization
  // guarantees, including allocation gates and in-flight disconnect fencing.
  return executor.transaction(async tx=>{await tx.query(LOCK,[]);const results=[];for(const s of statements as Bound[])results.push({results:(await s.execute(tx)).rows});return results;});
 }};
}
