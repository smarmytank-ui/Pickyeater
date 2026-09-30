import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestGet, onRequestPost } from '../functions/api/auth/session.js';
import { sessionCookie, sha256Hex } from '../functions/_shared/account.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

class Statement{
  constructor(database,sql){ this.database=database; this.sql=sql; this.values=[]; }
  bind(...values){ this.values=values; return this; }
  async first(){ return this.database.prepare(this.sql).get(...this.values); }
  async all(){ return {results:this.database.prepare(this.sql).all(...this.values).map(row=>({...row}))}; }
  async run(){
    const result=this.database.prepare(this.sql).run(...this.values);
    return {meta:{changes:Number(result.changes)}};
  }
}

class D1{
  constructor(database){ this.database=database; }
  prepare(sql){ return new Statement(this.database,sql); }
}

test('sign out removes only the current device session',async()=>{
  const accounts=new DatabaseSync(':memory:');
  accounts.exec('PRAGMA foreign_keys=ON');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  const now=Math.floor(Date.now()/1000);
  const currentToken='current-device-token';
  const otherToken='other-device-token';
  accounts.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','buyer@example.com',now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)')
    .run('challenge_1','buyer@example.com','challenge_hash_1',now,now+900,now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)')
    .run('challenge_2','buyer@example.com','challenge_hash_2',now,now+900,now);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)')
    .run('session_1','user_1','challenge_1',await sha256Hex(currentToken),now,now+3600);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)')
    .run('session_2','user_1','challenge_2',await sha256Hex(otherToken),now,now+3600);
  accounts.prepare('INSERT INTO account_data (user_id,snapshot,revision,updated_epoch) VALUES (?,?,?,?)')
    .run('user_1',JSON.stringify({version:1,data:{pickyRecipesV2:[]}}),1,now);

  const response=await onRequestPost({
    request:new Request('https://foodmyway.app/api/auth/session',{method:'POST',headers:{cookie:sessionCookie(currentToken)}}),
    env:{ACCOUNTS:new D1(accounts)}
  });

  assert.equal(response.status,200);
  assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
  assert.deepEqual(accounts.prepare('SELECT id FROM sessions ORDER BY id').all().map(row=>({...row})),[{id:'session_2'}]);
  assert.equal(accounts.prepare('SELECT COUNT(*) AS count FROM users').get().count,1);
  assert.equal(accounts.prepare('SELECT COUNT(*) AS count FROM login_challenges').get().count,2);
  assert.equal(accounts.prepare('SELECT COUNT(*) AS count FROM account_data').get().count,1);

  accounts.close();
});

test('an entitlement outage keeps the customer signed in',async()=>{
  const accounts=new DatabaseSync(':memory:');
  accounts.exec('PRAGMA foreign_keys=ON');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  const now=Math.floor(Date.now()/1000);
  const token='membership-outage-token';
  accounts.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','buyer@example.com',now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)')
    .run('challenge_1','buyer@example.com','challenge_hash',now,now+900,now);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)')
    .run('session_1','user_1','challenge_1',await sha256Hex(token),now,now+3600);
  const unavailablePurchases={prepare(){ throw new Error('database unavailable'); }};

  const response=await onRequestGet({
    request:new Request('https://foodmyway.app/api/auth/session',{headers:{cookie:sessionCookie(token)}}),
    env:{ACCOUNTS:new D1(accounts),PURCHASES:unavailablePurchases}
  });

  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{
    authenticated:true,
    email:'buyer@example.com',
    entitlement:null,
    entitlementUnavailable:true
  });
  assert.equal(accounts.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,1);

  accounts.close();
});

test('account storage outage does not falsely sign out the browser',async()=>{
  const token='outage-session-token';
  const unavailableAccounts={prepare(){ throw new Error('unavailable'); }};
  const request=new Request('https://foodmyway.app/api/auth/session',{method:'POST',headers:{cookie:sessionCookie(token)}});

  const response=await onRequestPost({request,env:{ACCOUNTS:unavailableAccounts}});
  assert.equal(response.status,503);
  assert.equal(response.headers.get('set-cookie'),null);
  assert.deepEqual(await response.json(),{error:'Sign-out is temporarily unavailable. Your session is still active.'});

  const status=await onRequestGet({
    request:new Request('https://foodmyway.app/api/auth/session',{headers:{cookie:sessionCookie(token)}}),
    env:{ACCOUNTS:unavailableAccounts}
  });
  assert.equal(status.status,503);
  assert.deepEqual(await status.json(),{error:'Cloud accounts are temporarily unavailable.'});
});

test('Founding access remains the legacy primary entitlement when a buyer also owns the Survival Kit',async()=>{
  const accounts=new DatabaseSync(':memory:');
  accounts.exec(await readFile(path.join(root,'migrations/0004_cloud_accounts.sql'),'utf8'));
  const purchases=new DatabaseSync(':memory:');
  purchases.exec(await readFile(path.join(root,'migrations/0002_purchase_entitlements.sql'),'utf8'));
  purchases.exec(await readFile(path.join(root,'migrations/0007_survival_kit_entitlement.sql'),'utf8'));
  const now=Math.floor(Date.now()/1000);
  const token='dual-entitlement-token';
  accounts.prepare('INSERT INTO users (id,email,created_epoch) VALUES (?,?,?)').run('user_1','buyer@example.com',now);
  accounts.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch,used_epoch) VALUES (?,?,?,?,?,?)').run('challenge_1','buyer@example.com','hash',now,now+900,now);
  accounts.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?,?,?,?,?,?)').run('session_1','user_1','challenge_1',await sha256Hex(token),now,now+3600);
  const insert=purchases.prepare('INSERT INTO entitlements (email,plan,status,stripe_session_id,amount,currency,stripe_event_created,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  insert.run('buyer@example.com','founding','active','cs_founder',2900,'usd',now-10,'2026-09-29','2026-09-29');
  insert.run('buyer@example.com','survival_kit','active','cs_kit',1900,'usd',now,'2026-09-30','2026-09-30');
  const response=await onRequestGet({request:new Request('https://foodmyway.app/api/auth/session',{headers:{cookie:sessionCookie(token)}}),env:{ACCOUNTS:new D1(accounts),PURCHASES:new D1(purchases)}});
  const body=await response.json();
  assert.deepEqual(body.entitlement,{plan:'founding',status:'active'});
  assert.deepEqual(body.entitlements,[{plan:'survival_kit',status:'active'},{plan:'founding',status:'active'}]);
  accounts.close();purchases.close();
});
