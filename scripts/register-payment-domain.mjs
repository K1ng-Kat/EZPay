import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
const domain = process.argv[2];

if (!secretKey) {
  console.error("Missing STRIPE_SECRET_KEY.");
  process.exit(1);
}

if (!domain) {
  console.error("Usage: npm run register:domain -- pay.example.com");
  process.exit(1);
}

if (!/^[a-z0-9.-]+$/i.test(domain) || domain.includes("://") || domain.includes("/")) {
  console.error("Pass only the hostname, for example: pay.example.com");
  process.exit(1);
}

const stripe = new Stripe(secretKey, {
  appInfo: { name: "EZPay", version: "0.1.0" },
});

const existing = await stripe.paymentMethodDomains.list({ limit: 100 });
const match = existing.data.find((item) => item.domain_name === domain);

if (match) {
  console.log(`Payment method domain already registered: ${match.domain_name} (${match.id})`);
  process.exit(0);
}

const created = await stripe.paymentMethodDomains.create({
  domain_name: domain,
});

console.log(`Registered payment method domain: ${created.domain_name} (${created.id})`);
