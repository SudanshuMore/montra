import {createHash} from 'node:crypto';

export function postgresSchema(sources){
 const tables=[],indexes=[];
 for(const source of sources)for(let sql of source.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)){
  sql=sql.replaceAll('`','"').replace(/\binteger\b/gi,'bigint');
  if(/^CREATE TABLE /i.test(sql)){
   const name=sql.match(/^CREATE TABLE "?(\w+)"?/i)?.[1];if(!name)throw new Error('Unsupported table declaration');
   tables.push({name,sql,dependencies:[...sql.matchAll(/REFERENCES "?(\w+)"?/gi)].map(m=>m[1]).filter(n=>n!==name)});
  }else if(/^CREATE (?:UNIQUE )?INDEX /i.test(sql))indexes.push(sql);
  else throw new Error('Unsupported migration statement');
 }
 const ordered=[],done=new Set();while(ordered.length<tables.length){const ready=tables.filter(t=>!done.has(t.name)&&t.dependencies.every(d=>done.has(d)));if(!ready.length)throw new Error('Unresolved migration dependencies');for(const t of ready){ordered.push(t.sql);done.add(t.name)}}
 const statements=[...ordered,...indexes,...tables.map(t=>`ALTER TABLE "${t.name}" ENABLE ROW LEVEL SECURITY;`)];
 return {statements,tables:tables.map(t=>t.name),checksum:createHash('sha256').update(statements.join('\n')).digest('hex')};
}
