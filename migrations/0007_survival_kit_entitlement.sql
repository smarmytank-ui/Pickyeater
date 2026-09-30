PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

ALTER TABLE entitlements RENAME TO entitlements_before_survival_kit;

CREATE TABLE entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('founding','survival_kit')),
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

INSERT INTO entitlements SELECT * FROM entitlements_before_survival_kit;
DROP TABLE entitlements_before_survival_kit;
CREATE INDEX idx_entitlements_status ON entitlements(status);
CREATE INDEX idx_entitlements_customer ON entitlements(stripe_customer_id);

COMMIT;
PRAGMA foreign_keys=ON;
