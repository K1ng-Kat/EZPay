"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Code2,
  Copy,
  CreditCard,
  Download,
  FileText,
  Fingerprint,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LogOut,
  Link2,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Radar,
  Receipt,
  RefreshCw,
  Repeat2,
  ScrollText,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Store,
  Terminal,
  Users,
  WalletCards,
  Webhook,
  X,
} from "lucide-react";

type Icon = typeof LayoutDashboard;
type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type NavItem = {
  label: string;
  path: string;
  icon: Icon;
  badge?: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { label: "Home", path: "/", icon: LayoutDashboard },
      { label: "Payments", path: "/payments", icon: CreditCard },
      { label: "Payment methods", path: "/payment-methods", icon: WalletCards },
      { label: "Balances & payouts", path: "/balances", icon: WalletCards },
      { label: "Customers", path: "/customers", icon: Users },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Products", path: "/products", icon: Package },
      { label: "Subscriptions", path: "/subscriptions", icon: Repeat2 },
      { label: "Invoices", path: "/invoices", icon: Receipt },
      { label: "Payment links", path: "/payment-links", icon: Link2 },
      { label: "Tax", path: "/tax", icon: Calculator },
    ],
  },
  {
    label: "Risk & commerce",
    items: [
      { label: "Disputes", path: "/disputes", icon: ShieldAlert, badge: "2" },
      { label: "Risk controls", path: "/risk", icon: Radar },
      { label: "Terminal", path: "/terminal", icon: Store },
      { label: "Identity", path: "/identity", icon: Fingerprint },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", path: "/reports", icon: BarChart3 }],
  },
  {
    label: "Developers",
    items: [
      { label: "Developer home", path: "/developers", icon: Code2 },
      { label: "API keys", path: "/api-keys", icon: KeyRound },
      { label: "Webhooks", path: "/webhooks", icon: Webhook },
      { label: "Logs", path: "/logs", icon: ScrollText },
    ],
  },
];

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  home: { title: "Overview", subtitle: "A real-time view of your EZPay business." },
  payments: { title: "Payments", subtitle: "Search, inspect, capture, refund, and monitor every payment." },
  "payment-methods": { title: "Payment methods", subtitle: "Manage every eligible way customers can pay through EZPay." },
  balances: { title: "Balances & payouts", subtitle: "Track available funds, pending funds, and payout history." },
  customers: { title: "Customers", subtitle: "Customer profiles, payment history, subscriptions, and lifetime value." },
  products: { title: "Products", subtitle: "Manage products, recurring prices, and one-time prices." },
  subscriptions: { title: "Subscriptions", subtitle: "Recurring billing, trials, renewals, and cancellations." },
  invoices: { title: "Invoices", subtitle: "Create, send, collect, and reconcile invoices." },
  "payment-links": { title: "Payment links", subtitle: "Reusable hosted checkout links for fast payments." },
  tax: { title: "Tax", subtitle: "Configure product tax behavior and review collected tax." },
  disputes: { title: "Disputes", subtitle: "Review chargebacks and prepare evidence." },
  risk: { title: "Risk controls", subtitle: "Rules and signals for reviewing suspicious payments." },
  terminal: { title: "Terminal", subtitle: "In-person payment hardware and locations." },
  identity: { title: "Identity", subtitle: "Identity verification sessions and outcomes." },
  reports: { title: "Reports", subtitle: "Exportable finance, payment, payout, and billing reports." },
  developers: { title: "Developer home", subtitle: "Integrate EZPay, monitor API health, and inspect your environment." },
  "api-keys": { title: "API keys", subtitle: "Manage the credentials your apps use to access EZPay." },
  webhooks: { title: "Webhooks", subtitle: "Deliver reliable event notifications to your applications." },
  logs: { title: "API logs", subtitle: "Inspect requests, responses, timing, and errors." },
  settings: { title: "Settings", subtitle: "Business details, payment methods, branding, team, and platform behavior." },
};

const payments = [
  ["$149.00", "succeeded", "Aura Pro annual", "moshe@example.com", "•••• 4242", "12:04 AM"],
  ["$39.00", "succeeded", "Middos Starter", "school@example.org", "Apple Pay", "Yesterday"],
  ["$249.00", "processing", "Middos Growth", "admin@example.org", "ACH debit", "Yesterday"],
  ["$9.99", "refunded", "EZPay test item", "buyer@example.com", "Google Pay", "Sep 30"],
  ["$79.00", "succeeded", "Aura Studio pack", "creator@example.com", "•••• 1881", "Sep 29"],
  ["$129.00", "failed", "Annual plan", "customer@example.com", "•••• 0341", "Sep 29"],
];

const customers = [
  ["Moshe Katz", "moshe@example.com", "$632.00", "8", "Active", "Today"],
  ["YLS Admin", "admin@example.org", "$2,948.00", "19", "Active", "Yesterday"],
  ["Aura Customer", "creator@example.com", "$228.00", "4", "Active", "Sep 30"],
  ["Demo Buyer", "buyer@example.com", "$19.98", "2", "Inactive", "Sep 28"],
];

