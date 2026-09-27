import { clearSessionCookie, currentAccount } from '../../_shared/account.mjs';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});

export async function onRequestGet({request,env}){
  if(!env.ACCOUNTS) return json({authenticated:false,configured:false});
  const account=await currentAccount(request,env.ACCOUNTS);
  return json(account ? {authenticated:true,email:account.email} : {authenticated:false,configured:true});
}

export async function onRequestPost({request,env}){
  if(env.ACCOUNTS){
    const account=await currentAccount(request,env.ACCOUNTS);
    if(account) await env.ACCOUNTS.prepare('DELETE FROM sessions WHERE id=?1').bind(account.session_id).run();
  }
  return json({ok:true},200,{'set-cookie':clearSessionCookie()});
}
