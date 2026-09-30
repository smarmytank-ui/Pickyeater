const EXPECTED_TOKEN_HASH='ef4312e873cc567a8343c9ab88bed5a9534f0a28ca815a7d6aae460442816d73';
const MIGRATION=`PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
ALTER TABLE entitlements RENAME TO entitlements_before_survival_kit;
CREATE TABLE entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('founding','survival_kit')),
  status TEXT NOT NULL CHECK (status IN ('active','refunded','revoked')),
  stripe_customer_id TEXT,
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  stripe_event_created INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(email,plan),
  UNIQUE(stripe_session_id)
);
INSERT INTO entitlements SELECT * FROM entitlements_before_survival_kit;
DROP TABLE entitlements_before_survival_kit;
CREATE INDEX idx_entitlements_status ON entitlements(status);
CREATE INDEX idx_entitlements_customer ON entitlements(stripe_customer_id);
COMMIT;
PRAGMA foreign_keys=ON;`;

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function columns(database){
  const result=await database.prepare('PRAGMA table_info(entitlements)').all();
  return (result.results || []).map(column=>column.name);
}

export async function onRequestPost({request,env}){
  if(!env.PURCHASES) return json({error:'Purchases binding unavailable.'},503);
  const token=request.headers.get('x-kit-migrate-token') || '';
  if(!token || await sha256(token)!==EXPECTED_TOKEN_HASH) return json({error:'Unauthorized.'},401);
  let names=await columns(env.PURCHASES);
  if(!names.includes('plan')){
    await env.PURCHASES.exec(MIGRATION);
    names=await columns(env.PURCHASES);
  }
  if(!names.includes('plan')) return json({error:'Migration verification failed.'},503);
  return json({ok:true,planColumn:true});
}

export function onRequestGet(){ return json({error:'Method not allowed.'},405); }
