import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestGet, onRequestPost } from '../functions/api/auth/consume.js';
import { randomToken, sha256Hex } from '../functions/_shared/account.mjs';

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
  database.exec('PRAGMA foreign_keys=ON');
  database.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  const token=randomToken();
  const hash=await sha256Hex(token);
  const now=Math.floor(Date.now()/1000);
  database.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?)')
    .run('challenge_1','buyer@example.com',hash,now,now+900);
  return {database,env:{ACCOUNTS:new D1(database)},token};
}

test('magic-link GET is scanner-safe and confirmed POST is single use',async()=>{
  const {database,env,token}=await setup();
  const link=`https://foodmyway.app/api/auth/consume?token=${token}`;

  for(let count=0;count<2;count+=1){
    const preview=await onRequestGet({request:new Request(link),env});
    assert.equal(preview.status,200);
    assert.match(await preview.text(),/Confirm sign-in/);
    assert.equal(database.prepare('SELECT used_epoch FROM login_challenges').get().used_epoch,null);
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,0);
  }

  const confirmed=await onRequestPost({request:new Request('https://foodmyway.app/api/auth/consume',{
    method:'POST',body:new URLSearchParams({token})
  }),env});
  assert.equal(confirmed.status,302);
  assert.match(confirmed.headers.get('location'),/login=success/);
  assert.match(confirmed.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.ok(database.prepare('SELECT used_epoch FROM login_challenges').get().used_epoch);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,1);

  const replay=await onRequestPost({request:new Request('https://foodmyway.app/api/auth/consume',{
    method:'POST',body:new URLSearchParams({token})
  }),env});
  assert.equal(replay.status,302);
  assert.match(replay.headers.get('location'),/login=invalid/);
  assert.equal(replay.headers.get('set-cookie'),null);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,1);
  database.close();
});
