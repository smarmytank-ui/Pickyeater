import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestDelete, onRequestGet, onRequestPut } from '../functions/api/account/data.js';
import { sessionCookie, sha256Hex } from '../functions/_shared/account.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class Statement{
  constructor(database,sql){ this.database=database; this.sql=sql; this.values=[]; }
  bind(...values){ this.values=values; return this; }
  async first(){ return this.database.prepare(this.sql).get(...this.values); }
  async run(){
    const result=this.database.prepare(this.sql).run(...this.values);
    return {meta:{changes:Number(result.changes)}};
  }
}

class D1{
  constructor(database){ this.database=database; }
  prepare(sql){ return new Statement(this.database,sql); }
  async batch(statements){
    this.database.exec('BEGIN');
    try{
      const results=[];
      for(const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    }catch(error){ this.database.exec('ROLLBACK'); throw error; }
  }
}

async function setup(){
  const accounts=new DatabaseSync(':memory:');
  const purchases=new DatabaseSync(':memory:');
  accounts.exec('PRAGMA foreign_keys=ON');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0002_purchase_entitlements.sql'),'utf8'));
  const token='account-test-session-token';
  const tokenHash=await sha256Hex(token);
  const now=Math.floor(Date.now()/1000);
  accounts.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','buyer@example.com',now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)')
    .run('challenge_1','buyer@example.com','challenge_hash',now,now+900,now);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)')
    .run('session_1','user_1','challenge_1',tokenHash,now,now+3600);
  return {accounts,purchases,env:{ACCOUNTS:new D1(accounts),PURCHASES:new D1(purchases)},cookie:sessionCookie(token)};
}

function request(method,cookie,body,headers={}){
  return new Request('https://foodmyway.app/api/account/data',{
    method,headers:{cookie,'content-type':'application/json',...headers},
    ...(body===undefined ? {} : {body:JSON.stringify(body)})
  });
}

function grantFounding(purchases,status='active'){
  purchases.prepare(`INSERT INTO entitlements
    (email,plan,status,stripe_customer_id,stripe_session_id,stripe_payment_intent_id,amount,currency,stripe_event_created,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run('buyer@example.com','founding',status,'cus_1','cs_1','pi_1',2900,'usd',100,'2026-01-01','2026-01-01');
}

test('cloud backup writes require founding access while export and deletion remain available',async()=>{
  const {accounts,purchases,env,cookie}=await setup();

  const initialGet=await onRequestGet({request:request('GET',cookie),env});
  assert.equal(initialGet.status,200);
  assert.deepEqual((await initialGet.json()).snapshot,{version:1,data:{}});

  const denied=await onRequestPut({request:request('PUT',cookie,{data:{pickyRecipeBook:[{id:'meal_1'}]},baseRevision:null}),env});
  assert.equal(denied.status,403);
  assert.equal((await denied.json()).code,'PREMIUM_REQUIRED');

  grantFounding(purchases);
  const saved=await onRequestPut({request:request('PUT',cookie,{data:{pickyRecipeBook:[{id:'meal_1'}]},baseRevision:null}),env});
  assert.equal(saved.status,200);
  assert.equal((await saved.json()).revision,1);

  purchases.prepare("UPDATE entitlements SET status='refunded'").run();
  const exportResponse=await onRequestGet({request:request('GET',cookie),env});
  assert.equal(exportResponse.status,200);
  assert.deepEqual((await exportResponse.json()).snapshot.data.pickyRecipeBook,[{id:'meal_1'}]);

  const deniedAfterRefund=await onRequestPut({request:request('PUT',cookie,{data:{pickyRecipeBook:[]},baseRevision:1}),env});
  assert.equal(deniedAfterRefund.status,403);

  const deleted=await onRequestDelete({request:request('DELETE',cookie,{}, {'x-confirm-delete':'DELETE'}),env});
  assert.equal(deleted.status,200);
  assert.match(deleted.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal(accounts.prepare('SELECT COUNT(*) AS count FROM users').get().count,0);

  accounts.close(); purchases.close();
});
