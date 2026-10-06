import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestGet } from '../functions/api/digital-kit.js';
import { sessionCookie, sha256Hex } from '../functions/_shared/account.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
class Statement{constructor(database,sql){this.database=database;this.sql=sql;this.values=[];}bind(...values){this.values=values;return this;}async first(){return this.database.prepare(this.sql).get(...this.values);}async all(){return {results:this.database.prepare(this.sql).all(...this.values).map(row=>({...row}))};}}
class D1{constructor(database){this.database=database;}prepare(sql){return new Statement(this.database,sql);}}

async function setup(plan,status='active'){
  const accounts=new DatabaseSync(':memory:');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  const purchases=new DatabaseSync(':memory:');
  purchases.exec(await readFile(path.join(root,'migrations/0002_purchase_entitlements.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0006_refund_tombstones.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0007_survival_kit_entitlement.sql'),'utf8'));
  const now=Math.floor(Date.now()/1000); const token='digital-kit-session-token';
  accounts.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','buyer@example.com',now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)').run('challenge_1','buyer@example.com','challenge_hash',now,now+900,now);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)').run('session_1','user_1','challenge_1',await sha256Hex(token),now,now+3600);
  if(plan) purchases.prepare('INSERT INTO entitlements (email,plan,status,stripe_customer_id,stripe_session_id,stripe_payment_intent_id,amount,currency,stripe_event_created,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('buyer@example.com',plan,status,'cus_1','cs_1','pi_1',plan==='survival_kit'?1900:2900,'usd',now,new Date().toISOString(),new Date().toISOString());
  return {accounts,purchases,token,env:{ACCOUNTS:new D1(accounts),PURCHASES:new D1(purchases)}};
}

test('digital kit rejects anonymous and signed-in free accounts',async()=>{
  const state=await setup(null);
  const anonymous=await onRequestGet({request:new Request('https://foodmyway.app/api/digital-kit'),env:state.env});
  assert.equal(anonymous.status,401);
  const free=await onRequestGet({request:new Request('https://foodmyway.app/api/digital-kit',{headers:{cookie:sessionCookie(state.token)}}),env:state.env});
  assert.equal(free.status,403);
  state.accounts.close(); state.purchases.close();
});

for(const plan of ['survival_kit','founding']) test(`active ${plan} entitlement returns the paid digital content`,async()=>{
  const state=await setup(plan);
  const response=await onRequestGet({request:new Request('https://foodmyway.app/api/digital-kit',{headers:{cookie:sessionCookie(state.token)}}),env:state.env});
  assert.equal(response.status,200);
  assert.match(response.headers.get('cache-control'),/private/);
  const body=await response.json();
  assert.equal(body.access.plan,plan);
  assert.equal(body.content.weeks.length,2);
  assert.equal(body.content.weeks.flatMap(week=>week.days).length,14);
  assert.equal(body.content.recipes.length,16);
  state.accounts.close(); state.purchases.close();
});
