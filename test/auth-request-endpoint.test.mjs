import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestPost } from '../functions/api/auth/request.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class Statement{
  constructor(database,sql){ this.database=database; this.sql=sql; this.values=[]; }
  bind(...values){ this.values=values; return this; }
  async first(){ return this.database.prepare(this.sql).get(...this.values); }
  async run(){ const result=this.database.prepare(this.sql).run(...this.values); return {meta:{changes:Number(result.changes)}}; }
}

class D1{
  constructor(database){ this.database=database; }
  prepare(sql){ return new Statement(this.database,sql); }
}

async function setup(){
  const database=new DatabaseSync(':memory:');
  database.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  return {database,env:{
    ACCOUNTS:new D1(database),RESEND_API_KEY:'test-key',AUTH_FROM_EMAIL:'Food My Way <login@foodmyway.app>',AUTH_ORIGIN:'https://foodmyway.app'
  }};
}

function request(email){
  return new Request('https://foodmyway.app/api/auth/request',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})
  });
}

test('sign-in email requests enforce a cooldown before sending again',async()=>{
  const {database,env}=await setup();
  const originalFetch=globalThis.fetch;
  let sends=0;
  globalThis.fetch=async()=>{ sends+=1; return new Response('{}',{status:200}); };
  try{
    const first=await onRequestPost({request:request('person@example.com'),env});
    assert.equal(first.status,200);
    const repeated=await onRequestPost({request:request('person@example.com'),env});
    assert.equal(repeated.status,429);
    assert.equal(sends,1);
  }finally{ globalThis.fetch=originalFetch; database.close(); }
});

test('a new sign-in email invalidates older unused links',async()=>{
  const {database,env}=await setup();
  const now=Math.floor(Date.now()/1000);
  database.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?)')
    .run('old','person@example.com','old_hash',now-120,now+780);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response('{}',{status:200});
  try{
    const response=await onRequestPost({request:request('person@example.com'),env});
    assert.equal(response.status,200);
    assert.ok(database.prepare('SELECT expires_epoch FROM login_challenges WHERE id=?').get('old').expires_epoch<=now);
    assert.equal(database.prepare('SELECT count(*) AS count FROM login_challenges WHERE email=?').get('person@example.com').count,2);
  }finally{ globalThis.fetch=originalFetch; database.close(); }
});

test('the endpoint caps aggregate hourly email volume',async()=>{
  const {database,env}=await setup();
  const now=Math.floor(Date.now()/1000);
  const insert=database.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?)');
  for(let index=0;index<100;index+=1) insert.run(`id_${index}`,`person${index}@example.com`,`hash_${index}`,now-120,now+780);
  const originalFetch=globalThis.fetch;
  let sends=0;
  globalThis.fetch=async()=>{ sends+=1; return new Response('{}',{status:200}); };
  try{
    const response=await onRequestPost({request:request('new@example.com'),env});
    assert.equal(response.status,429);
    assert.equal(sends,0);
  }finally{ globalThis.fetch=originalFetch; database.close(); }
});
