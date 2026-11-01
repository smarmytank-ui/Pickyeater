import {validClickId} from '../../tracking/click-id.mjs';
import {sha256Hex,normalizeAccountEmail} from './account.mjs';
export const PIXEL_ID='DBJA0E3C77U7TR2UDESG',POLICY='fmw-tiktok-v1';
export const actorKey=id=>sha256Hex('fmw:ad-consent:actor:v1:'+id);
// Internal negative-list key only. Never return this hash or share with providers.
export async function exclusionEmailKey(email){try{if(typeof email!=='string')return null;return await sha256Hex('fmw:ad-exclusion:email:v1:'+normalizeAccountEmail(email));}catch{return null;}}
export const purchaseEventId=id=>sha256Hex('fmw:tiktok:purchase:v1:'+id).then(hash=>'fmw_'+hash);
export const enabled=env=>env?.FMW_AD_ENABLED==='true'&&env.FMW_AD_PIXEL_ID===PIXEL_ID;
function reviewedEmailKeys(env){try{const keys=JSON.parse(env.FMW_AD_EXCLUDED_EMAIL_HASHES_JSON);return env.FMW_AD_EMAIL_EXCLUSIONS_REVIEWED==='true'&&Array.isArray(keys)&&(keys.length===2||keys.length===3)&&new Set(keys).size===keys.length&&keys.every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x))?keys:null;}catch{return null;}}
// Functional owner-only diagnostic; never returns identity/configuration values,
// grants consent, reads purchase/measurement storage, or authorizes tracking.
export async function ownerExclusionStatus({env,account}){const keys=reviewedEmailKeys(env),key=await exclusionEmailKey(account?.email);if(!keys||!key)return {state:'unavailable'};return {state:keys.includes(key)?'owner-excluded':'not-authorized'};}
function eligibility(env,actor,emailKey,paymentId){try{const excluded=JSON.parse(env.FMW_AD_EXCLUDED_ACTORS_JSON),payments=JSON.parse(env.FMW_AD_EXCLUDED_PAYMENTS_JSON),emails=reviewedEmailKeys(env),start=Number(env.FMW_AD_START_MS),revision=env.FMW_AD_ELIGIBILITY_REVISION;
 if(env.FMW_AD_EXCLUSIONS_REVIEWED!=='true'||!Number.isSafeInteger(start)||start<=0||!/^[A-Za-z0-9_-]{1,80}$/.test(revision||'')||!Array.isArray(excluded)||!Array.isArray(payments)||excluded.some(x=>typeof x!=='string'||!/^[a-f0-9]{64}$/.test(x))||payments.some(x=>typeof x!=='string'||!/^pi_[A-Za-z0-9_]+$/.test(x)))return null;
 if(!emailKey||!emails)return null;
 if(emails.includes(emailKey)||excluded.includes(actor)||(paymentId&&payments.includes(paymentId)))return null;return {start,revision};
 }catch{return null;}}
