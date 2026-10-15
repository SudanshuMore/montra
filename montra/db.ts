export type Row = Record<string,any>;
export interface Statement { bind(...values:any[]):Statement; first<T=Row>():Promise<T|null>; all<T=Row>():Promise<{results:T[]}>; run():Promise<any> }
export interface Database { prepare(sql:string):Statement; batch(statements:Statement[]):Promise<any[]> }
export const stmt=(db:Database,sql:string,...args:any[])=>db.prepare(sql).bind(...args);
export const one=(db:Database,sql:string,...args:any[])=>stmt(db,sql,...args).first<Row>();
export const many=async(db:Database,sql:string,...args:any[])=>(await stmt(db,sql,...args).all<Row>()).results;

