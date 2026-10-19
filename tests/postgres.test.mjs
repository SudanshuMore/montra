import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {postgresSchema} from '../scripts/postgres-schema.mjs';
import {postgresDatabase,postgresSQL} from '../montra/postgres-db.ts';
import {onboard} from '../montra/onboarding.ts';
import {handle} from '../montra/service.ts';
import {processJobs} from '../montra/sync.ts';
import {testBucket} from './sqlite.mjs';
import {one,stmt} from '../montra/db.ts';
import {handleAuth,sessionIdentity} from '../montra/auth.ts';

test('Postgres parameters remain bound, quoted question marks are preserved and null type is explicit',()=>{
 assert.deepEqual(postgresSQL("SELECT '?' literal,\"?\" quoted,? value WHERE ? IS NOT NULL"),{sql:'SELECT \'?\' literal,"?" quoted,$1 value WHERE CAST($2 AS TEXT) IS NOT NULL',parameters:2});
 assert.equal(postgresSQL("INSERT OR IGNORE INTO users(id,email) VALUES(?,?)").sql,'INSERT INTO users(id,email) VALUES($1,$2) ON CONFLICT DO NOTHING');
});

test('real PostgreSQL engine: migration, onboarding, isolation, import deduplication and atomic rollback',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec('CREATE SCHEMA montra; SET search_path=montra,pg_catalog;');
  const plan=postgresSchema(['drizzle/0000_faulty_ikaris.sql','drizzle/0001_email_sessions.sql'].map(f=>fs.readFileSync(f,'utf8')));
  for(const statement of plan.statements)await pg.exec(statement);
  function executor(client){return {query:(query,values)=>client.query(query,values),transaction:work=>client.transaction(tx=>work(executor(tx)))}}
  const db=postgresDatabase(executor(pg));
  const first={id:'first',email:'first@example.test'},second={id:'second',email:'second@example.test'};
  await onboard(db,first,'First Company');await onboard(db,second,'Second Company');
  const org=await one(db,"SELECT org_id FROM memberships WHERE user_id='first' LIMIT 1");
  const runtime={db,bucket:testBucket()};
  const state=await handle(new Request('https://montra.test/api/state?org='+org.org_id),first,runtime);
  assert.equal(state.status,200,await state.clone().text());
  assert.equal((await handle(new Request('https://montra.test/api/state?org='+org.org_id),second,runtime)).status,404);
  const sync=await processJobs(db,org.org_id);assert.equal(sync.state,'succeeded');
  const count=await one(db,'SELECT COUNT(*) n FROM transactions WHERE org_id=?',org.org_id);assert.ok(Number(count.n)>0);
  const connection=await one(db,'SELECT id FROM connections WHERE org_id=?',org.org_id);
  await stmt(db,"INSERT INTO sync_runs(id,org_id,connection_id,state,due_at,created_at) VALUES('again',?,?,'queued','2000','2000')",org.org_id,connection.id).run();
  assert.equal((await processJobs(db,org.org_id)).state,'succeeded');
  assert.equal(Number((await one(db,'SELECT COUNT(*) n FROM transactions WHERE org_id=?',org.org_id)).n),Number(count.n));
  await assert.rejects(db.batch([stmt(db,"INSERT INTO users(id,email) VALUES('rollback','rollback@example.test')"),stmt(db,"INSERT INTO users(id,email) VALUES('first','duplicate@example.test')")]));
  assert.equal(await one(db,"SELECT id FROM users WHERE id='rollback'"),null);
  const config={mode:'email',origin:'https://montra.test',supabaseUrl:'https://example.supabase.co',publishableKey:'synthetic',localDemo:false};
  const provider={async send(){},async verify(){return {id:'email-user',email:'verified@example.test',expiresAt:Date.now()+3600000}}};
  const request=(path,body,cookie='')=>new Request(config.origin+path,{method:body?'POST':'GET',headers:{Origin:config.origin,'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
  const attempt=await handleAuth(request('/auth/request',{email:'verified@example.test'}),db,config,provider);assert.equal(attempt.status,200);
  const challenge=attempt.headers.getSetCookie()[0].split(';')[0];
  const confirmed=await handleAuth(request('/auth/confirm',{token_hash:'synthetic_pg_email_token_123456789'},challenge),db,config,provider);assert.equal(confirmed.status,303,await confirmed.clone().text());
  const cookie=confirmed.headers.getSetCookie().find(s=>s.startsWith('__Host-montra_session=')).split(';')[0];
  assert.equal((await sessionIdentity(request('/api/session',null,cookie),db,config)).email,'verified@example.test');
  await handleAuth(request('/auth/signout',{},cookie),db,config,provider);assert.equal(await sessionIdentity(request('/api/session',null,cookie),db,config),null);
  const protections=await pg.query("SELECT COUNT(*)::int n FROM pg_tables WHERE schemaname='montra' AND rowsecurity");assert.equal(protections.rows[0].n,plan.tables.length);
  await pg.exec('CREATE ROLE anon; SET ROLE anon;');
  await assert.rejects(pg.query('SELECT * FROM montra.users'));
 }finally{await pg.close()}
});
