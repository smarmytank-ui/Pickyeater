import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {onRequestPost} from '../functions/api/campaign-visits.js';
test('private aggregate counts, bounds, duplicate events and unavailable data',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE product_events (event_name TEXT,session_id TEXT,path TEXT,details TEXT,created_at TEXT)');
 const ref='vz_'+'a'.repeat(48),empty='vz_'+'b'.repeat(48),secret='synthetic-only-'.repeat(4),now=Date.now(),from=new Date(now-3600000).toISOString(),to=new Date(now-1000).toISOString();
 let reads=0;const env={VEYZLO_VISITS_READ_TOKEN:secret,VEYZLO_VISITS_STARTED_AT:from,TELEMETRY:{prepare:sql=>({bind:(...args)=>({all:async()=>{reads++;return {results:db.prepare(sql).all(...args)}}})})}};
 const insert=(event,session,path,reference)=>db.prepare('INSERT INTO product_events VALUES (?,?,?,?,?)').run(event,session,path,JSON.stringify({veyzlo_reference:reference,email:'must-not-leak@example.test'}),new Date(now-2000).toISOString());
 insert('kit_page_viewed','session-1','/survival-kit.html',ref);insert('kit_page_viewed','session-1','/survival-kit.html',ref);insert('kit_page_viewed','session-2','/survival-kit',ref);insert('kit_checkout_started','session-3','/survival-kit',ref);insert('kit_page_viewed','session-4','/other',ref);
 const call=(input={references:[ref,empty],from,to},token=secret,settings=env)=>onRequestPost({env:settings,request:new Request('https://foodmyway.app/api/campaign-visits',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(input)})});
 try{
  assert.equal((await call(undefined,'wrong')).status,401);assert.equal(reads,0);
  assert.equal((await call(undefined,secret,{})).status,503);
  const response=await call();assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.references,[{reference:ref,pageLoads:2},{reference:empty,pageLoads:0}]);assert(!JSON.stringify(body).includes('must-not-leak'));assert(!JSON.stringify(body).includes('session-1'));
  for(const input of [{references:[ref,ref],from,to},{references:['arbitrary'],from,to},{references:[ref],from:new Date(now-90*86400000).toISOString(),to},{references:[ref],from,to:new Date(now+3600000).toISOString()}])assert.equal((await call(input)).status,400);
  assert.equal(reads,1);
  assert.equal((await call(undefined,secret,{...env,TELEMETRY:{prepare:()=>{throw Error('private database error')}}})).status,503);
 }finally{db.close();}
});
