import { runtime, runtimeValues } from '@montra/runtime';
import { after } from 'next/server';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handle } from '../../../montra/service';
import { readAuthConfig, resolveIdentity } from '../../../montra/auth';
export const dynamic='force-dynamic';
async function dispatch(request:Request){
 try{
 const backend=runtime();
 const config=readAuthConfig(runtimeValues(),process.env.NODE_ENV==='development');
 const identity=await resolveIdentity(request,backend.db,config,async()=>{const u=await getChatGPTUser();return u?{id:u.userId,email:u.email}:null;});
 return handle(request,identity,{...backend,defer:fn=>after(async()=>{try{await fn()}catch{/* Do not log credentials or provider payloads. Durable jobs remain retryable. */}})});
 }catch{return Response.json({error:'Sign-in is temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const GET=dispatch;
export const POST=dispatch;

