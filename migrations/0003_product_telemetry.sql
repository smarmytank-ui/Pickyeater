CREATE TABLE IF NOT EXISTS product_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON product_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_name ON product_events(event_name,created_at DESC);

-- Run this periodically after launch; first-party event data should not be retained forever.
-- DELETE FROM product_events WHERE created_at < datetime('now','-90 days');
