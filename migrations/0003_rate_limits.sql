CREATE TABLE IF NOT EXISTS rate_limit_events (
  bucket TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_events(bucket,key_hash,created_at);
