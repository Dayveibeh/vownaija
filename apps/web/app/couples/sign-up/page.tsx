import { AuthExperience } from "../../components/AuthExperience";
import { isClerkConfigured } from "@/lib/accounts";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export default async function CoupleSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; reason?: string; returnTo?: string }>;
}) {
  const { mode, reason, returnTo } = await searchParams;
  return (
    <AuthExperience
      role="couple"
      initialMode={mode === "signin" ? "signin" : "signup"}
      available={isClerkConfigured()}
      sessionExpired={reason === "session-timeout"}
      returnTo={safeReturnTo(returnTo)}
    />
  );
}
