import { env } from 'cloudflare:workers';
import { after } from 'next/server';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handle } from '../../../montra/service';
export const dynamic='force-dynamic';
async function dispatch(request:Request){
 const u=await getChatGPTUser();
 if(!env.DB||!env.BUCKET)return Response.json({error:'Database or private storage is unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
 return handle(request,u?{id:u.userId,email:u.email}:null,{db:env.DB,bucket:env.BUCKET,defer:fn=>after(async()=>{try{await fn()}catch{/* Do not log credentials or provider payloads. Durable jobs remain retryable. */}})});
}
export const GET=dispatch;
export const POST=dispatch;

