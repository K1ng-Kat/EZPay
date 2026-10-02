PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace_settings (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  accent TEXT NOT NULL,
  support_email TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK(amount >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  interval TEXT NOT NULL CHECK(interval IN ('month','year','week','one_time')),
  nickname TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prices_product ON prices(product_id);

CREATE TABLE IF NOT EXISTS payment_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  price_id TEXT NOT NULL REFERENCES prices(id) ON DELETE RESTRICT,
  headline TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL,
  accent TEXT NOT NULL DEFAULT '#635bff',
  button_text TEXT NOT NULL DEFAULT 'Subscribe',
  success_message TEXT NOT NULL DEFAULT 'You are all set.',
  collect_name INTEGER NOT NULL DEFAULT 1,
  collect_address INTEGER NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  logo_data TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_pages_slug ON payment_pages(slug);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  price_id TEXT REFERENCES prices(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT 'sandbox',
  failure_code TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  price_id TEXT NOT NULL REFERENCES prices(id) ON DELETE RESTRICT,
  payment_page_id TEXT REFERENCES payment_pages(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK(status IN ('trialing','active','past_due','canceled')),
  started_at INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  canceled_at INTEGER,
  entitlement_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions(current_period_end);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  destination TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  delivered_at INTEGER
);

INSERT OR IGNORE INTO workspace_settings (id,business_name,accent,support_email,updated_at)
VALUES ('workspace','EZPay','#635bff','support@example.com',unixepoch()*1000);

INSERT OR IGNORE INTO products (id,name,description,active,created_at,updated_at)
VALUES ('prod_aura','Aura Pro','Premium access to Aura, including advanced automation, experimental features, and Aura Studio.',1,unixepoch()*1000,unixepoch()*1000);

INSERT OR IGNORE INTO prices (id,product_id,amount,currency,interval,nickname,active,created_at,updated_at)
VALUES
('price_aura_monthly','prod_aura',1499,'usd','month','Monthly',1,unixepoch()*1000,unixepoch()*1000),
('price_aura_annual','prod_aura',14900,'usd','year','Annual',1,unixepoch()*1000,unixepoch()*1000);

INSERT OR IGNORE INTO payment_pages (
  id,slug,name,product_id,price_id,headline,description,brand,accent,button_text,success_message,
  collect_name,collect_address,trial_days,published,logo_data,created_at,updated_at
) VALUES (
  'page_aura_pro','aura-pro','Aura Pro','prod_aura','price_aura_annual','Upgrade to Aura Pro',
  'Unlock the full Aura experience with premium wallpaper automation, Aura Studio, experimental features, and more.',
  'Aura','#635bff','Subscribe to Aura Pro','Aura Pro is active. You can return to Aura and unlock your premium features.',
  1,0,0,1,'',unixepoch()*1000,unixepoch()*1000
);
