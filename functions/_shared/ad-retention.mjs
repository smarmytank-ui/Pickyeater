// Called only by the separately scoped retention operation. No request-time or
// paid-fulfillment invocation; no caller-supplied cutoff. The atomic batch first
// removes attempt details and then deletes expired/unlinked consent details.
export const DETAIL_RETENTION_MS=30*86400000;
export const RETENTION_REDACT_ATTEMPTS_SQL=`UPDATE ad_purchase_attempts SET stripe_session_id=NULL,consent_id=NULL,actor_key=NULL,eligibility_revision=NULL,created_at=NULL,enqueued_at=NULL WHERE created_at IS NOT NULL AND (created_at<=(unixepoch()*1000-2592000000) OR EXISTS(SELECT 1 FROM ad_consents c WHERE c.id=ad_purchase_attempts.consent_id AND c.granted_at<=(unixepoch()*1000-2592000000)))`;
export const RETENTION_DELETE_CONSENTS_SQL=`DELETE FROM ad_consents WHERE (redacted_at IS NULL AND granted_at<=(unixepoch()*1000-2592000000) AND expires_at<=unixepoch()*1000) AND NOT EXISTS(SELECT 1 FROM ad_purchase_attempts a WHERE a.consent_id=ad_consents.id)`;
export async function redactMeasurementDetails({db}){
 const results=await db.batch([db.prepare(RETENTION_REDACT_ATTEMPTS_SQL).bind(),db.prepare(RETENTION_DELETE_CONSENTS_SQL).bind()]);
 return {attemptsRedacted:results[0].meta?.changes??0,consentsDeleted:results[1].meta?.changes??0,permanentFencesRetained:true};
}
