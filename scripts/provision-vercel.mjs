import fs from 'node:fs';
import postgres from 'postgres';
import {createClient} from '@supabase/supabase-js';
import {postgresSchema} from './postgres-schema.mjs';

// Runs explicitly during the first production build, using Vercel-injected
// credentials. Creates a new application schema; never imports the local DB.
const url=process.env.POSTGRES_URL;
const project=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!project||!secret)throw new Error('Provisioning requires the connected Supabase environment');
const plan=postgresSchema(['drizzle/0000_faulty_ikaris.sql','drizzle/0001_email_sessions.sql'].map(f=>fs.readFileSync(f,'utf8')));
const sql=postgres(url,{ssl:{rejectUnauthorized:true},prepare:false,max:1,connect_timeout:10,onnotice:()=>{}});
let stage='database-connect';
try{
 await sql.begin(async tx=>{
  stage='database-schema';
  await tx`SELECT pg_advisory_xact_lock(708219641)`;
  await tx`CREATE SCHEMA IF NOT EXISTS montra`;
  await tx`REVOKE ALL ON SCHEMA montra FROM PUBLIC`;
  await tx`SET LOCAL search_path = montra,pg_catalog`;
  await tx`CREATE TABLE IF NOT EXISTS migration_versions (id text PRIMARY KEY, checksum text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
  const existing=await tx`SELECT checksum FROM migration_versions WHERE id='initial-supabase-v1'`;
  if(existing.length){if(existing[0].checksum!==plan.checksum)throw new Error('Existing migration checksum differs; an explicit follow-up migration is required');return;}
  const rows=await tx`SELECT tablename FROM pg_tables WHERE schemaname='montra' AND tablename<>'migration_versions'`;
  if(rows.length)throw new Error('Untracked existing application tables; provisioning refused');
  stage='database-migration';
  for(const statement of plan.statements)await tx.unsafe(statement);
  await tx`ALTER TABLE migration_versions ENABLE ROW LEVEL SECURITY`;
  await tx`INSERT INTO migration_versions(id,checksum) VALUES('initial-supabase-v1',${plan.checksum})`;
 });
 stage='storage-inspect';
 const client=createClient(project,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const name=process.env.MONTRA_STORAGE_BUCKET??'montra-evidence';
 const {data:bucket,error}=await client.storage.getBucket(name);
 if(error){if(!['404','400'].includes(String(error.statusCode??error.status)))throw error;stage='storage-create';const result=await client.storage.createBucket(name,{public:false,fileSizeLimit:262144,allowedMimeTypes:['text/plain']});if(result.error)throw result.error;}
 else if(bucket.public)throw new Error('Evidence bucket must be private');
 console.log('Montra database schema and private evidence bucket verified.');
}catch(error){
 // Only expose a bounded machine code, never provider messages, SQL or URLs.
 const candidate=String(error?.code??error?.statusCode??error?.status??'unknown');
 const code=/^[A-Z0-9_]{1,48}$/i.test(candidate)?candidate:'unknown';
 console.error(`Montra provisioning failed at ${stage} (code: ${code}). No credentials or provider payloads were logged.`);
 process.exitCode=1;
}
finally{await sql.end({timeout:5})}
