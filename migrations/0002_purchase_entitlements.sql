CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('founding')),
  status TEXT NOT NULL CHECK (status IN ('active','refunded','revoked')),
  stripe_customer_id TEXT,
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  stripe_event_created INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(email,plan),
  UNIQUE(stripe_session_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_customer ON entitlements(stripe_customer_id);