const subscriptions = [
  ["sub_7Jh…P2d", "Aura Pro", "Moshe Katz", "$149 / year", "active", "Oct 1, 2027"],
  ["sub_8Kq…M9x", "Middos Growth", "YLS Admin", "$249 / month", "active", "Nov 1, 2026"],
  ["sub_1Aw…T6r", "Aura Pro", "Aura Customer", "$14.99 / month", "trialing", "Oct 8, 2026"],
  ["sub_4Pm…K1y", "Middos Starter", "Demo School", "$39 / month", "past_due", "Oct 3, 2026"],
];

const statusTone = (value: string): StatusTone => {
  const normalized = value.toLowerCase();
  if (["succeeded", "active", "paid", "enabled", "verified", "healthy"].includes(normalized)) return "success";
  if (["processing", "trialing", "pending", "review"].includes(normalized)) return "warning";
  if (["failed", "past_due", "blocked", "lost"].includes(normalized)) return "danger";
  if (["refunded", "open"].includes(normalized)) return "info";
  return "neutral";
};

function Badge({ children, tone }: { children: React.ReactNode; tone?: StatusTone }) {
  const t = tone ?? statusTone(String(children));
  return <span className={`badge ${t}`}><span className="status-dot" />{children}</span>;
}

function Metric({ label, value, change, detail }: { label: string; value: string; change?: string; detail?: string }) {
  return (
    <div className="card pad">
      <div className="eyebrow">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-meta">
        {change ? <span className={change.startsWith("+") ? "up" : "down"}>{change}</span> : null}
        <span>{detail}</span>
      </div>
    </div>
  );
}

