ALTER TABLE founding_leads ADD COLUMN unsubscribe_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_founding_leads_unsubscribe_token ON founding_leads(unsubscribe_token);
