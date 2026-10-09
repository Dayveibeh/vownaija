import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserProfile } from "./accounts";

// Check trusted Clerk metadata on every write; stale database roles and
// user-editable unsafeMetadata cannot grant administrative access.
export async function adminApiIdentity(): Promise<string | Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ message: "Sign in to your admin account." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (profile?.accountStatus !== "active") return Response.json({ message: "Administrator access is required." }, { status: 403 });
  const user = await currentUser();
  const metadata = user?.privateMetadata?.smitten as { role?: unknown } | undefined;
  if (user?.id !== userId || metadata?.role !== "admin" || profile.role !== "admin") {
    return Response.json({ message: "Administrator access is required." }, { status: 403 });
  }
  return userId;
}
