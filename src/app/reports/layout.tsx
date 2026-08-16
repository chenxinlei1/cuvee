import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "report:read")) redirect("/");
  return children;
}
