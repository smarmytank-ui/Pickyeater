import { currentAccount } from './account.mjs';
import { hasDigitalKitAccess } from './survival-kit-access.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export const APPROVED_KIT_PDF_SHA256='0520c57dfe01588f27cc0d0913f292fefbccff9fa324cbf80b15c6acdfe3be68';
const correctedPdfUnavailable=request=>{
 if(request.headers.get('accept')?.includes('text/html')) return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF update | Food My Way</title><main><h1>Your corrected PDF is being prepared</h1><p>The printable Kit is temporarily unavailable while we verify the corrected file. Your digital Kit remains available.</p><p><a href="/digital-kit.html">Open your digital Kit</a> or <a href="/survival-kit.html#access">try the download again</a>.</p><p>Need help? <a href="mailto:support@foodmyway.app">Contact Food My Way support</a>.</p></main></html>',{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','retry-after':'300','x-content-type-options':'nosniff'}});
 return json({
  error:'The corrected printable PDF is temporarily unavailable. Your digital Kit is still available at /digital-kit.html. Please try downloading again shortly.',
  digitalKitUrl:'/digital-kit.html'
},503);
};

export async function verifyKitPdf(body,approvedHash=APPROVED_KIT_PDF_SHA256){
  const bytes=await new Response(body).arrayBuffer();
  if(bytes.byteLength<5 || bytes.byteLength>2_000_000) return null;
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-') return null;
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  return hash===approvedHash ? bytes : null;
}

// The deployed handler uses the fixed reviewed hash. The factory's explicit
// hash parameter supports synthetic fixtures; no request or env can override it.
export function createKitDownloadHandler(approvedHash=APPROVED_KIT_PDF_SHA256){
 return async function({request,env}){
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
  let bytes;
  try{
    if(object.size>2_000_000) return correctedPdfUnavailable(request);
    bytes=await verifyKitPdf(object.body,approvedHash);
  }catch{ return correctedPdfUnavailable(request); }
  if(!bytes) return correctedPdfUnavailable(request);
  return new Response(bytes,{headers:{
    'content-type':'application/pdf',
    'content-disposition':'attachment; filename="FoodMyWay-Picky-Eater-Survival-Kit.pdf"',
    'cache-control':'private, no-store',
    'x-content-type-options':'nosniff',
    'x-kit-content-sha256':approvedHash
  }});
}


}
