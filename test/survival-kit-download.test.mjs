import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestGet } from '../functions/api/survival-kit-download.js';
import { sessionCookie, sha256Hex } from '../functions/_shared/account.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class Statement{
  constructor(database,sql){this.database=database;this.sql=sql;this.values=[];}
  bind(...values){this.values=values;return this;}
  async first(){return this.database.prepare(this.sql).get(...this.values);}
  async run(){const result=this.database.prepare(this.sql).run(...this.values);return {meta:{changes:Number(result.changes)}};}
  async all(){return {results:this.database.prepare(this.sql).all(...this.values).map(row=>({...row}))};}
}
class D1{constructor(database){this.database=database;}prepare(sql){return new Statement(this.database,sql);}}

async function setup(plan='survival_kit',status='active'){
  const accounts=new DatabaseSync(':memory:');
  accounts.exec('PRAGMA foreign_keys=ON');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  const purchases=new DatabaseSync(':memory:');
  purchases.exec(await readFile(path.join(root,'migrations/0002_purchase_entitlements.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0006_refund_tombstones.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0007_survival_kit_entitlement.sql'),'utf8'));
  const now=Math.floor(Date.now()/1000);
  const token='kit-download-session-token';
  accounts.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','buyer@example.com',now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)').run('challenge_1','buyer@example.com','challenge_hash',now,now+900,now);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)').run('session_1','user_1','challenge_1',await sha256Hex(token),now,now+3600);
  purchases.prepare(`INSERT INTO entitlements (email,plan,status,stripe_customer_id,stripe_session_id,stripe_payment_intent_id,amount,currency,stripe_event_created,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run('buyer@example.com',plan,status,'cus_1','cs_1','pi_1',plan==='survival_kit'?1900:2900,'usd',now,new Date().toISOString(),new Date().toISOString());
  return {accounts,purchases,token};
}

test('Survival Kit download requires an authenticated matching purchase',async()=>{
  const state=await setup('survival_kit','refunded');
  const env={ACCOUNTS:new D1(state.accounts),PURCHASES:new D1(state.purchases),KIT_FILES:{async get(){return {body:new TextEncoder().encode('%PDF-test')}}}};
  const anonymous=await onRequestGet({request:new Request('https://foodmyway.app/api/survival-kit-download'),env});
  assert.equal(anonymous.status,401);
  const wrongPlan=await onRequestGet({request:new Request('https://foodmyway.app/api/survival-kit-download',{headers:{cookie:sessionCookie(state.token)}}),env});
  assert.equal(wrongPlan.status,403);
  state.accounts.close();state.purchases.close();
});

test('active Founding members receive the Survival Kit PDF bonus',async()=>{
  const state=await setup('founding','active');
  const env={ACCOUNTS:new D1(state.accounts),PURCHASES:new D1(state.purchases),KIT_FILES:{async get(){return {body:new TextEncoder().encode('%PDF-founder')}}}};
  const response=await onRequestGet({request:new Request('https://foodmyway.app/api/survival-kit-download',{headers:{cookie:sessionCookie(state.token)}}),env});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'%PDF-founder');
  state.accounts.close();state.purchases.close();
});

test('active Survival Kit buyers receive a private PDF download',async()=>{
  const state=await setup();
  const env={ACCOUNTS:new D1(state.accounts),PURCHASES:new D1(state.purchases),KIT_FILES:{async get(key){assert.equal(key,'FoodMyWay-Picky-Eater-Survival-Kit.pdf');return {body:new TextEncoder().encode('%PDF-test')};}}};
  const response=await onRequestGet({request:new Request('https://foodmyway.app/api/survival-kit-download',{headers:{cookie:sessionCookie(state.token)}}),env});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'application/pdf');
  assert.match(response.headers.get('content-disposition'),/FoodMyWay-Picky-Eater-Survival-Kit\.pdf/);
  assert.equal(await response.text(),'%PDF-test');
  state.accounts.close();state.purchases.close();
});
