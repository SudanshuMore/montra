import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { postgresDatabase, type PgExecutor } from './postgres-db.ts';
import type { Runtime } from './service.ts';
import { privateStore } from './supabase-storage.ts';

let current:Runtime|undefined;
export function runtimeValues():Record<string,unknown>{return {
 ...process.env,
 MONTRA_SUPABASE_URL:process.env.MONTRA_SUPABASE_URL??process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,
 MONTRA_SUPABASE_PUBLISHABLE_KEY:process.env.MONTRA_SUPABASE_PUBLISHABLE_KEY??process.env.SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};}
export function runtime():Runtime {
 if(current)return current;
 const url=process.env.POSTGRES_URL;
 const values=runtimeValues(),projectUrl=String(values.MONTRA_SUPABASE_URL??''),secret=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!projectUrl||!secret)throw new Error('Application storage unavailable');
 const host=new URL(projectUrl);if(host.protocol!=='https:'||!host.hostname.endsWith('.supabase.co'))throw new Error('Invalid storage origin');
 // Transaction pooler: no prepared statements, a small per-instance pool and TLS.
 const client=postgres(url,{prepare:false,max:2,idle_timeout:20,connect_timeout:10,ssl:{rejectUnauthorized:true},connection:{search_path:'montra,pg_catalog'},onnotice:()=>{},types:{safeInt:{to:20,from:[20],serialize:String,parse:(value:string)=>{const n=Number(value);if(!Number.isSafeInteger(n))throw new Error('Integer exceeds supported precision');return n}}}});
 function executor(sql:typeof client|postgres.TransactionSql):PgExecutor{return {
  async query(query,values){return {rows:Array.from(await sql.unsafe(query,values as postgres.ParameterOrJSON<never>[]))}},
  async transaction(work){return client.begin(async tx=>work(executor(tx))) as Promise<any>}
 };}
 const storage=createClient(projectUrl,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 current={db:postgresDatabase(executor(client)),bucket:privateStore(storage,process.env.MONTRA_STORAGE_BUCKET??'montra-evidence')};
 return current;
}
