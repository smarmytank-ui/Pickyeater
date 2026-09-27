CREATE TABLE IF NOT EXISTS founding_leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'founding-modal',
  consent INTEGER NOT NULL DEFAULT 1 CHECK (consent IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed'))
);

CREATE INDEX IF NOT EXISTS idx_founding_leads_created_at ON founding_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_founding_leads_status ON founding_leads(status);
