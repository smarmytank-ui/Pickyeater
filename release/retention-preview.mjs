// HISTORICAL preview only; current actual local redaction is in functions/_shared/ad-retention.mjs.
﻿// READ-ONLY proposal model, NOT an application cleanup path. No I/O or SQL.
// Applying redaction requires a separately approved one-way migration; current
// immutable schema intentionally refuses destructive attempts.
export function retentionPreview({consents=[],attempts=[],now=Date.now(),detailDays=30}){
 if(!Number.isSafeInteger(detailDays)||detailDays<1||detailDays>90||!Number.isSafeInteger(now))throw Error('Bounded retention interval required');
 const cutoff=now-detailDays*86400000;
 return {detailDays,cutoff,destructiveExecutionImplemented:false,
  grantDetailsEligibleForReview:consents.filter(c=>c.expires_at<cutoff).map(c=>({consentId:c.id,action:'review-one-way-unlink-and-redact-after-approval'})),
  attempts:attempts.filter(a=>a.created_at<cutoff).map(a=>{if(!/^fmw_[a-f0-9]{64}$/.test(a.event_id)||!['uncertain','sdk_enqueued'].includes(a.state))throw Error('Invalid fence');return {retainForever:{event_id:a.event_id,state:a.state},redactAfterApproval:['stripe_session_id','consent_id','actor_key','eligibility_revision','created_at','enqueued_at']};})};
}
