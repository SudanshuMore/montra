import test from 'node:test';
import assert from 'node:assert/strict';
import {emailProvider} from '../montra/supabase-auth.ts';
const config={mode:'email',origin:'https://montra.test',supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_synthetic_test',localDemo:false};
const user={id:'synthetic-user',aud:'authenticated',email:'first@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};

test('official auth SDK sends email and verifies identity through provider endpoints with no real network',async()=>{
 const requests=[];const transport=async(url,init)=>{
  const u=new URL(String(url));requests.push({path:u.pathname,method:init.method,body:init.body?JSON.parse(String(init.body)):null});
  if(u.pathname==='/auth/v1/otp')return Response.json({});
  if(u.pathname==='/auth/v1/verify')return Response.json({access_token:'synthetic-access-token',refresh_token:'synthetic-refresh-token',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user});
  if(u.pathname==='/auth/v1/user')return Response.json(user);
  throw new Error('Unexpected SDK network request');
 };
 const adapter=emailProvider(config,transport);await adapter.send(user.email,config.origin+'/auth/confirm');
 const verified=await adapter.verify('synthetic_token_hash_0123456789');assert.equal(verified.id,user.id);assert.equal(verified.email,user.email);assert.ok(verified.expiresAt>Date.now());assert.deepEqual(Object.keys(verified).sort(),['email','expiresAt','id']);
 assert.equal(requests[0].path,'/auth/v1/otp');assert.equal(requests[0].body.email,user.email);assert.equal(requests[0].body.create_user,true);
 assert.ok(requests.some(r=>r.path==='/auth/v1/verify'&&r.body.token_hash==='synthetic_token_hash_0123456789'&&r.body.type==='email'));
 assert.ok(requests.some(r=>r.path==='/auth/v1/user'&&r.method==='GET'));
});
test('auth adapter refuses privileged keys and invalid endpoints and redacts provider failures',async()=>{
 assert.equal(emailProvider({...config,mode:'disabled'}),null);
 for(const change of [{supabaseUrl:'http://example.supabase.co'},{supabaseUrl:'https://attacker.test'},{publishableKey:'sb_secret_synthetic'}])assert.throws(()=>emailProvider({...config,...change}));
 const privileged='a.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.b';assert.throws(()=>emailProvider({...config,publishableKey:privileged}));
 const adapter=emailProvider(config,async()=>Response.json({msg:'PRIVATE_SENTINEL',code:'otp_expired'},{status:400}));
 await assert.rejects(()=>adapter.verify('expired'),e=>!e.message.includes('PRIVATE_SENTINEL'));
});
