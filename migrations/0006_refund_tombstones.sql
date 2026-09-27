CREATE TABLE IF NOT EXISTS refunded_payments (
  stripe_payment_intent_id TEXT PRIMARY KEY,
  stripe_event_created INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refunded_payments_event_created
  ON refunded_payments(stripe_event_created);
