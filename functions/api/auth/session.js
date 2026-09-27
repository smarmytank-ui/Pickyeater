import { clearSessionCookie, currentAccount } from '../../_shared/account.mjs';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});

export async function onRequestGet({request,env}){
  if(!env.ACCOUNTS) return json({authenticated:false,configured:false});
  const account=await currentAccount(request,env.ACCOUNTS);
  if(!account) return json({authenticated:false,configured:true});
  let entitlement=null;
  let entitlementUnavailable=false;
  if(env.PURCHASES){
    try{
      const row=await env.PURCHASES.prepare("SELECT plan,status FROM entitlements WHERE email=?1 AND status='active' ORDER BY updated_at DESC LIMIT 1")
        .bind(account.email).first();
      if(row) entitlement={plan:row.plan,status:row.status};
    }catch{ entitlementUnavailable=true; }
  }
  return json({authenticated:true,email:account.email,entitlement,entitlementUnavailable});
}

export async function onRequestPost({request,env}){
  if(env.ACCOUNTS){
    const account=await currentAccount(request,env.ACCOUNTS);
    if(account) await env.ACCOUNTS.prepare('DELETE FROM sessions WHERE id=?1').bind(account.session_id).run();
  }
  return json({ok:true},200,{'set-cookie':clearSessionCookie()});
}
