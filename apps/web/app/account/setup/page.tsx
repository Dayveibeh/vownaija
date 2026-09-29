import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/accounts";
import AccountTransition from "./account-transition";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  if (
    value.startsWith("/couples/sign-up") ||
    value.startsWith("/vendor/sign-up") ||
    value.startsWith("/account/setup")
  ) return undefined;
  return value;
}

export default async function AccountSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; returnTo?: string }>;
}) {
  if (!isClerkConfigured()) redirect("/couples/sign-up?service=unavailable");

  const { userId } = await auth();
  if (!userId) redirect("/couples/sign-up?mode=signin");

  const params = await searchParams;
  const intent = params.intent === "vendor" ? "vendor" : "couple";

  return <AccountTransition intent={intent} returnTo={safeReturnTo(params.returnTo)} />;
}
