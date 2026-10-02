# EZPay on Cloudflare Pages

EZPay is prepared for Cloudflare Pages with:

- static assets built into `public/`
- Pages Functions in `functions/`
- Cloudflare D1 persistence
- owner sessions stored in D1
- products, prices, payment pages, customers, payments, subscriptions and payouts
- entitlement verification for Aura
- signed outbound webhooks
- API key storage
- versioned D1 migrations

## Cloudflare Pages project

Create/import the GitHub repository `K1ng-Kat/EZPay` as a **Pages** project.

Use:

- Production branch: `cloudflare-pages`
- Build command: `npm run build`
- Build output directory: `public`
- Root directory: repository root

Pages Functions are discovered automatically from the root `functions/` directory.

## D1

Create one D1 database named:

`EZPAY_DB`

Bind it to the Pages project using variable name:

`DB`

Then apply the migrations in order:

`migrations/0001_init.sql`
`migrations/0002_api_keys.sql`\n`migrations/0003_rate_limits.sql`

With Wrangler authenticated, the equivalent command is:

```bash
npx wrangler d1 migrations apply EZPAY_DB --remote
```

## Required secrets / environment variables

Configure these as encrypted Pages environment variables:

```
EZPAY_OWNER_EMAIL=your-email@example.com
EZPAY_OWNER_PASSWORD=<long random password>
EZPAY_SESSION_HOURS=12
EZPAY_WEBHOOK_SIGNING_SECRET=<long random secret>
EZPAY_INTERNAL_JOB_SECRET=<long random secret>
```

Do not commit those values.

## Health check

After deployment:

`GET /api/health`

Expected:

```json
{
  "ok": true,
  "service": "EZPay",
  "runtime": "Cloudflare Pages Functions",
  "database": true
}
```

## Aura checkout

The seeded Aura page is available at:

`#/checkout/aura-pro`

The payment page itself is retrieved from:

`GET /api/public/pages/aura-pro`

Sandbox checkout is submitted to:

`POST /api/checkout/complete`

Successful recurring checkout returns a one-time entitlement token.

Aura can verify it with:

```http
POST /api/v1/entitlements/verify
Content-Type: application/json

{"token":"ent_..."}
```

## Renewals on Pages

Cloudflare Pages does not provide Cron Triggers. EZPay therefore supports both:

1. lazy sandbox renewal when Aura verifies an expired entitlement; and
2. `POST /api/internal/renewals` protected by `EZPAY_INTERNAL_JOB_SECRET`.

If you later allow one Cloudflare Worker alongside Pages, that Worker can invoke the renewal endpoint on a Cron Trigger. Cloudflare currently recommends Workers for new full-stack projects when scheduled work is required.

## Real payment rails

The backend/database/subscription platform is real. The bundled card flow remains sandbox-only and deliberately rejects real card numbers.

Actual Visa/Mastercard/Amex, Apple Pay, Google Pay, Amazon Pay, Cash App Pay, PayPal, ACH and other money-moving rails require the appropriate acquiring, sponsor-bank, wallet, processor, network, PCI and merchant credentials. Those credentials are not present in this repository.


## One-command bootstrap

If Cloudflare credentials are available in the shell, EZPay can create/find D1, generate the binding config, upload secrets, apply migrations, create the Pages project, build, and deploy:

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export EZPAY_OWNER_EMAIL=...
export EZPAY_OWNER_PASSWORD=...
export EZPAY_WEBHOOK_SIGNING_SECRET=...
export EZPAY_INTERNAL_JOB_SECRET=...

npm run deploy:cloudflare
```

The script is `scripts/bootstrap-cloudflare.sh`.
