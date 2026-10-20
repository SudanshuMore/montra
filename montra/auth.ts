import { type Database, one, stmt } from './db.ts';
import { type Identity } from './access.ts';
import { AppError, fail, hash, now } from './money.ts';

export type AuthConfig={mode:'email'|'platform'|'disabled';origin:string;supabaseUrl:string;publishableKey:string;localDemo:boolean};
export interface EmailIdentityProvider {
 send(email:string,redirect:string):Promise<void>;
 verify(tokenHash:string):Promise<{id:string;email:string;expiresAt:number}>;
}
export function readAuthConfig(values:Record<string,unknown>,development=false):AuthConfig {
 const mode=values.MONTRA_AUTH_MODE??(development?'platform':'disabled');
 return {mode:mode==='email'?'email':mode==='platform'&&(development||values.MONTRA_TRUST_PLATFORM_IDENTITY==='true')?'platform':'disabled',
  origin:String(values.MONTRA_AUTH_ORIGIN??(development?'http://localhost:5173':'')),
  supabaseUrl:String(values.MONTRA_SUPABASE_URL??''),publishableKey:String(values.MONTRA_SUPABASE_PUBLISHABLE_KEY??''),localDemo:development};
}
function origin(c:AuthConfig){
 let u:URL;try{u=new URL(c.origin)}catch{return fail(503,'Email sign-in is not configured')}
 if(u.origin!==c.origin||u.username||u.password||!(u.protocol==='https:'||(c.localDemo&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))))fail(503,'Email sign-in is not configured');
 return u;
}
function configured(c:AuthConfig){if(c.mode!=='email'||!c.supabaseUrl||!c.publishableKey)fail(503,'Email sign-in is not configured');origin(c);}
function cookieName(c:AuthConfig,type:string){return (c.origin.startsWith('https://')?'__Host-':'')+'montra_'+type;}
function cookie(c:AuthConfig,type:string,value:string,seconds:number){return `${cookieName(c,type)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${c.origin.startsWith('https://')?'; Secure':''}`;}
function readCookie(req:Request,c:AuthConfig,type:string){const name=cookieName(c,type)+'=';const v=(req.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name));return v.length===1?v[0].slice(name.length):'';}
function random(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
const validToken=(s:string)=>/^[a-f0-9]{64}$/.test(s);
const headers=()=>new Headers({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
function json(body:unknown,status=200,h=headers()){return Response.json(body,{status,headers:h});}
function sameOrigin(req:Request,c:AuthConfig){if(new URL(req.url).origin!==origin(c).origin||req.headers.get('origin')!==c.origin)fail(403,'Same-origin request required');}
async function body(req:Request){
 const reader=req.body?.getReader();if(!reader)fail(400,'Request body required');let text='';let bytes=0;const decoder=new TextDecoder();
 while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>2048){await reader.cancel();fail(413,'Sign-in request too large')}text+=decoder.decode(r.value,{stream:true})}text+=decoder.decode();
 const content=req.headers.get('content-type')??'';
 if(content.startsWith('application/x-www-form-urlencoded'))return Object.fromEntries(new URLSearchParams(text));
 if(!content.startsWith('application/json'))fail(415,'JSON or form required');
 try{const p=JSON.parse(text);if(p&&typeof p==='object'&&!Array.isArray(p))return p}catch{/* redact parse details */}
 return fail(400,'Invalid request');
}
async function limit(db:Database,key:string,max:number,windowMs:number){
 const time=Date.now(),bucket=Math.floor(time/windowMs),id=key+':'+bucket;
 const r=await one(db,'INSERT INTO auth_rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=auth_rate_limits.hits+1 RETURNING hits',id,new Date((bucket+1)*windowMs).toISOString());
 if(!r||r.hits>max)fail(429,'Too many sign-in attempts. Try again later.');
}
export async function sessionIdentity(req:Request,db:Database,c:AuthConfig):Promise<Identity|null>{
 if(c.mode!=='email')return null;
 configured(c);if(new URL(req.url).origin!==c.origin)return null;
 const token=readCookie(req,c,'session');if(!validToken(token))return null;
 const row=await one(db,'SELECT u.id,u.email FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?',await hash(token),now());
 const issuerPrefix='supabase:'+new URL(c.supabaseUrl).host+':';
 return row&&row.id.startsWith(issuerPrefix)?{id:row.id,email:row.email}:null;
}
export async function resolveIdentity(req:Request,db:Database,c:AuthConfig,platform:()=>Promise<Identity|null>):Promise<Identity|null>{
 if(c.mode==='email')return sessionIdentity(req,db,c);
 if(c.mode!=='platform')return null;
 // Local mock headers are only accepted on the local development origin.
 if(c.localDemo&&!['localhost','127.0.0.1'].includes(new URL(req.url).hostname))return null;
 return platform();
}
export async function handleAuth(req:Request,db:Database,c:AuthConfig,provider:EmailIdentityProvider|null):Promise<Response>{
 try{
  const path=new URL(req.url).pathname;
  if(path==='/auth/config'&&req.method==='GET')return json({mode:c.mode,configured:c.mode==='email'&&!!c.supabaseUrl&&!!c.publishableKey,localDemo:c.localDemo&&c.mode==='platform'});
  configured(c);if(!provider)fail(503,'Email sign-in is not configured');
  if(new URL(req.url).origin!==c.origin)fail(403,'Invalid application origin');
  if(path==='/auth/request'&&req.method==='POST'){
   sameOrigin(req,c);const p=await body(req);const email=typeof p.email==='string'?p.email.trim().toLowerCase():'';
   if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email address');
   await db.batch([stmt(db,'DELETE FROM auth_attempts WHERE expires_at<?',now()),stmt(db,'DELETE FROM auth_rate_limits WHERE expires_at<?',now()),stmt(db,'DELETE FROM auth_sessions WHERE expires_at<?',now())]);
   await limit(db,'request-global',30,60000);const emailHash=await hash(email);await limit(db,'email:'+emailHash,3,15*60000);
   const challenge=random(),challengeHash=await hash(challenge);
   await stmt(db,'INSERT INTO auth_attempts(id,email_hash,expires_at) VALUES(?,?,?)',challengeHash,emailHash,new Date(Date.now()+10*60000).toISOString()).run();
   try{await provider.send(email,c.origin+'/auth/confirm')}catch{await stmt(db,'DELETE FROM auth_attempts WHERE id=?',challengeHash).run();return json({message:'If this address can receive sign-in emails, a link will arrive shortly. Open it in this browser.'})}
   const h=headers();h.append('Set-Cookie',cookie(c,'challenge',challenge,600));
   return json({message:'If this address can receive sign-in emails, a link will arrive shortly. Open it in this browser.'},200,h);
  }
  if(path==='/auth/confirm'&&req.method==='GET'){
   // Email scanners may GET this page. Verification requires an explicit POST.
   const token=new URL(req.url).searchParams.get('token_hash')??'';
   if(!/^[a-zA-Z0-9_-]{20,512}$/.test(token))fail(400,'Invalid sign-in link. Request a new one.');
   const challenge=readCookie(req,c,'challenge');if(!validToken(challenge))fail(400,'Open this link in the browser where you requested it, or request a new link.');
   // no-referrer makes a native form POST send Origin: null. Keep origin
   // checks strict while withholding the callback path and token from Referer.
   const h=headers();h.set('Referrer-Policy','strict-origin');h.set('Content-Type','text/html; charset=utf-8');h.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
   return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Confirm Montra sign-in</title><style>body{font:16px system-ui;background:#f5f5ef;color:#234b3d;max-width:440px;margin:12vh auto;padding:24px}button{background:#234b3d;color:white;padding:14px 24px;border:0;border-radius:12px;font:inherit;cursor:pointer}p{line-height:1.7}</style><main><p>MONTRA</p><h1>Continue to your workspace</h1><p>Confirm to finish signing in. This link can be used once and must be opened in the browser that requested it.</p><form method="post" action="/auth/confirm"><input type="hidden" name="token_hash" value="${token}"><button>Confirm sign-in</button></form><p><a href="/signin">Request another link</a></p></main></html>`,{headers:h});
  }
  if(path==='/auth/confirm'&&req.method==='POST'){
   sameOrigin(req,c);await limit(db,'confirm-global',60,60000);const p=await body(req);
   const token=typeof p.token_hash==='string'?p.token_hash:'';if(!/^[a-zA-Z0-9_-]{20,512}$/.test(token))fail(400,'Invalid sign-in link');
   const challenge=readCookie(req,c,'challenge');if(!validToken(challenge))fail(400,'Request a new sign-in link in this browser');
   const challengeHash=await hash(challenge),attempt=await one(db,'SELECT * FROM auth_attempts WHERE id=? AND consumed_at IS NULL AND expires_at>?',challengeHash,now());
   if(!attempt)fail(400,'This sign-in request has expired or was already used');
   let verified:Awaited<ReturnType<EmailIdentityProvider['verify']>>;
   try{verified=await provider.verify(token)}catch{return json({error:'This link is invalid, expired or already used. Request a new link.'},400)}
   if(await hash(verified.email.toLowerCase())!==attempt.email_hash)fail(400,'This link belongs to a different sign-in request');
   if(!verified.id||!verified.email||!Number.isFinite(verified.expiresAt)||verified.expiresAt<=Date.now())fail(400,'Verified session is invalid');
   const consumed=await one(db,'UPDATE auth_attempts SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>? RETURNING id',now(),challengeHash,now());
   if(!consumed)fail(400,'This sign-in request was already used');
   const tokenValue=random(),expires=Math.min(verified.expiresAt,Date.now()+3600000),id='supabase:'+new URL(c.supabaseUrl).host+':'+verified.id;
   const previous=readCookie(req,c,'session');
   await db.batch([
    stmt(db,'INSERT INTO users(id,email) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email',id,verified.email.toLowerCase()),
    stmt(db,'INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)',await hash(tokenValue),id,new Date(expires).toISOString(),now()),
    stmt(db,'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=?',now(),await hash(previous))
   ]);
   const h=headers();h.set('Location','/');h.append('Set-Cookie',cookie(c,'session',tokenValue,Math.max(0,Math.floor((expires-Date.now())/1000))));h.append('Set-Cookie',cookie(c,'challenge','',0));
   return new Response(null,{status:303,headers:h});
  }
  if(path==='/auth/signout'&&req.method==='POST'){
   sameOrigin(req,c);const token=readCookie(req,c,'session');if(validToken(token))await stmt(db,'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=?',now(),await hash(token)).run();
   const h=headers();h.append('Set-Cookie',cookie(c,'session','',0));h.append('Set-Cookie',cookie(c,'challenge','',0));return json({signedOut:true},200,h);
  }
  fail(405,'Method not allowed');
 }catch(e){return json({error:e instanceof AppError?e.message:'Sign-in is temporarily unavailable'},e instanceof AppError?e.status:503)}
}
