import { clearSessionCookie, currentAccount } from '../../_shared/account.mjs';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});

export async function onRequestGet({request,env}){
  if(!env.ACCOUNTS) return json({authenticated:false,configured:false});
  let account;
  try{ account=await currentAccount(request,env.ACCOUNTS); }
  catch{ return json({error:'Cloud accounts are temporarily unavailable.'},503); }
  if(!account) return json({authenticated:false,configured:true});
  let entitlement=null;
  let entitlements=[];
  let entitlementUnavailable=false;
  if(env.PURCHASES){
    try{
      const result=await env.PURCHASES.prepare("SELECT plan,status FROM entitlements WHERE email=?1 AND status='active' ORDER BY updated_at DESC")
        .bind(account.email).all();
      entitlements=(result?.results || []).map(row=>({plan:row.plan,status:row.status}));
      entitlement=entitlements.find(item=>item.plan==='founding') || entitlements[0] || null;
    }catch{ entitlementUnavailable=true; }
  }
  const body={authenticated:true,email:account.email,entitlement,entitlementUnavailable};
  if(!entitlementUnavailable) body.entitlements=entitlements;
  return json(body);
}

export async function onRequestPost({request,env}){
  if(env.ACCOUNTS){
    let account;
    try{
      account=await currentAccount(request,env.ACCOUNTS);
      if(account) await env.ACCOUNTS.prepare('DELETE FROM sessions WHERE id=?1').bind(account.session_id).run();
    }catch{ return json({error:'Sign-out is temporarily unavailable. Your session is still active.'},503); }
  }
  return json({ok:true},200,{'set-cookie':clearSessionCookie()});
}