function TableCard({
  title,
  columns,
  rows,
  statusColumn,
  toolbar = true,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  statusColumn?: number;
  toolbar?: boolean;
}) {
  return (
    <div className="card table-card">
      {toolbar ? (
        <div className="table-toolbar">
          <strong style={{ fontSize: 12 }}>{title}</strong>
          <div className="grow" />
          <input className="mini-search" placeholder="Search…" aria-label={`Search ${title}`} />
          <button className="btn"><SlidersHorizontal /> Filter</button>
          <button className="icon-button" aria-label="More options"><MoreHorizontal size={15} /></button>
        </div>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className={j === 0 ? "amount" : ""}>
                    {j === statusColumn ? <Badge>{cell}</Badge> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Home() {
  const bars = [38, 54, 46, 72, 58, 67, 83, 64, 90, 75, 84, 97, 69, 78, 92, 81, 99, 73, 88, 94, 82, 100, 91, 96];
  return (
    <>
      <div className="grid four">
        <Metric label="Gross volume" value="$12,482.79" change="+18.4%" detail="vs. previous period" />
        <Metric label="Net volume" value="$11,936.22" change="+17.9%" detail="after refunds & fees" />
        <Metric label="Successful payments" value="284" change="+12.7%" detail="98.6% success rate" />
        <Metric label="Recurring revenue" value="$4,219.00" change="+9.2%" detail="monthly run rate" />
      </div>

      <div className="grid dashboard section-gap">
        <div className="card chart-card">
          <div className="chart-head">
            <div className="card-title-row">
              <div>
                <h2>Payment volume</h2>
                <div className="subtle" style={{ fontSize: 10, marginTop: 4 }}>Last 30 days · USD</div>
              </div>
              <button className="btn">30 days <ChevronDown size={13} /></button>
            </div>
          </div>
          <div className="chart">
            {bars.map((h, i) => <div key={i} className="bar" style={{ height: `${h}%` }} title={`Day ${i + 1}`} />)}
          </div>
          <div className="chart-labels"><span>Sep 3</span><span>Sep 10</span><span>Sep 17</span><span>Sep 24</span><span>Oct 2</span></div>
        </div>

        <div className="card pad">
          <div className="card-title-row">
            <h2>Balances</h2>
            <NextLink className="btn ghost" href="/balances">View all <ChevronRight /></NextLink>
          </div>
          <div className="balance-stack">
            <div className="balance-row">
              <div className="balance-row-top"><span><i className="dot success" /> Available</span><strong>$7,420.18</strong></div>
              <div className="subtle" style={{ marginTop: 6 }}>Eligible for your next payout</div>
            </div>
            <div className="balance-row">
              <div className="balance-row-top"><span><i className="dot warning" /> Pending</span><strong>$1,838.62</strong></div>
              <div className="subtle" style={{ marginTop: 6 }}>Expected within 2 business days</div>
            </div>
          </div>
          <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}><Send /> Create payout</button>
        </div>
      </div>

      <div className="section-gap">
        <TableCard
          title="Recent payments"
          columns={["Amount", "Status", "Description", "Customer", "Method", "Created"]}
          rows={payments.slice(0, 5)}
          statusColumn={1}
        />
      </div>

      <div className="grid two section-gap">
        <div className="card pad">
          <div className="card-title-row"><h2>Quick actions</h2></div>
          <div className="quick-list">
            {[
              [CreditCard, "Create payment", "Start a new PaymentIntent"],
              [Link2, "Create payment link", "Share a hosted checkout"],
              [Users, "Add customer", "Create a reusable customer profile"],
              [Receipt, "Create invoice", "Bill a customer manually"],
            ].map(([I, title, sub]) => {
              const C = I as Icon;
              return <button className="quick-item" key={String(title)}><span className="quick-icon"><C /></span><span><strong>{String(title)}</strong><span>{String(sub)}</span></span><ChevronRight className="arrow" size={14} /></button>;
            })}
          </div>
        </div>
        <div className="card pad">
          <div className="card-title-row"><h2>Payment methods</h2><NextLink className="btn ghost" href="/settings">Configure</NextLink></div>
          <div className="quick-list">
            <div className="quick-item"><span className="payment-logo">CARD</span><span><strong>Cards</strong><span>Visa, Mastercard, Amex, Discover</span></span><Badge tone="success">enabled</Badge></div>
            <div className="quick-item"><span className="payment-logo">Pay</span><span><strong>Apple Pay</strong><span>Shown on eligible Apple devices</span></span><Badge tone="success">enabled</Badge></div>
            <div className="quick-item"><span className="payment-logo">G Pay</span><span><strong>Google Pay</strong><span>Shown on eligible browsers/devices</span></span><Badge tone="success">enabled</Badge></div>
            <div className="quick-item"><span className="payment-logo">ACH</span><span><strong>ACH debit</strong><span>Provider-hosted ACH collection</span></span><Badge tone="success">enabled</Badge></div>
          </div>
        </div>
      </div>
    </>
  );
}

function PaymentsPage() {
  return (
    <>
      <div className="grid four">
        <Metric label="Today" value="$1,482.41" change="+14.2%" detail="37 payments" />
        <Metric label="Success rate" value="98.6%" change="+0.8%" detail="last 7 days" />
        <Metric label="Refunds" value="$129.48" detail="4 refunds" />
        <Metric label="Failed" value="$87.00" detail="3 payment attempts" />
      </div>
      <div className="section-gap">
        <TableCard title="All payments" columns={["Amount", "Status", "Description", "Customer", "Payment method", "Created"]} rows={payments} statusColumn={1} />
      </div>
    </>
  );
}

function BalancesPage() {
  return (
    <>
      <div className="grid three">
        <Metric label="Available to pay out" value="$7,420.18" detail="USD balance" />
        <Metric label="Pending" value="$1,838.62" detail="Future available balance" />
        <Metric label="Lifetime payouts" value="$38,925.77" detail="42 completed payouts" />
      </div>
      <div className="grid two section-gap">
        <div className="card pad">
          <h2>Next automatic payout</h2>
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginTop: 22 }}>
            <div><div className="metric-value">$7,420.18</div><div className="subtle" style={{ fontSize: 10, marginTop: 5 }}>Estimated arrival: Oct 5, 2026</div></div>
            <button className="btn primary"><Send /> Pay out now</button>
          </div>
        </div>
        <div className="card pad">
          <h2>Payout schedule</h2>
          <div className="setting-row" style={{ paddingInline: 0, marginTop: 8 }}><Banknote size={17} /><div className="setting-copy"><strong>Automatic · Daily</strong><p>Funds are paid out as they become available.</p></div><button className="btn">Edit</button></div>
        </div>
      </div>
      <div className="section-gap">
        <TableCard title="Payout history" columns={["Amount", "Status", "Destination", "Type", "Arrival"]} statusColumn={1} rows={[
          ["$5,918.42", "succeeded", "•••• 2918", "Automatic", "Sep 30"],
          ["$4,803.11", "succeeded", "•••• 2918", "Automatic", "Sep 23"],
          ["$6,012.77", "succeeded", "•••• 2918", "Automatic", "Sep 16"],
          ["$2,449.09", "pending", "•••• 2918", "Manual", "Oct 5"],
        ]} />
      </div>
    </>
  );
}

function CustomersPage() {
  return (
    <>
      <div className="grid three">
        <Metric label="Total customers" value="126" change="+11" detail="this month" />
        <Metric label="New customers" value="18" change="+28.6%" detail="vs. last month" />
        <Metric label="Avg. lifetime value" value="$312.19" change="+4.1%" detail="all customers" />
      </div>
      <div className="section-gap">
        <TableCard title="Customers" columns={["Customer", "Email", "Lifetime value", "Payments", "State", "Last active"]} rows={customers} />
      </div>
    </>
  );
}

function ProductsPage() {
  return (
    <>
      <div className="feature-grid">
        {[
          ["Aura Pro", "Desktop software", "$14.99 monthly · $149 yearly", "2 recurring prices"],
          ["Middos Starter", "SaaS", "$39 monthly", "1 recurring price"],
          ["Middos Growth", "SaaS", "$249 monthly", "1 recurring price"],
          ["Aura Studio Pack", "Digital add-on", "$79 one time", "1 one-time price"],
        ].map(([name, type, price, meta]) => (
          <div className="feature-card" key={name}>
            <div className="feature-icon"><Package /></div>
            <strong>{name}</strong>
            <p>{type}</p>
            <div style={{ marginTop: 13, fontSize: 11, fontWeight: 760 }}>{price}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 9 }}>{meta}</div>
          </div>
        ))}
      </div>
      <div className="section-gap">
        <TableCard title="All prices" columns={["Product", "Price", "Billing", "Currency", "Tax behavior", "State"]} statusColumn={5} rows={[
          ["Aura Pro", "$14.99", "Monthly", "USD", "Exclusive", "active"],
          ["Aura Pro", "$149.00", "Yearly", "USD", "Exclusive", "active"],
          ["Middos Starter", "$39.00", "Monthly", "USD", "Exclusive", "active"],
          ["Middos Growth", "$249.00", "Monthly", "USD", "Exclusive", "active"],
        ]} />
      </div>
    </>
  );
}

