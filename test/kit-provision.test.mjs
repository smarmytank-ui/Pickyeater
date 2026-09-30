import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet,onRequestPost } from '../functions/api/kit-provision.js';

const token='6e51cc2c658fb60d57e8d503ac2e36e8cf80ad921730f69206843c330879210a';

test('temporary kit provision route rejects reads and unauthorized writes',async()=>{
  assert.equal((await onRequestGet()).status,405);
  const response=await onRequestPost({
    request:new Request('https://foodmyway.app/api/kit-provision',{method:'POST',body:'%PDF-test',headers:{'content-type':'application/pdf'}}),
    env:{KIT_FILES:{}}
  });
  assert.equal(response.status,401);
});

test('temporary kit provision route uploads and verifies the exact private object',async()=>{
  let stored;
  const env={KIT_FILES:{
    async put(key,body,options){ stored={key,bytes:new Uint8Array(body),options}; },
    async head(key){ return key===stored.key ? {size:stored.bytes.byteLength} : null; }
  }};
  const pdf=new TextEncoder().encode('%PDF-1.7\nFood My Way');
  const response=await onRequestPost({
    request:new Request('https://foodmyway.app/api/kit-provision',{
      method:'POST',body:pdf,headers:{'content-type':'application/pdf','x-kit-provision-token':token}
    }),
    env
  });
  assert.equal(response.status,201);
  assert.deepEqual(await response.json(),{ok:true,key:'FoodMyWay-Picky-Eater-Survival-Kit.pdf',size:pdf.byteLength});
  assert.equal(stored.key,'FoodMyWay-Picky-Eater-Survival-Kit.pdf');
  assert.equal(stored.options.httpMetadata.contentType,'application/pdf');
});
