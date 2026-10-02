CREATE TABLE IF NOT EXISTS owner_credentials (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_salt_b64 TEXT NOT NULL,
  password_hash_b64 TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_secrets (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO owner_credentials (
  id,email,password_salt_b64,password_hash_b64,password_iterations,must_change_password,updated_at
) VALUES (
  'owner',
  'owner@ezpay.local',
  '2+TMY6vsfsfXy390wAHPQg==',
  'KtkyF4Cr4C07RG0iBOxoajRSe0hhOs4NjGAXCitYP/M=',
  210000,
  1,
  unixepoch()*1000
);