function SubscriptionsPage() {
  return (
    <>
      <div className="grid four">
        <Metric label="MRR" value="$4,219" change="+9.2%" detail="monthly recurring revenue" />
        <Metric label="Active subscriptions" value="61" change="+7" detail="this month" />
        <Metric label="Churn" value="2.8%" change="-0.6%" detail="30-day rate" />
        <Metric label="Trial conversion" value="74.1%" change="+3.9%" detail="last 90 days" />
      </div>
      <div className="section-gap">
        <TableCard title="Subscriptions" columns={["ID", "Product", "Customer", "Price", "Status", "Next invoice"]} rows={subscriptions} statusColumn={4} />
      </div>
    </>
  );
}

function InvoicesPage() {
  return (
    <>
      <div className="grid three">
        <Metric label="Open" value="$1,284.00" detail="7 invoices" />
        <Metric label="Past due" value="$249.00" detail="1 invoice" />
        <Metric label="Paid this month" value="$6,918.00" change="+12.1%" detail="vs. September" />
      </div>
      <div className="section-gap">
        <TableCard title="Invoices" columns={["Invoice", "Customer", "Amount", "Status", "Due", "Created"]} statusColumn={3} rows={[
          ["INV-1048", "YLS Admin", "$249.00", "paid", "Oct 1", "Oct 1"],
          ["INV-1047", "Demo School", "$249.00", "open", "Oct 3", "Sep 28"],
          ["INV-1046", "Aura Customer", "$149.00", "paid", "Sep 30", "Sep 30"],
          ["INV-1045", "School Account", "$39.00", "paid", "Sep 29", "Sep 29"],
        ]} />
      </div>
    </>
  );
}

function PaymentLinksPage() {
  return (
    <>
      <div className="grid three">
        <Metric label="Active links" value="8" detail="Reusable checkout links" />
        <Metric label="Link revenue" value="$2,814.90" change="+22.4%" detail="last 30 days" />
        <Metric label="Conversion" value="61.2%" change="+4.8%" detail="checkout completion" />
      </div>
      <div className="section-gap">
        <TableCard title="Payment links" columns={["Link", "Product", "Price", "State", "Uses", "Created"]} statusColumn={3} rows={[
          ["ezpay.to/aura-pro", "Aura Pro", "$149.00", "active", "18", "Sep 17"],
          ["ezpay.to/middos-start", "Middos Starter", "$39.00/mo", "active", "9", "Sep 11"],
          ["ezpay.to/studio-pack", "Aura Studio Pack", "$79.00", "active", "6", "Sep 6"],
        ]} />
      </div>
    </>
  );
}

function DisputesPage() {
  return (
    <>
      <div className="grid three">
        <Metric label="Needs response" value="2" detail="$188.00 at risk" />
        <Metric label="Win rate" value="75%" change="+8%" detail="last 12 months" />
        <Metric label="Disputed volume" value="0.42%" detail="of processed volume" />
      </div>
      <div className="section-gap">
        <TableCard title="Disputes" columns={["Amount", "Status", "Reason", "Customer", "Payment", "Respond by"]} statusColumn={1} rows={[
          ["$149.00", "open", "Product not received", "customer@example.com", "•••• 4242", "Oct 9"],
          ["$39.00", "open", "Unrecognized", "buyer@example.com", "Google Pay", "Oct 11"],
          ["$79.00", "won", "Fraudulent", "creator@example.com", "•••• 1881", "Sep 21"],
        ]} />
      </div>
    </>
  );
}

