import { buildInstacartListPayload, isAllowedInstacartUrl } from '../_shared/instacart.mjs';
import { currentAccount } from '../_shared/account.mjs';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestPost({request,env}){
  if(!env.INSTACART_API_KEY || !env.SHOP_LINKBACK_ORIGIN) return json({error:'Grocery checkout is not enabled yet.'},503);
  if(!env.ACCOUNTS || !env.PURCHASES) return json({error:'Grocery membership verification is not configured.'},503);
  let account;
  try{ account=await currentAccount(request,env.ACCOUNTS); }
  catch{ return json({error:'Cloud accounts are temporarily unavailable.'},503); }
  if(!account) return json({error:'Sign in required.'},401);
  let entitlement;
  try{
    entitlement=await env.PURCHASES.prepare("SELECT 1 AS allowed FROM entitlements WHERE email=?1 AND plan='founding' AND status='active' LIMIT 1")
      .bind(account.email).first();
  }catch{ return json({error:'Founding membership verification is temporarily unavailable.'},503); }
  if(!entitlement) return json({error:'Founding membership is required for grocery checkout.',code:'PREMIUM_REQUIRED'},403);
  const length=Number(request.headers.get('content-length') || 0);
  if(length>50000) return json({error:'Shopping list is too large.'},413);
  let input;
  try{ input=await request.json(); }catch{ return json({error:'Invalid JSON request.'},400); }
  let payload;
  let trustedLinkback;
  try{
    trustedLinkback=new URL(env.SHOP_LINKBACK_ORIGIN);
    if(trustedLinkback.protocol!=='https:') throw new Error('HTTPS required');
  }catch{ return json({error:'Grocery checkout is not configured correctly.'},503); }
  try{ payload=buildInstacartListPayload({...input,linkbackUrl:trustedLinkback.origin}); }catch(error){ return json({error:error.message},400); }
  const base=env.INSTACART_ENV==='production' ? 'https://connect.instacart.com' : 'https://connect.dev.instacart.tools';
  let response;
  try{
    response=await fetch(`${base}/idp/v1/products/products_link`,{
      method:'POST',
      headers:{'accept':'application/json','authorization':`Bearer ${env.INSTACART_API_KEY}`,'content-type':'application/json'},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(12000)
    });
  }catch{ return json({error:'The grocery service is temporarily unavailable.'},502); }
  const result=await response.json().catch(()=>({}));
  if(!response.ok) return json({error:'The grocery service could not create this list.'},502);
  const url=result.products_link_url;
  if(!isAllowedInstacartUrl(url)) return json({error:'The grocery service returned an invalid link.'},502);
  return json({url});
}

export async function onRequestGet(){
  return json({enabled:false,message:'Use POST after grocery checkout is enabled.'},405);
}
