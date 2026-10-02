# EZPay

Private payment operations dashboard and checkout layer built with Next.js, TypeScript, Stripe Elements, and Stripe PaymentIntents.

## Implemented

- Owner-only signed dashboard sessions
- Payments, balances, payouts, customers, products, subscriptions, invoices, payment links, disputes, risk controls, reports, developer tools, API keys, webhooks, logs, and settings
- Dynamic Payment Element checkout
- Express Checkout Element for eligible wallets
- Cards, wallet methods, bank debit/redirect methods, BNPL, vouchers, and regional methods via provider eligibility
- Private server-to-server EZPay payment API
- Verified Stripe webhook endpoint
- Idempotency support
- Server-owned hosted-checkout pricing
- Same-origin protection for browser payment creation
- Hardened browser security headers
- Bank connection explicitly unsupported

## Environment variables

Copy `.env.example` to `.env.local` and configure:

```bash
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

EZPAY_OWNER_PASSWORD=
EZPAY_SESSION_SECRET=
EZPAY_API_SECRET=
```

Use long, randomly generated values for `EZPAY_SESSION_SECRET` and `EZPAY_API_SECRET`.

## Local development

```bash
npm install
npm run dev
```

Open `/login` for the private dashboard and `/checkout` for the public checkout.

## Payment methods

EZPay uses dynamic payment methods instead of hard-coding a promise that every method will appear. The configured processor decides which enabled methods are eligible for a specific account and transaction based on business location/category, customer location, currency, amount, browser, device, and method-specific restrictions.

Express Checkout can surface eligible express methods such as Apple Pay, Google Pay, Link, Amazon Pay, PayPal, and Klarna. The Payment Element can surface eligible cards, Cash App Pay, ACH/bank methods, BNPL, vouchers, and regional payment methods.

## Security model

Sensitive payment credentials are collected by provider-hosted Elements and are not posted to EZPay. Fulfillment must rely on verified webhook state, not only the browser success page.

For production, also use infrastructure-level rate limiting/WAF rules, persistent database-backed event/audit storage, secret rotation, backups, and MFA/passkeys for the owner account.

## Wallet domain registration

After deploying your checkout domain, register its hostname with Stripe so eligible web wallets can appear:

```bash
STRIPE_SECRET_KEY=sk_... npm run register:domain -- pay.example.com
```

For this Stripe Elements web integration, EZPay does not need a separate Apple API key in code. The deployed domain must be registered with Stripe for supported web payment methods such as Apple Pay, Google Pay, and Link.