function RiskPage() {
  return (
    <>
      <div className="grid three">
        <Metric label="Blocked payments" value="19" detail="$1,431 protected this month" />
        <Metric label="Manual reviews" value="3" detail="2 awaiting action" />
        <Metric label="Risk score coverage" value="100%" detail="All online card payments" />
      </div>
      <div className="card setting-section section-gap">
        <div className="setting-head"><h2>Risk rules</h2><p>Rules run before a payment is accepted.</p></div>
        {[
          ["Block extremely high-risk payments", "Risk score ≥ 90", true],
          ["Review mismatched billing countries", "Country does not match card country", true],
          ["Block repeated failed cards", "5 failures from one fingerprint in 30 minutes", true],
          ["Require 3D Secure when available", "Higher-risk eligible card payments", false],
        ].map(([name, desc, on]) => <div className="setting-row" key={String(name)}><ShieldCheck size={17}/><div className="setting-copy"><strong>{String(name)}</strong><p>{String(desc)}</p></div><button className={`switch ${on ? "on" : ""}`} aria-label={String(name)} /></div>)}
      </div>
    </>
  );
}

function ReportsPage() {
  return (
    <>
      <div className="feature-grid">
        {[
          [BarChart3, "Balance summary", "Daily starting and ending balance, activity, and payouts."],
          [CreditCard, "Payments report", "Charges, payment methods, fees, refunds, and net volume."],
          [Repeat2, "Billing report", "Subscriptions, MRR changes, churn, trials, and invoices."],
          [Banknote, "Payout reconciliation", "Tie individual balance transactions to each payout."],
          [Calculator, "Tax summary", "Collected tax totals grouped by product and jurisdiction."],
          [Users, "Customer activity", "Customer spend, payment count, and latest activity."],
        ].map(([I, name, desc]) => {
          const C = I as Icon;
          return <div className="feature-card" key={String(name)}><div className="feature-icon"><C /></div><strong>{String(name)}</strong><p>{String(desc)}</p><button className="btn" style={{ marginTop: 13 }}><Download /> Export CSV</button></div>;
        })}
      </div>
      <div className="section-gap">
        <TableCard title="Recent exports" columns={["Report", "Period", "Format", "Status", "Created"]} statusColumn={3} rows={[
          ["Payments report", "Sep 1–30", "CSV", "succeeded", "Oct 1"],
          ["Payout reconciliation", "Sep 1–30", "CSV", "succeeded", "Oct 1"],
          ["Balance summary", "Q3 2026", "CSV", "succeeded", "Sep 30"],
        ]} />
      </div>
    </>
  );
}

function DevelopersPage() {
  return (
    <div className="grid two">
      <div className="card pad">
        <div className="card-title-row"><h2>API health</h2><Badge tone="success">healthy</Badge></div>
        <div className="metric-value" style={{ marginTop: 18 }}>99.99%</div>
        <div className="subtle" style={{ fontSize: 10, marginTop: 6 }}>Demo uptime · 218 ms p95 latency</div>
        <div className="progress" style={{ marginTop: 18 }}><span style={{ width: "99%" }} /></div>
      </div>
      <div className="card pad">
        <div className="card-title-row"><h2>Integration checklist</h2><span className="muted" style={{ fontSize: 10 }}>3 / 5</span></div>
        <div className="quick-list">
          {[
            ["Create API credentials", true],
            ["Create your first PaymentIntent", true],
            ["Configure webhook endpoint", true],
            ["Register production domain for wallets", false],
            ["Run a production payment", false],
          ].map(([label, done]) => <div className="quick-item" key={String(label)}><span className="quick-icon">{done ? <Check /> : <span style={{ width: 6, height: 6, borderRadius: 20, background: "#98a2b3" }} />}</span><strong>{String(label)}</strong></div>)}
        </div>
      </div>
      <div className="code-card">
        <div className="code-head"><span>Create a payment</span><span>Node.js</span></div>
        <pre>{`const response = await fetch("/api/v1/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_EZPAY_API_SECRET",
    "Idempotency-Key": crypto.randomUUID()
  },
  body: JSON.stringify({
    amount: 14900,
    currency: "usd",
    description: "Aura Pro annual"
  })
});

const payment = await response.json();`}</pre>
      </div>
      <div className="card pad">
        <h2>Wallet support</h2>
        <div className="quick-list">
          <div className="quick-item"><span className="quick-icon"><Smartphone /></span><span><strong>Apple Pay</strong><span>Through Express Checkout on eligible devices.</span></span><Badge tone="success">ready</Badge></div>
          <div className="quick-item"><span className="quick-icon"><Smartphone /></span><span><strong>Google Pay</strong><span>Through Express Checkout on eligible browsers.</span></span><Badge tone="success">ready</Badge></div>
          <div className="quick-item"><span className="quick-icon"><Landmark /></span><span><strong>Bank connection</strong><span>Persistent instant bank-account connection is not supported.</span></span><Badge tone="neutral">unsupported</Badge></div>
        </div>
      </div>
    </div>
  );
}

