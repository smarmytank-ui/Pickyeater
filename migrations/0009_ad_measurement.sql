-- Exactly two additive tables. NOT APPLIED. Separate release/recovery approval required.
CREATE TABLE ad_consents (
 id TEXT PRIMARY KEY NOT NULL, request_id TEXT, actor_key TEXT,
 offer TEXT CHECK(offer IN ('survival_kit','founding')),
 policy_version TEXT, granted_at INTEGER, expires_at INTEGER,
 revoked_at INTEGER, ttclid TEXT, redacted_at INTEGER,
 UNIQUE(actor_key,request_id),
 CHECK(redacted_at IS NULL AND request_id IS NOT NULL AND actor_key IS NOT NULL AND offer IS NOT NULL AND policy_version IS NOT NULL AND granted_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at>granted_at)
);
CREATE TABLE ad_purchase_attempts (
 event_id TEXT PRIMARY KEY NOT NULL CHECK(length(event_id)=68 AND substr(event_id,1,4)='fmw_' AND substr(event_id,5) NOT GLOB '*[^a-f0-9]*'), stripe_session_id TEXT UNIQUE,
 consent_id TEXT UNIQUE REFERENCES ad_consents(id), actor_key TEXT,
 state TEXT NOT NULL CHECK(state IN ('uncertain','sdk_enqueued')),
 eligibility_revision TEXT, created_at INTEGER, enqueued_at INTEGER,
 CHECK((created_at IS NOT NULL AND stripe_session_id IS NOT NULL AND consent_id IS NOT NULL AND actor_key IS NOT NULL AND eligibility_revision IS NOT NULL)
 OR (created_at IS NULL AND stripe_session_id IS NULL AND consent_id IS NULL AND actor_key IS NULL AND eligibility_revision IS NULL AND enqueued_at IS NULL))
);
-- A detail row can only become an unlinkable tombstone once old enough by the
-- database's current clock. No caller-supplied cutoff, partial erase or restore.
CREATE TRIGGER ad_consent_immutable BEFORE UPDATE OF id,request_id,actor_key,offer,policy_version,granted_at,expires_at,ttclid,redacted_at ON ad_consents
 BEGIN SELECT RAISE(ABORT,'Immutable consent grant'); END;
CREATE TRIGGER ad_consent_revocation_permanent BEFORE UPDATE OF revoked_at ON ad_consents
 WHEN (OLD.redacted_at IS NOT NULL AND NEW.revoked_at IS NOT OLD.revoked_at)
 OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NOT OLD.revoked_at AND NEW.redacted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'Consent cannot be restored'); END;
CREATE TRIGGER ad_consent_keep_history BEFORE DELETE ON ad_consents
 WHEN NOT COALESCE(((OLD.redacted_at IS NULL AND OLD.granted_at<=(unixepoch()*1000-2592000000) AND OLD.expires_at<=unixepoch()*1000)
 AND NOT EXISTS(SELECT 1 FROM ad_purchase_attempts a WHERE a.consent_id=OLD.id)),0)
 BEGIN SELECT RAISE(ABORT,'Consent history retained until expired 30-day boundary and unlink'); END;
CREATE TRIGGER ad_attempt_immutable BEFORE UPDATE OF event_id,stripe_session_id,consent_id,actor_key,eligibility_revision,created_at ON ad_purchase_attempts
 WHEN NOT COALESCE((NEW.event_id IS OLD.event_id AND NEW.state IS OLD.state AND OLD.created_at IS NOT NULL
 AND (OLD.created_at<=(unixepoch()*1000-2592000000) OR EXISTS(SELECT 1 FROM ad_consents c WHERE c.id=OLD.consent_id AND c.granted_at<=(unixepoch()*1000-2592000000)))
 AND NEW.stripe_session_id IS NULL AND NEW.consent_id IS NULL AND NEW.actor_key IS NULL AND NEW.eligibility_revision IS NULL AND NEW.created_at IS NULL AND NEW.enqueued_at IS NULL),0)
 BEGIN SELECT RAISE(ABORT,'Permanent purchase fence or unsafe retention boundary'); END;
CREATE TRIGGER ad_attempt_monotonic BEFORE UPDATE OF state ON ad_purchase_attempts WHEN NOT COALESCE((OLD.created_at IS NOT NULL AND OLD.state='uncertain' AND NEW.state='sdk_enqueued'),0) BEGIN SELECT RAISE(ABORT,'No dispatch replay'); END;
CREATE TRIGGER ad_attempt_keep_fence BEFORE DELETE ON ad_purchase_attempts BEGIN SELECT RAISE(ABORT,'Permanent purchase fence'); END;
CREATE TRIGGER ad_attempt_ack_immutable BEFORE UPDATE OF enqueued_at ON ad_purchase_attempts
 WHEN (OLD.created_at IS NULL AND NEW.enqueued_at IS NOT OLD.enqueued_at)
 OR (OLD.enqueued_at IS NOT NULL AND NEW.enqueued_at IS NOT OLD.enqueued_at AND NEW.created_at IS NOT NULL)
 BEGIN SELECT RAISE(ABORT,'Immutable enqueue acknowledgment'); END;
CREATE TRIGGER ad_consent_new_detail BEFORE INSERT ON ad_consents WHEN NEW.redacted_at IS NOT NULL BEGIN SELECT RAISE(ABORT,'New consent must contain fresh grant details'); END;
CREATE TRIGGER ad_attempt_new_detail BEFORE INSERT ON ad_purchase_attempts WHEN NEW.created_at IS NULL BEGIN SELECT RAISE(ABORT,'New attempt must contain immutable details'); END;

-- BEFORE INSERT also protects immutable rows from SQLite INSERT OR REPLACE,
-- whose implicit DELETE otherwise need not run DELETE triggers.
CREATE TRIGGER ad_consent_no_replace BEFORE INSERT ON ad_consents WHEN EXISTS(SELECT 1 FROM ad_consents WHERE id=NEW.id OR (actor_key=NEW.actor_key AND request_id=NEW.request_id)) BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER ad_attempt_no_replace BEFORE INSERT ON ad_purchase_attempts WHEN EXISTS(SELECT 1 FROM ad_purchase_attempts WHERE event_id=NEW.event_id OR stripe_session_id=NEW.stripe_session_id OR consent_id=NEW.consent_id) BEGIN SELECT RAISE(IGNORE); END;
