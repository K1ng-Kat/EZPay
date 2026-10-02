import { randomBytes, randomUUID } from "node:crypto";

export type EZPayPaymentStatus =
  | "requires_payment_method"
  | "requires_action"
  | "authorized"
  | "captured"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

export type EZPayPaymentIntent = {
  id: string;
  object: "ezpay.payment_intent";
  amount: number;
  currency: string;
  status: EZPayPaymentStatus;
  client_token: string;
  created: number;
  description?: string;
  metadata: Record<string, string>;
};

export type PaymentRail =
  | "card"
  | "apple_pay"
  | "google_pay"
  | "amazon_pay"
  | "cash_app_pay"
  | "paypal"
  | "ach"
  | "sepa"
  | "bank_redirect"
  | "bnpl"
  | "voucher";

export const railRegistry: Record<
  PaymentRail,
  { state: "adapter_ready" | "commercial_onboarding_required"; note: string }
> = {
  card: {
    state: "commercial_onboarding_required",
    note: "Requires acquiring / processor / network connectivity and PCI-scoped card collection.",
  },
  apple_pay: {
    state: "commercial_onboarding_required",
    note: "Requires Apple Pay merchant onboarding, merchant validation, and an acquiring path.",
  },
  google_pay: {
    state: "commercial_onboarding_required",
    note: "Requires Google Pay merchant integration and an acquiring path.",
  },
  amazon_pay: {
    state: "commercial_onboarding_required",
    note: "Requires Amazon Pay merchant onboarding and API credentials.",
  },
  cash_app_pay: {
    state: "commercial_onboarding_required",
    note: "Requires Cash App Pay merchant / processor integration.",
  },
  paypal: {
    state: "commercial_onboarding_required",
    note: "Requires PayPal merchant onboarding and API connectivity.",
  },
  ach: {
    state: "commercial_onboarding_required",
    note: "Requires sponsor-bank / ODFI or payment-processor access to ACH rails.",
  },
  sepa: {
    state: "commercial_onboarding_required",
    note: "Requires an eligible banking / payment partner for SEPA debit or transfer access.",
  },
  bank_redirect: {
    state: "commercial_onboarding_required",
    note: "Requires rail-specific banking integrations. Persistent bank connection is unsupported.",
  },
  bnpl: {
    state: "commercial_onboarding_required",
    note: "Requires direct onboarding with each credit / installment provider.",
  },
  voucher: {
    state: "commercial_onboarding_required",
    note: "Requires country-specific cash / voucher network partnerships.",
  },
};

export function createSandboxPaymentIntent(input: {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}): EZPayPaymentIntent {
  return {
    id: `pi_${randomUUID().replaceAll("-", "")}`,
    object: "ezpay.payment_intent",
    amount: input.amount,
    currency: input.currency.toLowerCase(),
    status: "requires_payment_method",
    client_token: `ez_test_${randomBytes(24).toString("base64url")}`,
    created: Math.floor(Date.now() / 1000),
    description: input.description,
    metadata: input.metadata ?? {},
  };
}