function APIKeysPage() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="card">
      <div className="setting-head"><h2>Standard keys</h2><p>Keep secret keys server-side. Publishable keys can be used in browser clients.</p></div>
      <div className="key-row"><label>Publishable key</label><div className="key-value mono">pk_live_EZPay_example_public_key</div><button className="btn"><Copy /> Copy</button></div>
      <div className="key-row"><label>Secret key</label><div className="key-value mono">{revealed ? "sk_live_EZPay_example_secret_key" : "••••••••••••••••••••••••••••••"}</div><button className="btn" onClick={() => setRevealed((v) => !v)}>{revealed ? "Hide" : "Reveal"}</button></div>
      <div className="setting-head" style={{ borderTop: "1px solid var(--line)" }}><h2>Restricted keys</h2><p>Create least-privilege credentials for individual services.</p></div>
      <div className="setting-row"><KeyRound size={17}/><div className="setting-copy"><strong>server_payments_prod</strong><p className="mono">rk_live_••••••••••3812 · Payments write · Customers read</p></div><button className="btn">Manage</button></div>
    </div>
  );
}

function WebhooksPage() {
  return (
    <>
      <div className="grid three">
        <Metric label="Delivered" value="99.97%" detail="last 7 days" />
        <Metric label="Events" value="3,418" detail="last 30 days" />
        <Metric label="Retries" value="7" detail="automatically retried" />
      </div>
      <div className="section-gap">
        <TableCard title="Webhook endpoints" columns={["Endpoint", "Status", "Events", "Last delivery", "Failure rate"]} statusColumn={1} rows={[
          ["https://api.example.com/ezpay/webhook", "enabled", "18 event types", "18 sec ago", "0.02%"],
          ["https://staging.example.com/webhooks", "enabled", "All events", "4 min ago", "0.00%"],
        ]} />
      </div>
    </>
  );
}

function LogsPage() {
  return (
    <TableCard title="API requests" columns={["Method", "Path", "Status", "Duration", "Request ID", "Time"]} rows={[
      ["POST", "/v1/payment_intents", "200", "182 ms", "req_Ne8…d21", "12:04:12 AM"],
      ["GET", "/v1/customers/cus_92…", "200", "91 ms", "req_Pq2…a10", "12:03:47 AM"],
      ["POST", "/v1/refunds", "200", "204 ms", "req_Mk4…f88", "11:58:19 PM"],
      ["POST", "/v1/payment_intents", "402", "241 ms", "req_Kz1…c11", "11:55:02 PM"],
    ]} />
  );
}


