import { currentAccount, normalizeCloudSnapshot } from '../../_shared/account.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function requireAccount(request,env){
  if(!env.ACCOUNTS) return {error:json({error:'Cloud accounts are not configured.'},503)};
  const account=await currentAccount(request,env.ACCOUNTS);
  return account ? {account} : {error:json({error:'Sign in required.'},401)};
}

export async function onRequestGet({request,env}){
  const auth=await requireAccount(request,env); if(auth.error) return auth.error;
  const row=await env.ACCOUNTS.prepare('SELECT snapshot,updated_epoch FROM account_data WHERE user_id=?1').bind(auth.account.user_id).first();
  return json({email:auth.account.email,snapshot:row ? JSON.parse(row.snapshot) : {version:1,data:{}},updatedAt:row?.updated_epoch || null});
}

export async function onRequestPut({request,env}){
  const auth=await requireAccount(request,env); if(auth.error) return auth.error;
  const length=Number(request.headers.get('content-length') || 0);
  if(length>300_000) return json({error:'Sync data is too large.'},413);
  let input;
  try{ input=await request.json(); }catch{ return json({error:'Invalid JSON request.'},400); }
  let normalized;
  try{ normalized=normalizeCloudSnapshot(input); }catch(error){ return json({error:error.message},400); }
  const now=Math.floor(Date.now()/1000);
  await env.ACCOUNTS.prepare(`INSERT INTO account_data (user_id,snapshot,updated_epoch) VALUES (?1,?2,?3)
    ON CONFLICT(user_id) DO UPDATE SET snapshot=excluded.snapshot,updated_epoch=excluded.updated_epoch`)
    .bind(auth.account.user_id,normalized.serialized,now).run();
  return json({ok:true,updatedAt:now});
}

export async function onRequestDelete({request,env}){
  const auth=await requireAccount(request,env); if(auth.error) return auth.error;
  if(request.headers.get('x-confirm-delete')!=='DELETE') return json({error:'Deletion confirmation required.'},400);
  await env.ACCOUNTS.batch([
    env.ACCOUNTS.prepare('DELETE FROM account_data WHERE user_id=?1').bind(auth.account.user_id),
    env.ACCOUNTS.prepare('DELETE FROM sessions WHERE user_id=?1').bind(auth.account.user_id),
    env.ACCOUNTS.prepare('DELETE FROM login_challenges WHERE email=?1').bind(auth.account.email),
    env.ACCOUNTS.prepare('DELETE FROM users WHERE id=?1').bind(auth.account.user_id)
  ]);
  return json({ok:true});
}
