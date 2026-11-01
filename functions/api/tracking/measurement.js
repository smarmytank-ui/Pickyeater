import {currentAccount} from '../../_shared/account.mjs';
import {enabled,grantConsent,withdrawConsent,claimReceipt,acknowledgeEnqueue,validateConsent,ownerExclusionStatus} from '../../_shared/ad-measurement.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({state:'forbidden'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({state:'json-required'},415);
 if(Number(request.headers.get('content-length'))>4096)return json({state:'too-large'},413);
 const raw=await request.text();if(raw.length>4096)return json({state:'too-large'},413);let input;try{input=JSON.parse(raw);}catch{return json({state:'invalid'},400);}
 if(!input||typeof input!=='object'||Array.isArray(input))return json({state:'invalid'},400);
 const ownerStatus=input.action==='owner-exclusion-status';
 if(ownerStatus&&Object.keys(input).length!==1)return json({state:'invalid'},400);
 if(input.action!=='withdraw'&&!ownerStatus&&!enabled(env))return json({state:'disabled'},503);
 try{const account=env.ACCOUNTS&&await currentAccount(request,env.ACCOUNTS);if(!account)return json({state:'sign-in-required'},401);
 if(ownerStatus){const result=await ownerExclusionStatus({env,account});return new Response(JSON.stringify(result),{status:result.state==='owner-excluded'?200:result.state==='unavailable'?503:403,headers:{'content-type':'application/json','cache-control':'private, no-store','vary':'Cookie'}});}
 if(input.action==='withdraw')return json(await withdrawConsent({db:env.PURCHASES,account,consentId:input.consentId}));
 if(request.headers.get('sec-gpc')==='1'||request.headers.get('dnt')==='1'||input.gpc===true||input.dnt===true||input.choice!=='granted')return json({state:'refused'},403);
 const options={db:env.PURCHASES,account,env,consentId:input.consentId};
 if(input.action==='grant')return json(await grantConsent({...options,offer:input.offer,requestId:input.requestId,ttclid:input.ttclid??null}));
 if(input.action==='validate')return json(await validateConsent(options));
 if(input.action==='claim')return json(await claimReceipt(options));
 if(input.action==='enqueued')return json(await acknowledgeEnqueue({...options,eventId:input.eventId}));
 return json({state:'invalid'},400);
 }catch{return json({state:'unavailable-or-uncertain'},503);}
}