function PaymentMethodsPage() {
  const groups: { icon: Icon; title: string; description: string; methods: string[] }[] = [
    {
      icon: CreditCard,
      title: "Cards",
      description: "Global and regional card networks supported by the provider.",
      methods: ["Visa", "Mastercard", "American Express", "Discover", "Diners Club", "JCB", "China UnionPay", "Cartes Bancaires", "eftpos"],
    },
    {
      icon: Smartphone,
      title: "Wallets",
      description: "Fast wallet checkout, dynamically shown when the customer is eligible.",
      methods: ["Apple Pay", "Google Pay", "Link", "Amazon Pay", "Cash App Pay", "PayPal", "Alipay", "WeChat Pay", "Revolut Pay", "MobilePay", "PayPay", "GrabPay", "Satispay", "MB WAY"],
    },
    {
      icon: Landmark,
      title: "Bank debits",
      description: "Provider-hosted bank debit collection without EZPay storing bank login credentials.",
      methods: ["ACH Direct Debit", "SEPA Direct Debit", "Bacs Direct Debit", "Canadian PADs", "AU BECS Direct Debit", "NZ BECS Direct Debit"],
    },
    {
      icon: ArrowUpRight,
      title: "Bank redirects & real-time pay",
      description: "Regional authenticated bank flows and instant-pay rails.",
      methods: ["iDEAL / Wero", "Bancontact", "BLIK", "EPS", "P24", "FPX", "PayNow", "UPI", "TWINT", "Swish", "PromptPay", "Pix", "PayTo"],
    },
    {
      icon: Repeat2,
      title: "Buy now, pay later",
      description: "Installment options shown only when the amount, country, currency, and business are eligible.",
      methods: ["Klarna", "Affirm", "Afterpay / Clearpay", "Zip", "Meses sin intereses"],
    },
    {
      icon: Receipt,
      title: "Transfers & vouchers",
      description: "Bank transfer and cash-voucher style payment flows for supported regions.",
      methods: ["USD Bank Transfer", "SEPA Bank Transfer", "UK Bank Transfer", "Japan Bank Transfer", "Mexico Bank Transfer", "Multibanco", "Konbini", "OXXO", "Boleto"],
    },
  ];

  return (
    <>
      <div className="callout payment-method-callout">
        <ShieldCheck />
        <div>
          <strong>Dynamic methods are enabled.</strong><br />
          EZPay asks the payment provider to automatically show the payment methods your account and each transaction are eligible for. The list can change by country, currency, amount, device, browser, merchant category, and account approval.
        </div>
      </div>

      <div className="feature-grid section-gap">
        {groups.map((group) => {
          const I = group.icon;
          return (
            <div className="feature-card payment-method-group" key={group.title}>
              <div className="feature-icon"><I /></div>
              <strong>{group.title}</strong>
              <p>{group.description}</p>
              <div className="method-chip-wrap">
                {group.methods.map((method) => <span className="method-chip" key={method}>{method}</span>)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="callout section-gap">
        <AlertTriangle />
        <div>
          <strong>Bank connection is unsupported.</strong><br />
          EZPay supports eligible bank-payment flows, but does not provide persistent account aggregation or store online-banking usernames/passwords.
        </div>
      </div>
    </>
  );
}

function SettingsPage() {
  const [methods, setMethods] = useState({ card: true, apple: true, google: true, ach: true });
  const toggle = (k: keyof typeof methods) => setMethods((m) => ({ ...m, [k]: !m[k] }));
  return (
    <>
      <div className="card setting-section">
        <div className="setting-head"><h2>Payment methods</h2><p>Control the methods EZPay can offer at checkout. Availability can still depend on device, country, currency, and provider account eligibility.</p></div>
        <div className="setting-row"><span className="payment-logo">CARD</span><div className="setting-copy"><strong>Debit & credit cards</strong><p>Visa, Mastercard, American Express, Discover, and eligible network cards.</p></div><button className={`switch ${methods.card ? "on" : ""}`} onClick={() => toggle("card")} /></div>
        <div className="setting-row"><span className="payment-logo">Pay</span><div className="setting-copy"><strong>Apple Pay</strong><p>Express wallet checkout on supported Apple devices and browsers.</p></div><button className={`switch ${methods.apple ? "on" : ""}`} onClick={() => toggle("apple")} /></div>
        <div className="setting-row"><span className="payment-logo">G Pay</span><div className="setting-copy"><strong>Google Pay</strong><p>Express wallet checkout on supported devices and browsers.</p></div><button className={`switch ${methods.google ? "on" : ""}`} onClick={() => toggle("google")} /></div>
        <div className="setting-row"><span className="payment-logo">ACH</span><div className="setting-copy"><strong>ACH debit</strong><p>US bank account payment collection through the configured payment provider.</p></div><button className={`switch ${methods.ach ? "on" : ""}`} onClick={() => toggle("ach")} /></div>
      </div>

      <div className="callout section-gap"><AlertTriangle /><div><strong>Bank connection is unsupported.</strong><br />EZPay does not currently provide a persistent “connect your bank” feature or account aggregation. ACH checkout may use provider-hosted verification when required, but EZPay will not store raw online-banking credentials.</div></div>

      <div className="card setting-section section-gap">
        <div className="setting-head"><h2>Business</h2><p>Identity shown in your EZPay dashboard and receipts.</p></div>
        <div className="setting-row"><div className="setting-copy"><strong>Business name</strong><p>EZPay Demo</p></div><button className="btn">Edit</button></div>
        <div className="setting-row"><div className="setting-copy"><strong>Statement descriptor</strong><p>EZPAY</p></div><button className="btn">Edit</button></div>
        <div className="setting-row"><div className="setting-copy"><strong>Default currency</strong><p>USD — United States dollar</p></div><button className="btn">Edit</button></div>
      </div>

      <div className="card setting-section section-gap">
        <div className="setting-head"><h2>Branding</h2><p>Customize checkout, receipts, and payment links.</p></div>
        <div className="setting-row"><div className="setting-copy"><strong>Brand color</strong><p>#635BFF</p></div><div style={{ width: 26, height: 26, borderRadius: 8, background: "#635bff", border: "1px solid #544bd6" }} /></div>
        <div className="setting-row"><div className="setting-copy"><strong>Logo</strong><p>Use the EZPay mark by default</p></div><button className="btn">Upload</button></div>
      </div>
    </>
  );
}

function CapabilityPage({ section }: { section: string }) {
  const map: Record<string, { icon: Icon; title: string; description: string; items: string[] }> = {
    tax: { icon: Calculator, title: "Tax automation", description: "A foundation for product tax codes, registrations, and transaction-level tax reporting.", items: ["Product tax behavior", "Tax calculation events", "Collected tax reporting", "Registration tracking"] },
    terminal: { icon: Store, title: "In-person payments", description: "Manage readers, locations, and point-of-sale activity from EZPay.", items: ["Reader inventory", "Locations", "Connection tokens", "In-person payment history"] },
    identity: { icon: Fingerprint, title: "Identity verification", description: "Track verification sessions and application outcomes without mixing identity data into payment records.", items: ["Verification sessions", "Document checks", "Status callbacks", "Audit history"] },
  };
  const data = map[section] ?? map.tax;
  const I = data.icon;
  return (
    <div className="grid two">
      <div className="card pad">
        <div className="feature-icon"><I /></div>
        <h2>{data.title}</h2>
        <p className="subtle" style={{ fontSize: 11, lineHeight: 1.65 }}>{data.description}</p>
        <div className="quick-list">
          {data.items.map((item) => <div className="quick-item" key={item}><span className="quick-icon"><Check /></span><strong>{item}</strong></div>)}
        </div>
      </div>
      <div className="card pad">
        <h2>Configuration state</h2>
        <div className="empty-ish">
          <div className="empty-icon"><I size={19} /></div>
          <strong>Ready for provider configuration</strong>
          <div style={{ marginTop: 6, fontSize: 10 }}>The dashboard surface is built. Connect the required provider capability before enabling production actions.</div>
        </div>
      </div>
    </div>
  );
}

function renderPage(section: string) {
  switch (section) {
    case "home": return <Home />;
    case "payments": return <PaymentsPage />;
    case "payment-methods": return <PaymentMethodsPage />;
    case "balances": return <BalancesPage />;
    case "customers": return <CustomersPage />;
    case "products": return <ProductsPage />;
    case "subscriptions": return <SubscriptionsPage />;
    case "invoices": return <InvoicesPage />;
    case "payment-links": return <PaymentLinksPage />;
    case "disputes": return <DisputesPage />;
    case "risk": return <RiskPage />;
    case "reports": return <ReportsPage />;
    case "developers": return <DevelopersPage />;
    case "api-keys": return <APIKeysPage />;
    case "webhooks": return <WebhooksPage />;
    case "logs": return <LogsPage />;
    case "settings": return <SettingsPage />;
    case "tax":
    case "terminal":
    case "identity": return <CapabilityPage section={section} />;
    default: return <Home />;
  }
}

export function EZPayDashboard() {
  const pathname = usePathname();
  const [liveMode, setLiveMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const section = useMemo(() => {
    const first = pathname.split("/").filter(Boolean)[0];
    return first && pageMeta[first] ? first : "home";
  }, [pathname]);

  const meta = pageMeta[section] ?? pageMeta.home;

  return (
    <div className="app-shell">
      {mobileOpen ? <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /> : null}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">EZ</div>
          <div className="brand-name">EZPay</div>
          <span className="brand-pill">private</span>
          <button className="icon-button" style={{ marginLeft: "auto", width: 28, height: 28, background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.08)", color: "#adb6cb" }} onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={13}/></button>
        </div>

        <div className="business-switcher">
          <div><strong>{liveMode ? "EZPay Production" : "EZPay Sandbox"}</strong><span>{liveMode ? "Live data" : "Test environment"}</span></div>
          <ChevronDown size={13} />
        </div>

        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const active = item.path === "/" ? section === "home" : pathname.startsWith(item.path);
              const I = item.icon;
              return (
                <NextLink className={`nav-item ${active ? "active" : ""}`} href={item.path} key={item.path} onClick={() => setMobileOpen(false)}>
                  <I />
                  <span>{item.label}</span>
                  <span className="nav-spacer" />
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                </NextLink>
              );
            })}
          </div>
        ))}

        <div className="nav-group">
          <div className="nav-label">Workspace</div>
          <NextLink className={`nav-item ${section === "settings" ? "active" : ""}`} href="/settings" onClick={() => setMobileOpen(false)}><Settings /><span>Settings</span></NextLink>
          <NextLink className="nav-item" href="/checkout" onClick={() => setMobileOpen(false)}><ArrowUpRight /><span>Open checkout demo</span></NextLink>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={15} /></button>
          <div className="search-box">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search payments, customers, invoices…" />
            <span className="kbd">⌘ K</span>
          </div>
          <div style={{ flex: 1 }} />
          <div className="mode-toggle">
            <button className={!liveMode ? "on" : ""} onClick={() => setLiveMode(false)}>TEST</button>
            <button className={liveMode ? "on" : ""} onClick={() => setLiveMode(true)}>LIVE</button>
          </div>
          <button className="icon-button" aria-label="Refresh"><RefreshCw size={14}/></button>
          <button className="icon-button" aria-label="Notifications"><Bell size={14}/></button>
          <div className="avatar">MK</div>\n          <form action="/api/auth/logout" method="post"><button className="icon-button" type="submit" aria-label="Sign out"><LogOut size={14}/></button></form>
        </header>

        <section className="page">
          <div className="page-head">
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
            <div className="actions">
              {section === "payments" ? <button className="btn"><Download /> Export</button> : null}
              <button className="btn primary"><Plus /> Create</button>
            </div>
          </div>
          {renderPage(section)}
        </section>
      </main>
    </div>
  );
}
