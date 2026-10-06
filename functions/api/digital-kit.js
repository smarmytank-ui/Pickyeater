import { currentAccount } from '../_shared/account.mjs';
import { digitalKitPlan, hasDigitalKitAccess } from '../_shared/survival-kit-access.mjs';
import { SURVIVAL_KIT_CONTENT } from '../_shared/survival-kit-content.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-robots-tag':'noindex'}});

export async function onRequestGet({request,env}){
  if(!env.ACCOUNTS || !env.PURCHASES) return json({error:'Digital Kit access is temporarily unavailable.'},503);
  let account;
  try{ account=await currentAccount(request,env.ACCOUNTS); }
  catch{ return json({error:'Cloud accounts are temporarily unavailable.'},503); }
  if(!account) return json({error:'Sign in to open your Digital Survival Kit.'},401);
  let entitlements=[];
  try{
    const result=await env.PURCHASES.prepare("SELECT plan,status FROM entitlements WHERE email=?1 AND status='active' ORDER BY updated_at DESC").bind(account.email).all();
    entitlements=(result?.results || []).map(row=>({plan:row.plan,status:row.status}));
  }catch{ return json({error:'Purchase verification is temporarily unavailable.'},503); }
  if(!hasDigitalKitAccess({authenticated:true,entitlements})) return json({error:'The Digital Survival Kit requires a Survival Kit purchase or active Founding Membership.'},403);
  return json({access:{plan:digitalKitPlan(entitlements)},content:SURVIVAL_KIT_CONTENT});
}
