import CoupleDashboardClient from "./dashboard-client";
import { requireUserRole } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function CoupleDashboardPage() {
  const profile = await requireUserRole("couple");
  return <CoupleDashboardClient profile={{ fullName: profile.fullName, email: profile.email }} />;
}
