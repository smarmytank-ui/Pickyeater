import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function harness(){
  const handlers={};
  const writes=[];
  const matches=[];
  let fetchImpl=async()=>new Response('network');
  const cache={
    addAll:async()=>{},
    put:async(request,response)=>writes.push({url:request.url,status:response.status})
  };
  const caches={
    open:async()=>cache,
    keys:async()=>[],
    delete:async()=>true,
    match:async request=>{ matches.push(typeof request==='string' ? request : request.url); return undefined; }
  };
  const self={
    location:{origin:'https://foodmyway.app'},
    clients:{claim:async()=>{}},
    skipWaiting(){},
    addEventListener(type,handler){ handlers[type]=handler; }
  };
  const source=await readFile(path.join(root,'service-worker.js'),'utf8');
  vm.runInNewContext(source,{self,caches,fetch:(...args)=>fetchImpl(...args),URL,Response,Request,Promise,console});
  return {
    writes,matches,
    setFetch(value){ fetchImpl=value; },
    async dispatch(request){
      let responsePromise;
      handlers.fetch({request,respondWith(value){ responsePromise=Promise.resolve(value); }});
      return responsePromise;
    }
  };
}

test('service worker leaves every API GET entirely to the network layer',async()=>{
  const worker=await harness();
  let interceptedFetches=0;
  worker.setFetch(async()=>{ interceptedFetches+=1; return new Response('{}'); });
  const response=await worker.dispatch(new Request('https://foodmyway.app/api/account/data'));
  assert.equal(response,undefined);
  assert.equal(interceptedFetches,0);
  assert.deepEqual(worker.writes,[]);
  assert.deepEqual(worker.matches,[]);
});

test('service worker honors no-store on same-origin non-API responses',async()=>{
  const worker=await harness();
  worker.setFetch(async()=>new Response('private',{headers:{'cache-control':'no-store'}}));
  const response=await worker.dispatch(new Request('https://foodmyway.app/private-resource.txt'));
  assert.equal(await response.text(),'private');
  assert.deepEqual(worker.writes,[]);
});

test('configuration is fetched before any cached fallback',async()=>{
  const worker=await harness();
  worker.setFetch(async()=>new Response('window.FMW_CONFIG={};',{headers:{'cache-control':'no-cache'}}));
  const response=await worker.dispatch(new Request('https://foodmyway.app/config.js'));
  assert.equal(await response.text(),'window.FMW_CONFIG={};');
  assert.deepEqual(worker.writes,[{url:'https://foodmyway.app/config.js',status:200}]);
  assert.deepEqual(worker.matches,[]);
});
