import { AuthExperience } from "../../components/AuthExperience";
import { isClerkConfigured } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function VendorSignUpPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <AuthExperience role="vendor" initialMode={mode === "signin" ? "signin" : "signup"} available={isClerkConfigured()} />;
}
