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
  async batch(statements){
    this.database.exec('BEGIN');
    try{
      for(const statement of statements) await statement.run();
      this.database.exec('COMMIT');
    }catch(error){ this.database.exec('ROLLBACK'); throw error; }
  }
}

async function setup(){
  const database=new DatabaseSync(':memory:');
  database.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  return {database,env:{
    ACCOUNTS:new D1(database),RESEND_API_KEY:'test-key',AUTH_FROM_EMAIL:'Food My Way <login@foodmyway.app>',AUTH_ORIGIN:'https://foodmyway.app'
  }};
}

function request(email,returnTo){
  return new Request('https://foodmyway.app/api/auth/request',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,returnTo})
  });
}

test('digital-kit sign-in email keeps the exact safe in-app return route',async()=>{
  const {database,env}=await setup();
  const originalFetch=globalThis.fetch;
  let emailBody;
  globalThis.fetch=async(_url,options)=>{emailBody=JSON.parse(options.body);return new Response('{}',{status:200});};
  try{
    const response=await onRequestPost({request:request('buyer@example.com','/digital-kit.html#digitalKit'),env});
    assert.equal(response.status,200);
    assert.match(emailBody.text,/returnTo=%2Fdigital-kit\.html%23digitalKit/);
  }finally{globalThis.fetch=originalFetch;database.close();}
});

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

test('auth cleanup preserves the expired challenge behind an active session',async()=>{
  const {database,env}=await setup();
  database.exec('PRAGMA foreign_keys=ON');
  const now=Math.floor(Date.now()/1000);
  database.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','member@example.com',now-1000);
  database.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)')
    .run('active_challenge','member@example.com','active_challenge_hash',now-1000,now-900,now-950);
  database.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)')
    .run('active_session','user_1','active_challenge','active_session_hash',now-950,now+1000);
  database.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?)')
    .run('stale_challenge','stale@example.com','stale_hash',now-1000,now-900);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response('{}',{status:200});
  try{
    const response=await onRequestPost({request:request('new@example.com'),env});
    assert.equal(response.status,200);
    assert.equal(database.prepare('SELECT count(*) AS count FROM sessions WHERE id=?').get('active_session').count,1);
    assert.equal(database.prepare('SELECT count(*) AS count FROM login_challenges WHERE id=?').get('active_challenge').count,1);
    assert.equal(database.prepare('SELECT count(*) AS count FROM login_challenges WHERE id=?').get('stale_challenge').count,0);
  }finally{ globalThis.fetch=originalFetch; database.close(); }
});

test('account storage failure returns a controlled error without sending email',async()=>{
  const originalFetch=globalThis.fetch;
  let sends=0;
  globalThis.fetch=async()=>{ sends+=1; return new Response('{}',{status:200}); };
  const unavailableAccounts={
    async batch(){ throw new Error('unavailable'); },
    prepare(){ throw new Error('unavailable'); }
  };
  const env={
    ACCOUNTS:unavailableAccounts,
    RESEND_API_KEY:'test-key',
    AUTH_FROM_EMAIL:'Food My Way <login@foodmyway.app>',
    AUTH_ORIGIN:'https://foodmyway.app'
  };
  try{
    const response=await onRequestPost({request:request('person@example.com'),env});
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'Cloud account storage is temporarily unavailable.'});
    assert.equal(sends,0);
  }finally{ globalThis.fetch=originalFetch; }
});
