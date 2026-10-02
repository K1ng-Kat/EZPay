# EZPay

EZPay is an independent payments-platform project. The goal is to build a Stripe-style control plane and API around EZPay's own payment-intent model, ledger, risk engine, settlement adapters, disputes, billing, payouts, wallet adapters, and developer tooling.

EZPay is **not a Stripe wrapper**.

## Current state

The repository currently contains:

- A detailed dashboard and operator console
- Owner-only signed dashboard sessions
- EZPay-native `PaymentIntent` objects and sandbox API
- Payment-method / rail adapter registry
- Payments, balances, payouts, customers, products, subscriptions, invoices, payment links, disputes, risk, ledger, reports, developer tools, API keys, webhooks, and security surfaces
- A sandbox checkout that intentionally does **not** collect raw card/bank credentials
- A static GitHub Pages build on the `gh-pages` branch
- Bank connection explicitly unsupported

## Important architecture boundary

A real direct payments platform cannot safely become a production card/bank processor using only frontend code or GitHub Pages.

Production support for card networks, Apple Pay, Google Pay, Amazon Pay, Cash App Pay, ACH, PayPal, bank redirects, BNPL, or other methods requires the relevant commercial/technical access, such as:

- acquiring / acquiring-processor connectivity
- sponsor-bank or ODFI relationships for ACH
- wallet merchant onboarding and credentials
- card-network and dispute-rule compliance
- PCI DSS controls and a properly scoped card-data environment
- KMS/HSM-backed encryption and tokenization
- settlement, reconciliation, reserves, fraud controls, monitoring, and incident response

The codebase therefore keeps payment rails behind EZPay-owned adapters instead of pretending unsupported rails are already live.

## Local development

```bash
npm install
npm run dev
```

Open:

- `/login` — private EZPay operator dashboard
- `/checkout` — sandbox checkout prototype
- `POST /api/v1/payments` — authenticated EZPay sandbox PaymentIntent API

## Environment

```bash
EZPAY_OWNER_PASSWORD=
EZPAY_SESSION_SECRET=
EZPAY_API_SECRET=
EZPAY_WEBHOOK_SIGNING_SECRET=
EZPAY_TOKENIZATION_MASTER_KEY_ID=
EZPAY_ENVIRONMENT=sandbox
```

Never commit production secrets.

## GitHub Pages

The static public site is stored on the `gh-pages` branch and contains no production secrets or credential-collection code.

Configure the Pages publishing source to:

- Branch: `gh-pages`
- Folder: `/ (root)`

The expected project URL is:

`https://k1ng-kat.github.io/EZPay/`

## Security direction

Before any real-money launch, EZPay should add:

- passkeys/MFA for operators
- database-backed immutable audit/event storage
- append-only double-entry ledger persistence
- secret rotation and HSM/KMS-backed key management
- infrastructure WAF/rate limiting/DDoS protection
- idempotency persistence
- signed webhooks with replay protection
- PCI DSS design and validation
- compliant card/token vault or certified hosted fields
- risk/fraud controls and manual review tooling
- reconciliation against external settlement files
- backups, incident response, monitoring, and alerting
