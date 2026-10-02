import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <main className="checkout-page">
      <section className="card pad checkout-result">
        <CheckCircle2 size={42} />
        <h1>Payment submitted</h1>
        <p>Your payment flow returned to EZPay. The verified webhook is the source of truth for fulfillment.</p>
        <Link className="btn primary" href="/">Return to dashboard</Link>
      </section>
    </main>
  );
}
