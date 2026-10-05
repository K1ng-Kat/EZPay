CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  price_id TEXT REFERENCES prices(id) ON DELETE SET NULL,
  payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK(kind IN ('lifetime')),
  status TEXT NOT NULL CHECK(status IN ('active','revoked')),
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entitlements_hash ON entitlements(token_hash);
CREATE INDEX IF NOT EXISTS idx_entitlements_customer ON entitlements(customer_id);
