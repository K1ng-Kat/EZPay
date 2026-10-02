"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";

const methods = [
  ["Cards", "Debit & credit card rail", WalletCards],
  ["Apple Pay", "Direct wallet adapter", Smartphone],
  ["Google Pay", "Direct wallet adapter", Smartphone],
  ["Amazon Pay", "Direct wallet adapter", Smartphone],
  ["Cash App Pay", "Direct wallet adapter", Smartphone],
  ["ACH", "US bank debit rail", Landmark],
] as const;

export function CheckoutClient() {
  const [selected, setSelected] = useState("Cards");

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
          <p>Annual plan · sandbox checkout prototype.</p>

          <div className="order-lines">
            <div className="order-line"><span>Aura Pro annual</span><strong>$149.00</strong></div>
            <div className="order-line"><span>Subtotal</span><strong>$149.00</strong></div>
            <div className="order-line"><span>Tax</span><strong>Not calculated in sandbox</strong></div>
          </div>

          <div className="checkout-trust">
            <ShieldCheck size={17} />
            <div>
              <strong>Secure boundary by design</strong>
              <span>This prototype intentionally does not collect raw PAN, CVV, or bank-login credentials.</span>
            </div>
          </div>
        </section>

        <section className="checkout-form">
          <h2>Choose a payment rail</h2>
          <p>
            EZPay owns the payment-intent API and orchestration layer. Production
            acceptance requires direct onboarding with each applicable wallet,
            acquirer, sponsor bank, network, or payment rail.
          </p>

          <div className="method-selector">
            {methods.map(([name, description, Icon]) => (
              <button
                className={`method-choice ${selected === name ? "selected" : ""}`}
                key={name}
                type="button"
                onClick={() => setSelected(name)}
              >
                <Icon size={16} />
                <span><strong>{name}</strong><small>{description}</small></span>
              </button>
            ))}
          </div>

          <div className="checkout-alert">
            <AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Production credential collection for {selected} is not connected yet.
            EZPay will not fake or insecurely collect payment credentials.
          </div>

          <button className="checkout-submit" type="button" disabled>
            Connect {selected} production adapter
          </button>

          <div className="checkout-security-row">
            <LockKeyhole size={12} />
            No raw payment credentials are stored by this demo.
          </div>

          <div className="checkout-bank-note">
            <strong>Bank connection:</strong> unsupported. ACH can be implemented as
            a payment rail, but EZPay will not provide persistent consumer bank-login aggregation.
          </div>
        </section>
      </div>
    </div>
  );
}
