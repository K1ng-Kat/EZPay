type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error =
    params.error === "invalid"
      ? "Incorrect owner password."
      : params.error === "configuration"
        ? "Owner authentication is not configured yet. Add EZPAY_OWNER_PASSWORD and EZPAY_SESSION_SECRET."
        : "";

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">EZ</span>
          <div>
            <strong>EZPay</strong>
            <span>Owner console</span>
          </div>
        </div>

        <div className="login-copy">
          <h1>Sign in to EZPay</h1>
          <p>Your dashboard, API keys, payouts, customer data, and developer controls are owner-only.</p>
        </div>

        {error ? <div className="checkout-alert">{error}</div> : null}

        <form action="/api/auth/login" method="post" className="login-form">
          <label htmlFor="password">Owner password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            placeholder="Enter your private owner password"
          />
          <button className="btn primary login-submit" type="submit">
            Sign in securely
          </button>
        </form>

        <p className="login-footnote">
          Session cookies are HttpOnly, SameSite=Strict, signed server-side, and expire automatically.
        </p>
      </section>
    </main>
  );
}
