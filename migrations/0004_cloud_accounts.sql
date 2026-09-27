CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_epoch INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_epoch INTEGER NOT NULL,
  expires_epoch INTEGER NOT NULL,
  used_epoch INTEGER
);

CREATE INDEX IF NOT EXISTS idx_login_challenges_email_created ON login_challenges(email,created_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_login_challenges_expiry ON login_challenges(expires_epoch);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL UNIQUE REFERENCES login_challenges(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_epoch INTEGER NOT NULL,
  expires_epoch INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_epoch);

CREATE TABLE IF NOT EXISTS account_data (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  snapshot TEXT NOT NULL,
  updated_epoch INTEGER NOT NULL
);
