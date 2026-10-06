import { currentAccount } from '../_shared/account.mjs';
import { hasDigitalKitAccess } from '../_shared/survival-kit-access.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export async function onRequestGet({request,env}){
  if(!env.ACCOUNTS || !env.PURCHASES || !env.KIT_FILES) return json({error:'Kit delivery is not configured.'},503);
  let account;
  try{ account=await currentAccount(request,env.ACCOUNTS); }
  catch{ return json({error:'Account verification is temporarily unavailable.'},503); }
  if(!account) return json({error:'Sign in with the email used at checkout.'},401);
  let entitlements=[];
  try{
    const result=await env.PURCHASES.prepare("SELECT plan,status FROM entitlements WHERE email=?1 AND status='active'").bind(account.email).all();
    entitlements=(result?.results || []).map(row=>({plan:row.plan,status:row.status}));
  }catch{ return json({error:'Purchase verification is temporarily unavailable.'},503); }
  if(!hasDigitalKitAccess({authenticated:true,entitlements})) return json({error:'No active Survival Kit or Founding Membership access was found for this email.'},403);
  let object;
  try{ object=await env.KIT_FILES.get('FoodMyWay-Picky-Eater-Survival-Kit.pdf'); }
  catch{ return json({error:'The download is temporarily unavailable.'},503); }
  if(!object) return json({error:'The download is temporarily unavailable.'},503);
  return new Response(object.body,{headers:{
    'content-type':'application/pdf',
    'content-disposition':'attachment; filename="FoodMyWay-Picky-Eater-Survival-Kit.pdf"',
    'cache-control':'private, no-store',
    'x-content-type-options':'nosniff'
  }});
}

export function onRequestPost(){ return json({error:'Method not allowed.'},405); }