async function legacyFences(db){return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tiktok_purchase_outbox','tiktok_delivery_receipts') LIMIT 1").first();}
export async function grantConsent({db,account,offer,requestId,ttclid=null,env,now=Date.now()}){
 if(!enabled(env))return {state:'disabled'};const actor=await actorKey(account.user_id),emailKey=await exclusionEmailKey(account.email),policy=eligibility(env,actor,emailKey);if(!policy||await legacyFences(db))return {state:'ineligible-or-legacy-fenced'};
 if((ttclid!==null&&!validClickId(ttclid))||!['survival_kit','founding'].includes(offer)||!/^[a-f0-9-]{36}$/.test(requestId||'')||!Number.isSafeInteger(now)||now<policy.start)return {state:'invalid'};
 await db.prepare('INSERT OR IGNORE INTO ad_consents(id,request_id,actor_key,offer,policy_version,granted_at,expires_at,revoked_at,ttclid) VALUES(?1,?2,?3,?4,?5,?6,?7,NULL,?8)').bind(crypto.randomUUID(),requestId,actor,offer,POLICY,now,now+3600000,ttclid).run();
 const c=await db.prepare('SELECT id,offer,policy_version,expires_at,revoked_at,ttclid FROM ad_consents WHERE request_id=?1 AND actor_key=?2 AND redacted_at IS NULL').bind(requestId,actor).first();
 return c&&c.ttclid===ttclid&&c.offer===offer&&c.policy_version===POLICY&&c.expires_at>now&&c.revoked_at===null?{state:'granted',consentId:c.id,expiresAt:c.expires_at}:{state:'refused'};
}
export async function withdrawConsent({db,account,consentId,now=Date.now()}){const result=await db.prepare('UPDATE ad_consents SET revoked_at=COALESCE(revoked_at,?3) WHERE id=?1 AND actor_key=?2 AND redacted_at IS NULL').bind(consentId,await actorKey(account.user_id),now).run();return {state:result.meta?.changes===1?'withdrawn':'not-owned'};}
export async function claimReceipt({db,account,consentId,env,now=Date.now()}){
 if(!enabled(env))return {state:'disabled'};const actor=await actorKey(account.user_id),emailKey=await exclusionEmailKey(account.email);if(!eligibility(env,actor,emailKey))return {state:'not-paid-or-ineligible'};if(await legacyFences(db))return {state:'legacy-fenced'};
 const c=await db.prepare('SELECT * FROM ad_consents WHERE id=?1 AND actor_key=?2 AND redacted_at IS NULL').bind(consentId,actor).first();
 if(!c||c.policy_version!==POLICY||c.revoked_at!==null||!Number.isSafeInteger(now)||c.granted_at>now||c.expires_at<=now)return {state:'not-consented'};
 // Entitlement proves exact account ownership, not a sale on its own. Every
 // payment fact below comes from the signed webhook's immutable paid_orders.
 const p=await db.prepare("SELECT p.* FROM paid_orders p JOIN entitlements e ON e.stripe_session_id=p.stripe_session_id AND e.stripe_payment_intent_id=p.stripe_payment_intent_id AND e.plan=p.plan AND e.amount=p.amount AND e.currency=p.currency WHERE e.email=?1 AND e.status='active' AND p.plan=?2 AND p.status='paid' AND p.payment_mode='live' ORDER BY p.stripe_event_created DESC LIMIT 1").bind(account.email,c.offer).first();
 const policy=eligibility(env,actor,emailKey,p?.stripe_payment_intent_id);
 if(!p||!policy||p.currency!=='usd'||!Number.isSafeInteger(p.amount)||p.amount<(p.plan==='survival_kit'?1900:2900)||!/^pi_[A-Za-z0-9_]+$/.test(p.stripe_payment_intent_id)||!Number.isInteger(p.stripe_event_created)||p.stripe_event_created*1000<c.granted_at||p.stripe_event_created*1000<policy.start||p.stripe_event_created*1000>now)return {state:'not-paid-or-ineligible'};
 const eventId=await purchaseEventId(p.stripe_payment_intent_id);
 const result=await db.prepare("INSERT OR IGNORE INTO ad_purchase_attempts(event_id,stripe_session_id,consent_id,actor_key,state,eligibility_revision,created_at) SELECT ?1,?2,?3,?4,'uncertain',?5,?6 WHERE EXISTS(SELECT 1 FROM ad_consents c JOIN entitlements e ON e.email=?7 JOIN paid_orders p ON p.stripe_session_id=e.stripe_session_id AND p.stripe_payment_intent_id=e.stripe_payment_intent_id AND p.plan=e.plan AND p.amount=e.amount AND p.currency=e.currency WHERE c.id=?3 AND c.actor_key=?4 AND c.offer=p.plan AND c.policy_version=?8 AND c.revoked_at IS NULL AND c.redacted_at IS NULL AND c.granted_at<=p.stripe_event_created*1000 AND c.granted_at<=?6 AND c.expires_at>?6 AND p.stripe_session_id=?2 AND p.stripe_payment_intent_id=?9 AND p.plan=?10 AND p.amount=?11 AND p.currency='usd' AND p.stripe_event_created=?12 AND p.stripe_event_created*1000>=?13 AND p.stripe_event_created*1000<=?6 AND p.status='paid' AND p.payment_mode='live' AND e.status='active')").bind(eventId,p.stripe_session_id,consentId,actor,policy.revision,now,account.email,POLICY,p.stripe_payment_intent_id,p.plan,p.amount,p.stripe_event_created,policy.start).run();
 if(result.meta?.changes!==1)return {state:'fenced-or-changed'};
 return {state:'dispatch-reserved',payload:{event:'Purchase',event_id:eventId,event_time:p.stripe_event_created,properties:{content_ids:[p.plan],content_type:'product',currency:'USD',value:p.amount/100}}};
}
export async function acknowledgeEnqueue({db,account,consentId,eventId,now=Date.now()}){const result=await db.prepare("UPDATE ad_purchase_attempts SET state='sdk_enqueued',enqueued_at=?4 WHERE event_id=?1 AND consent_id=?2 AND actor_key=?3 AND state='uncertain'").bind(eventId,consentId,await actorKey(account.user_id),now).run();return {recorded:result.meta?.changes===1,deliveryVerified:false};}
// Read-only gate for EACH new SDK load: never grants consent or reserves a sale.
export async function validateConsent({db,account,consentId,env,now=Date.now()}){
 if(!enabled(env))return {state:'disabled'};const actor=await actorKey(account.user_id),emailKey=await exclusionEmailKey(account.email),policy=eligibility(env,actor,emailKey);if(!policy||await legacyFences(db))return {state:'not-authorized'};
 const c=await db.prepare('SELECT id,policy_version,granted_at,expires_at,revoked_at,ttclid FROM ad_consents WHERE id=?1 AND actor_key=?2 AND redacted_at IS NULL').bind(consentId,actor).first();
 if(!c||c.policy_version!==POLICY||c.revoked_at!==null||!Number.isSafeInteger(now)||c.granted_at<policy.start||c.granted_at>now||c.expires_at<=now)return {state:'not-authorized'};
 return {state:'sdk-authorized',consentId:c.id,pixelId:PIXEL_ID,policyVersion:POLICY,expiresAt:c.expires_at,ttclid:c.ttclid};
}
