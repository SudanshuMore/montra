import test from 'node:test';
import assert from 'node:assert/strict';
import {testDB,testBucket} from './sqlite.mjs';
import {handleAuth,sessionIdentity,resolveIdentity,readAuthConfig} from '../montra/auth.ts';
import {handle} from '../montra/service.ts';
import {hash} from '../montra/money.ts';

const config={mode:'email',origin:'https://montra.test',supabaseUrl:'https://example.supabase.co',publishableKey:'synthetic-public-key',localDemo:false};
function setup(){
 const db=testDB(),sent=[],used=new Set();
 const provider={async send(email,redirect){sent.push({email,redirect})},async verify(token){if(used.has(token)||token.startsWith('expired'))throw new Error('synthetic provider error with private data');used.add(token);return {id:token.startsWith('second')?'second':'first',email:token.startsWith('second')?'second@example.test':'first@example.test',expiresAt:Date.now()+3600000}}};
 return {db,provider,sent};
}
function req(path,body,cookie='',options={}){return new Request(config.origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:config.origin,...(body===undefined?{}:{'Content-Type':'application/json'}),Cookie:cookie,...options},body:body===undefined?undefined:JSON.stringify(body)})}
function challenge(r){return r.headers.getSetCookie().find(c=>c.startsWith('__Host-montra_challenge=')).split(';')[0]}
function session(r){return r.headers.getSetCookie().find(c=>c.startsWith('__Host-montra_session=')).split(';')[0]}
async function start(s,email='first@example.test'){const r=await handleAuth(req('/auth/request',{email}),s.db,config,s.provider);assert.equal(r.status,200);return challenge(r)}
async function login(s,second=false){const c=await start(s,second?'second@example.test':'first@example.test');const r=await handleAuth(req('/auth/confirm',{token_hash:(second?'second':'first')+'_token_'+crypto.randomUUID().replaceAll('-','')},c),s.db,config,s.provider);assert.equal(r.status,303,await r.clone().text());return session(r)}

