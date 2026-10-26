-- Apply to PURCHASES before deploying the corresponding webhook code.
-- One row per verified Stripe checkout, separate from current email/plan access.
-- Existing entitlements are NOT backfilled as new sales: historical reconciliation
-- requires the original signed payment records and owner/test exclusions.
CREATE TABLE IF NOT EXISTS paid_orders (
  stripe_session_id TEXT PRIMARY KEY,
  stripe_payment_intent_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK(plan IN ('survival_kit','founding')),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  currency TEXT NOT NULL CHECK(currency = 'usd'),
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('live','test','unknown')),
  status TEXT NOT NULL CHECK(status IN ('paid','refunded')),
  campaign_source TEXT NOT NULL DEFAULT 'unknown',
  campaign_creative TEXT NOT NULL DEFAULT 'unknown',
  campaign_reference TEXT,
  stripe_event_created INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  refunded_at TEXT
);
CREATE INDEX IF NOT EXISTS paid_orders_payment_intent ON paid_orders(stripe_payment_intent_id);
