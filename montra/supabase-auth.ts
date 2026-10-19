import { createClient } from '@supabase/supabase-js';
import { type AuthConfig, type EmailIdentityProvider } from './auth.ts';

// Server only. Do not import this module from a client component.
export function emailProvider(config:AuthConfig,transport:typeof fetch=fetch):EmailIdentityProvider|null {
 if(config.mode!=='email'||!config.supabaseUrl||!config.publishableKey)return null;
 const url=new URL(config.supabaseUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||!url.hostname.endsWith('.supabase.co'))throw new Error('Use a verified hosted Supabase project URL');
 if(config.publishableKey.startsWith('sb_secret_'))throw new Error('A publishable key is required');
 if(config.publishableKey.split('.').length===3){
  let role:unknown;try{role=JSON.parse(atob(config.publishableKey.split('.')[1].replaceAll('-','+').replaceAll('_','/'))).role;}catch{throw new Error('Invalid publishable key');}
  if(role!=='anon')throw new Error('A publishable key is required');
 }
 const client=createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>transport(url,{...init,signal:AbortSignal.timeout(15000)})}});
 return {
  async send(email,redirect){const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});if(error)throw new Error('Email request failed');},
  async verify(tokenHash){
   const {data,error}=await client.auth.verifyOtp({token_hash:tokenHash,type:'email'});
   if(error||!data.session)throw new Error('Invalid email link');
   const result=await client.auth.getUser(data.session.access_token);
   if(result.error||!result.data.user.email||!result.data.user.email_confirmed_at)throw new Error('Unverified identity');
   return {id:result.data.user.id,email:result.data.user.email,expiresAt:(data.session.expires_at??0)*1000};
  }
 };
}
