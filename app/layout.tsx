import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EZPay — Payments infrastructure",
  description: "A private payments operating system for checkout, customers, subscriptions, invoices, payouts, and developer tools.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
