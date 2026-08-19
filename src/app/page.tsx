import { redirect } from "next/navigation";
import { EntryChoice } from "@/components/wine/EntryChoice";
import { currentUser } from "@/lib/auth/session";
import { canAccessTrade, canAccessVineyard, defaultAppPath } from "@/lib/auth/types";

export default async function Home() {
  const user = await currentUser();
  if (user && !canAccessTrade(user) && !canAccessVineyard(user)) redirect(defaultAppPath(user));

  const allowedEntries = user
    ? [
        canAccessVineyard(user) ? "vineyard" : null,
        canAccessTrade(user) ? "trade" : null,
        "provenance",
      ].filter(Boolean) as Array<"vineyard" | "trade" | "provenance">
    : (["vineyard", "trade", "provenance"] as Array<"vineyard" | "trade" | "provenance">);

  if (user && allowedEntries.length === 1) {
    const target = allowedEntries[0] === "provenance" ? "/provenance" : `/${allowedEntries[0]}`;
    redirect(target);
  }

  return <EntryChoice entries={allowedEntries} />;
}
