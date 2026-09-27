import { clearSessionCookie, currentAccount, normalizeCloudSnapshot } from '../../_shared/account.mjs';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
async function requireAccount(request,env){
  if(!env.ACCOUNTS) return {error:json({error:'Cloud accounts are not configured.'},503)};
  const account=await currentAccount(request,env.ACCOUNTS);
  return account ? {account} : {error:json({error:'Sign in required.'},401)};
}

export async function onRequestGet({request,env}){
  const auth=await requireAccount(request,env); if(auth.error) return auth.error;
  const row=await env.ACCOUNTS.prepare('SELECT snapshot,revision,updated_epoch FROM account_data WHERE user_id=?1').bind(auth.account.user_id).first();
  return json({email:auth.account.email,snapshot:row ? JSON.parse(row.snapshot) : {version:1,data:{}},revision:row?.revision || null,updatedAt:row?.updated_epoch || null});
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
  const current=await env.ACCOUNTS.prepare('SELECT revision FROM account_data WHERE user_id=?1').bind(auth.account.user_id).first();
  const baseRevision=input?.baseRevision===null || input?.baseRevision===undefined ? null : Number(input.baseRevision);
  if(current){
    if(!Number.isInteger(baseRevision) || baseRevision!==current.revision) return json({error:'Cloud data changed on another device.',code:'SYNC_CONFLICT',revision:current.revision},409);
    const result=await env.ACCOUNTS.prepare('UPDATE account_data SET snapshot=?1,revision=revision+1,updated_epoch=?2 WHERE user_id=?3 AND revision=?4')
      .bind(normalized.serialized,now,auth.account.user_id,baseRevision).run();
    if(Number(result?.meta?.changes || 0)!==1) return json({error:'Cloud data changed on another device.',code:'SYNC_CONFLICT'},409);
    return json({ok:true,revision:baseRevision+1,updatedAt:now});
  }
  if(baseRevision!==null) return json({error:'Cloud data changed on another device.',code:'SYNC_CONFLICT'},409);
  try{
    await env.ACCOUNTS.prepare('INSERT INTO account_data (user_id,snapshot,revision,updated_epoch) VALUES (?1,?2,1,?3)')
      .bind(auth.account.user_id,normalized.serialized,now).run();
  }catch{ return json({error:'Cloud data changed on another device.',code:'SYNC_CONFLICT'},409); }
  return json({ok:true,revision:1,updatedAt:now});
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
  return json({ok:true},200,{'set-cookie':clearSessionCookie()});
}
