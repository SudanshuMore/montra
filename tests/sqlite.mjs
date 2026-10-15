import { DatabaseSync } from 'node:sqlite';import fs from 'node:fs';
export function testDB(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON;');for(const f of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
 const wrap=(sql,values=[])=>({bind(...v){return wrap(sql,v)},async first(){return sqlite.prepare(sql).get(...values)??null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){return sqlite.prepare(sql).run(...values)},_sql:sql,_values:values});
 return {sqlite,prepare:wrap,async batch(q){sqlite.exec('BEGIN IMMEDIATE');try{const out=q.map(s=>{const st=sqlite.prepare(s._sql);return st.columns().length?{results:st.all(...s._values)}:st.run(...s._values)});sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
export function testBucket(){const objects=new Map();return {objects,async put(k,v){objects.set(k,v)},async get(k){return objects.has(k)?{body:objects.get(k)}:null},async delete(k){objects.delete(k)}}}

