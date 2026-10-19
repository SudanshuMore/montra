import test from 'node:test';
import assert from 'node:assert/strict';
import {privateStore} from '../montra/supabase-storage.ts';
test('private storage uses authenticated object operations, never public URLs, and rejects unsafe keys',async()=>{
 const calls=[],bytes=new TextEncoder().encode('MONTRA SYNTHETIC INVOICE\n');
 const store=privateStore({storage:{from(bucket){assert.equal(bucket,'private-evidence');return {
  async upload(key,value,options){calls.push(['upload',key,options]);return {error:null}},
  async download(key){calls.push(['download',key]);return {data:new Blob([bytes]),error:null}},
  async remove(keys){calls.push(['remove',keys]);return {error:null}}
 }}}},'private-evidence');
 await store.put('org/doc',bytes.buffer);assert.deepEqual(new Uint8Array((await store.get('org/doc')).body),bytes);await store.delete('org/doc');
 assert.equal(calls[0][2].upsert,false);assert.equal(calls[0][2].contentType,'text/plain');
 await assert.rejects(store.get('../secret'));await assert.rejects(store.put('org/../doc',bytes.buffer));
});
