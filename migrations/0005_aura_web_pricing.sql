-- Align EZPay with Aura's direct-web pricing.
UPDATE prices
SET amount=249,currency='usd',interval='month',nickname='Monthly',active=1,updated_at=unixepoch()*1000
WHERE id='price_aura_monthly';

INSERT INTO prices (
  id,product_id,amount,currency,interval,nickname,active,created_at,updated_at
) VALUES (
  'price_aura_lifetime','prod_aura',1549,'usd','one_time','Lifetime',1,unixepoch()*1000,unixepoch()*1000
)
ON CONFLICT(id) DO UPDATE SET
  amount=excluded.amount,
  currency=excluded.currency,
  interval=excluded.interval,
  nickname=excluded.nickname,
  active=1,
  updated_at=excluded.updated_at;

UPDATE prices
SET active=0,updated_at=unixepoch()*1000
WHERE id='price_aura_annual';

UPDATE payment_pages
SET price_id='price_aura_monthly',
    headline='Get Aura Pro',
    description='Unlock Aura Pro directly from Aura with monthly or lifetime access.',
    button_text='Continue with EZPay',
    success_message='Payment complete. Return to Aura to activate Pro.',
    updated_at=unixepoch()*1000
WHERE id='page_aura_pro';
