import { TradeDashboard } from "@/components/wine/trade/TradeDashboard";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { canAccessTrade, defaultAppPath } from "@/lib/auth/types";

export const metadata = { title: "Trade — Cuvée" };

export default async function TradePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!canAccessTrade(user)) redirect(defaultAppPath(user));
  return <TradeDashboard />;
}
