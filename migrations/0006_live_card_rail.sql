ALTER TABLE payments ADD COLUMN rail_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN rail_status TEXT;
ALTER TABLE payments ADD COLUMN card_brand TEXT;
ALTER TABLE payments ADD COLUMN card_last4 TEXT;

ALTER TABLE subscriptions ADD COLUMN rail_customer_vault_id TEXT;
ALTER TABLE subscriptions ADD COLUMN rail_initial_transaction_id TEXT;
ALTER TABLE subscriptions ADD COLUMN rail_provider TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_rail_transaction ON payments(rail_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rail_vault ON subscriptions(rail_customer_vault_id);