test('email login requires explicit confirmation; hash-only bounded server session and no provider tokens',async()=>{
 const s=setup(),c=await start(s),token='first_token_012345678901234567890';
 const get=await handleAuth(req('/auth/confirm?token_hash='+token,undefined,c),s.db,config,s.provider);
 assert.equal(get.status,200);assert.match(get.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(s.db.sqlite.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);
 const r=await handleAuth(req('/auth/confirm',{token_hash:token},c),s.db,config,s.provider);
 assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/');const cookie=session(r);
 assert.match(r.headers.getSetCookie().join(';'),/HttpOnly/);assert.match(r.headers.getSetCookie().join(';'),/Secure/);assert.match(r.headers.getSetCookie().join(';'),/SameSite=Lax/);
 const stored=s.db.sqlite.prepare('SELECT * FROM auth_sessions').get();assert.equal(stored.token_hash,await hash(cookie.split('=')[1]));assert.ok(!JSON.stringify(stored).includes(token));
 const identity=await sessionIdentity(req('/api/session',undefined,cookie),s.db,config);assert.equal(identity.email,'first@example.test');
 assert.equal((await handleAuth(req('/auth/confirm',{token_hash:token},c),s.db,config,s.provider)).status,400);
});
test('expired provider links, expired browser challenges, missing challenge and email mismatch fail closed',async()=>{
 const s=setup(),c=await start(s);
 const missing=await handleAuth(req('/auth/confirm',{token_hash:'first_token_012345678901234567890'}),s.db,config,s.provider);assert.equal(missing.status,400);
 const invalid=await handleAuth(req('/auth/confirm',{token_hash:'expired_token_012345678901234567890'},c),s.db,config,s.provider);assert.equal(invalid.status,400);assert.ok(!(await invalid.text()).includes('private data'));
 assert.equal((await handleAuth(req('/auth/confirm',{token_hash:'second_token_012345678901234567890'},c),s.db,config,s.provider)).status,400);
 s.db.sqlite.prepare("UPDATE auth_attempts SET expires_at='2000-01-01'").run();assert.equal((await handleAuth(req('/auth/confirm',{token_hash:'first_token_012345678901234567890'},c),s.db,config,s.provider)).status,400);
 assert.equal(s.db.sqlite.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);
});
test('signout revokes copied cookies; expiry, tampering and duplicate cookies do not authenticate',async()=>{
 const s=setup(),cookie=await login(s);assert.ok(await sessionIdentity(req('/api/session',undefined,cookie),s.db,config));
 assert.equal(await sessionIdentity(req('/api/session',undefined,cookie),s.db,{...config,supabaseUrl:'https://different-project.supabase.co'}),null);
 assert.equal(await sessionIdentity(req('/api/session',undefined,cookie+'; '+cookie),s.db,config),null);
 assert.equal(await sessionIdentity(req('/api/session',undefined,cookie.replace(/.$/,'z')),s.db,config),null);
 const out=await handleAuth(req('/auth/signout',{},cookie),s.db,config,s.provider);assert.equal(out.status,200);assert.match(out.headers.getSetCookie().join(';'),/Max-Age=0/);assert.equal(await sessionIdentity(req('/api/session',undefined,cookie),s.db,config),null);
 const cookie2=await login(s);s.db.sqlite.prepare("UPDATE auth_sessions SET expires_at='2000-01-01'").run();assert.equal(await sessionIdentity(req('/api/session',undefined,cookie2),s.db,config),null);
});
test('CSRF, invalid configuration, untrusted platform headers and callback injection are rejected',async()=>{
 const s=setup();
 assert.equal((await handleAuth(req('/auth/request',{email:'first@example.test'},'',{Origin:'https://evil.test'}),s.db,config,s.provider)).status,403);
 assert.equal((await handleAuth(req('/auth/request',{email:'first@example.test'}),s.db,{...config,publishableKey:''},null)).status,503);
 assert.equal((await handleAuth(req('/auth/request',{email:'first@example.test'}),s.db,{...config,origin:'https://evil.test'},s.provider)).status,403);
 let trustedCalls=0;const forged=()=>{trustedCalls++;return Promise.resolve({id:'attacker',email:'attacker@example.test'})};
 assert.equal(await resolveIdentity(req('/api/session'),s.db,config,forged),null);assert.equal(trustedCalls,0);
 assert.equal(readAuthConfig({MONTRA_AUTH_MODE:'platform'},false).mode,'disabled');assert.equal(readAuthConfig({},false).mode,'disabled');
 const c=await start(s);const html=await handleAuth(req('/auth/confirm?token_hash=%22%3E%3Cscript%3E',undefined,c),s.db,config,s.provider);assert.equal(html.status,400);
 await start(s,'other@example.test');assert.ok(s.sent.every(x=>x.redirect===config.origin+'/auth/confirm'));
});
test('rate limits are persisted, request responses do not disclose account existence, and body is bounded',async()=>{
 const s=setup();for(let i=0;i<3;i++)assert.equal((await handleAuth(req('/auth/request',{email:'first@example.test'}),s.db,config,s.provider)).status,200);
 assert.equal((await handleAuth(req('/auth/request',{email:'first@example.test'}),s.db,config,s.provider)).status,429);
 const unavailable={...s.provider,async send(){throw new Error('unknown user / secret')}};
 const fail=await handleAuth(req('/auth/request',{email:'new@example.test'}),s.db,config,unavailable);assert.equal(fail.status,200);assert.match(await fail.text(),/If this address/);
 assert.equal((await handleAuth(req('/auth/request',{email:'not an email'}),s.db,config,s.provider)).status,400);
 assert.equal((await handleAuth(req('/auth/request',{email:'x'.repeat(2500)}),s.db,config,s.provider)).status,413);
});
test('two email sessions onboard independently and cannot read or mutate the other customer records',async()=>{
 const s=setup(),runtime={db:s.db,bucket:testBucket()},first=await login(s),second=await login(s,true);
 async function api(cookie,path,body){const request=req('/api/'+path,body,cookie,body===undefined?{}:{'X-Montra-Request':'1'});const identity=await resolveIdentity(request,s.db,config,()=>{throw new Error('Platform fallback forbidden')});return handle(request,identity,runtime)}
 assert.equal((await api(first,'onboard',{name:'First Company'})).status,201);assert.equal((await api(second,'onboard',{name:'Second Company'})).status,201);
 const firstOrgs=(await (await api(first,'session')).json()).organizations,secondOrgs=(await (await api(second,'session')).json()).organizations;
 assert.equal(firstOrgs.length,2);assert.equal(secondOrgs.length,2);assert.ok(firstOrgs.every(a=>!secondOrgs.some(b=>a.id===b.id)));
 const id=firstOrgs[0].id;assert.equal((await api(first,'state?org='+id)).status,200);assert.equal((await api(second,'state?org='+id)).status,404);assert.equal((await api(second,'retention?org='+id,{days:30})).status,404);
 assert.equal((await api(first,'onboard',{name:'Duplicate'})).status,409);
});
test('concurrent confirmation creates at most one session and sign-in rotates the previous session',async()=>{
 const s=setup(),c=await start(s),token='first_token_concurrent0123456789';
 const out=await Promise.all([handleAuth(req('/auth/confirm',{token_hash:token},c),s.db,config,s.provider),handleAuth(req('/auth/confirm',{token_hash:token},c),s.db,config,s.provider)]);
 assert.equal(out.filter(r=>r.status===303).length,1);const old=session(out.find(r=>r.status===303));
 const nextChallenge=await start(s);const r=await handleAuth(req('/auth/confirm',{token_hash:'first_token_rotation0123456789'},nextChallenge+'; '+old),s.db,config,s.provider);assert.equal(r.status,303);assert.equal(await sessionIdentity(req('/api/session',undefined,old),s.db,config),null);assert.ok(await sessionIdentity(req('/api/session',undefined,session(r)),s.db,config));
});
