# EZPay

EZPay is a private, owner-operated payment operating system for Aura.

It owns the application layer end to end:

- owner authentication
- products and prices
- hosted payment pages
- customers
- payments
- subscriptions
- entitlements
- refunds and payout records
- API keys
- signed webhooks
- audit logs
- risk controls
- ledger state
- Cloudflare Pages Functions + D1 persistence

## Architecture

EZPay is not a wrapper around another branded checkout product.

The EZPay frontend, APIs, dashboard, database model, payment-page builder, subscriptions, entitlement system, and webhook model are all EZPay-owned.

Real money movement is exposed through a provider-neutral **rail adapter**. That adapter is the boundary between EZPay and the regulated acquiring / banking / card-network infrastructure required to actually authorize, capture, refund, and settle funds.

No raw PAN/CVV should ever be stored in D1 or application logs.

## Rail adapter contract

A production rail implementation must support these capabilities behind EZPay's own API:

- tokenize payment credentials through a compliant hosted field / tokenization surface
- authorize
- capture
- void
- refund
- recurring credential / mandate creation
- recurring charge
- payout / settlement status
- normalized webhook events
- idempotency
- network error normalization

See `functions/_lib/rail.js`.

## Cloudflare

Production frontend/backend:

- Cloudflare Pages
- Pages Functions
- D1
- owner-only dashboard
- public hosted checkout routes

Health:

`GET /api/health`

## Aura

Aura web purchases are intended to use EZPay-hosted checkout and EZPay-issued entitlement state.

Current direct-web prices in the Aura app are:

- Aura Pro Monthly: $2.49/month
- Aura Pro Lifetime: $15.49 one-time

The App Store prices remain separate.

## Security

- owner-only server session
- HttpOnly + Secure + SameSite=Strict cookie
- D1-backed sessions
- PBKDF2-SHA256 password hashing
- forced owner password rotation
- login rate limiting
- same-origin checks for owner mutations
- idempotency keys
- signed outbound webhooks
- audit logging
- no raw card storage

## Real payment rails

To move real money, EZPay still requires a contractual connection to an acquirer / sponsor bank / payment network and compliant tokenization infrastructure.

That underlying regulated connection does not change the product architecture: buyers and Aura interact with EZPay, not with a branded third-party dashboard.
