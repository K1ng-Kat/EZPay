"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertTriangle, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type IntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  error?: string;
};

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [complete, setComplete] = useState(false);

  const confirm = async () => {
    if (!stripe || !elements) return;
    setWorking(true);
    setMessage("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? "Payment could not be completed.");
    } else if (paymentIntent?.status === "succeeded") {
      setComplete(true);
      setMessage("Payment completed successfully.");
    } else if (paymentIntent) {
      setMessage(`Payment status: ${paymentIntent.status.replaceAll("_", " ")}`);
    }

    setWorking(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await confirm();
  };

  if (complete) {
    return (
      <div className="checkout-success">
        <CheckCircle2 size={34} />
        <h3>Payment complete</h3>
        <p>Your payment was confirmed securely.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="real-wallets">
        <ExpressCheckoutElement
          onConfirm={confirm}
          options={{ buttonHeight: 46 }}
        />
      </div>

      <div className="or-row">or choose another payment method</div>

      <div className="stripe-payment-wrap">
        <PaymentElement
          options={{
            layout: {
              type: "accordion",
              defaultCollapsed: false,
              radios: "always",
              spacedAccordionItems: true,
            },
            business: { name: "EZPay Demo" },
          }}
        />
      </div>

      {message ? <div className="checkout-alert">{message}</div> : null}

      <button
        className="checkout-submit"
        type="submit"
        disabled={!stripe || !elements || working}
      >
        {working ? "Securing payment…" : "Pay $149.00 securely"}
      </button>

      <div className="checkout-security-row">
        <LockKeyhole size={12} />
        Payment details are collected inside provider-hosted secure Elements.
      </div>
    </form>
  );
}

function DemoPaymentsNotice({ reason }: { reason: string }) {
  return (
    <>
      <div className="checkout-alert">
        <AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
        {reason}
      </div>
      <div className="demo-method-grid">
        {[
          "Apple Pay",
          "Google Pay",
          "Link",
          "Amazon Pay",
          "PayPal",
          "Klarna",
          "Cash App Pay",
          "Cards",
          "ACH debit",
          "Eligible local methods",
        ].map((method) => (
          <div className="demo-method" key={method}>{method}</div>
        ))}
      </div>
      <p className="checkout-note">
        Dynamic methods only appear when the configured payment account, customer,
        currency, browser, device, and merchant category are eligible.
      </p>
    </>
  );
}

export function CheckoutClient() {
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [error, setError] = useState("");
  const idempotencyKey = useMemo(
    () => typeof crypto !== "undefined" ? crypto.randomUUID() : `ezpay-${Date.now()}`,
    []
  );

  useEffect(() => {
    if (!publishableKey) return;

    const controller = new AbortController();

    fetch("/api/checkout/intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-EZPay-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ productId: "aura_pro_annual" }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as IntentResponse;
        if (!response.ok) throw new Error(data.error ?? "Could not load checkout");
        setIntent(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load checkout");
      });

    return () => controller.abort();
  }, [idempotencyKey]);

  const options = useMemo(
    () => intent?.clientSecret
      ? {
          clientSecret: intent.clientSecret,
          appearance: {
            theme: "stripe" as const,
            variables: {
              colorPrimary: "#635bff",
              borderRadius: "10px",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            },
          },
        }
      : null,
    [intent]
  );

  return (
    <div className="checkout-page">
      <div className="checkout-shell">
        <section className="checkout-summary">
          <div className="checkout-brand">
            <span className="brand-mark">EZ</span>
            EZPay
          </div>
          <h1>Aura Pro</h1>
          <div className="checkout-price">$149.00</div>
          <p>Annual plan · billed once per year until canceled.</p>

          <div className="order-lines">
            <div className="order-line"><span>Aura Pro annual</span><strong>$149.00</strong></div>
            <div className="order-line"><span>Subtotal</span><strong>$149.00</strong></div>
            <div className="order-line"><span>Tax</span><strong>Calculated when applicable</strong></div>
          </div>

          <div className="checkout-trust">
            <ShieldCheck size={17} />
            <div>
              <strong>Secure by design</strong>
              <span>EZPay does not store raw card numbers or wallet credentials.</span>
            </div>
          </div>
        </section>

        <section className="checkout-form">
          <h2>Choose how you want to pay</h2>
          <p>
            EZPay uses dynamic payment methods so eligible wallets, cards, bank
            debits, pay-later options, and regional methods can appear automatically.
          </p>

          {!publishableKey ? (
            <DemoPaymentsNotice reason="Add your Stripe publishable and secret keys to activate live test-mode Elements." />
          ) : error ? (
            <DemoPaymentsNotice reason={error} />
          ) : !intent || !options || !stripePromise ? (
            <div className="checkout-loading">Loading secure payment methods…</div>
          ) : (
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm />
            </Elements>
          )}

          <div className="checkout-bank-note">
            <strong>Bank connection:</strong> unsupported. ACH payments can use
            provider-hosted verification where eligible, but EZPay does not offer
            persistent online-banking account connections or store bank-login credentials.
          </div>
        </section>
      </div>
    </div>
  );
}
