import { runtime, runtimeValues } from '@montra/runtime';
import { handleAuth, readAuthConfig } from '../../../montra/auth';
import { emailProvider } from '../../../montra/supabase-auth';
export const dynamic='force-dynamic';
async function dispatch(request:Request){
 try{const backend=runtime();const config=readAuthConfig(runtimeValues(),process.env.NODE_ENV==='development');return await handleAuth(request,backend.db,config,emailProvider(config));}
 catch{return Response.json({error:'Email sign-in is not configured'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const GET=dispatch;
export const POST=dispatch;
