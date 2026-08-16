import { VineyardDashboard } from "@/components/wine/vineyard/VineyardDashboard";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { defaultAppPath, hasPermission } from "@/lib/auth/types";

export const metadata = { title: "Vineyard — Cuvée" };

export default async function VineyardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "analysis:run")) redirect(defaultAppPath(user));
  return <VineyardDashboard />;
}
