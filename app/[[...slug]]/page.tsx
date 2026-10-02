import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EZPayDashboard } from "@/components/ezpay-dashboard";
import { OWNER_SESSION_COOKIE, verifyOwnerSessionToken } from "@/lib/auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_SESSION_COOKIE)?.value;

  if (!verifyOwnerSessionToken(token)) {
    redirect("/login");
  }

  return <EZPayDashboard />;
}
