import type { SupabaseClient } from '@supabase/supabase-js';
import type { ObjectStore } from './evidence.ts';

export function privateStore(client:SupabaseClient,bucket:string):ObjectStore {
 const store=client.storage.from(bucket);
 function key(value:string){if(!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(value))throw new Error('Invalid private object key');return value;}
 return {
  async put(path,value){const {error}=await store.upload(key(path),value,{contentType:'text/plain',upsert:false});if(error)throw new Error('Private upload failed');},
  async get(path){const {data,error}=await store.download(key(path));if(error){if(String((error as any).statusCode)==='404'||String((error as any).status)==='404')return null;throw new Error('Private download failed')}return data?{body:await data.arrayBuffer()}:null;},
  async delete(path){const {error}=await store.remove([key(path)]);if(error)throw new Error('Private deletion failed');}
 };
}
