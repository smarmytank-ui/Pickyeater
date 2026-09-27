import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestPost } from '../functions/api/shop.js';
import { sessionCookie, sha256Hex } from '../functions/_shared/account.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class Statement{
  constructor(database,sql){ this.database=database; this.sql=sql; this.values=[]; }
  bind(...values){ this.values=values; return this; }
  async first(){ return this.database.prepare(this.sql).get(...this.values); }
  async run(){ return this.database.prepare(this.sql).run(...this.values); }
}

class D1{
  constructor(database){ this.database=database; }
  prepare(sql){ return new Statement(this.database,sql); }
}

function request(cookie=''){
  return new Request('https://foodmyway.app/api/shop',{
    method:'POST',
    headers:{'content-type':'application/json',...(cookie ? {cookie} : {})},
    body:JSON.stringify({title:'Comfort dinner',items:[{name:'chicken breast',quantity:1,unit:'lb'}]})
  });
}

async function setup(){
  const accounts=new DatabaseSync(':memory:');
  const purchases=new DatabaseSync(':memory:');
  accounts.exec('PRAGMA foreign_keys=ON');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0002_purchase_entitlements.sql'),'utf8'));
  const now=Math.floor(Date.now()/1000);
  const token='shop-session-token';
  accounts.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','buyer@example.com',now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)')
    .run('challenge_1','buyer@example.com','challenge_hash',now,now+900,now);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)')
    .run('session_1','user_1','challenge_1',await sha256Hex(token),now,now+3600);
  return {accounts,purchases,cookie:sessionCookie(token),env:{
    ACCOUNTS:new D1(accounts),PURCHASES:new D1(purchases),INSTACART_API_KEY:'test-key',
    SHOP_LINKBACK_ORIGIN:'https://foodmyway.app',INSTACART_ENV:'development'
  }};
}

test('grocery link creation requires a signed-in founding member',async()=>{
  const {accounts,purchases,cookie,env}=await setup();
  const originalFetch=globalThis.fetch;
  let providerCalls=0;
  globalThis.fetch=async()=>{
    providerCalls+=1;
    return new Response(JSON.stringify({products_link_url:'https://www.instacart.com/store/products/123'}),{
      status:200,headers:{'content-type':'application/json'}
    });
  };
  try{
    const anonymous=await onRequestPost({request:request(),env});
    assert.equal(anonymous.status,401);

    const free=await onRequestPost({request:request(cookie),env});
    assert.equal(free.status,403);
    assert.equal((await free.json()).code,'PREMIUM_REQUIRED');
    assert.equal(providerCalls,0);

    purchases.prepare(`INSERT INTO entitlements
      (email,plan,status,stripe_customer_id,stripe_session_id,stripe_payment_intent_id,amount,currency,stripe_event_created,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run('buyer@example.com','founding','active','cus_1','cs_1','pi_1',2900,'usd',100,'2026-01-01','2026-01-01');
    const founding=await onRequestPost({request:request(cookie),env});
    assert.equal(founding.status,200);
    assert.deepEqual(await founding.json(),{url:'https://www.instacart.com/store/products/123'});
    assert.equal(providerCalls,1);

    purchases.prepare("UPDATE entitlements SET status='refunded'").run();
    const refunded=await onRequestPost({request:request(cookie),env});
    assert.equal(refunded.status,403);
    assert.equal(providerCalls,1);
  }finally{
    globalThis.fetch=originalFetch;
    accounts.close();
    purchases.close();
  }
});
