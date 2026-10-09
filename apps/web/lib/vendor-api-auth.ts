import { accountAccessResponse } from "./account-access";
import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "./accounts";

export async function vendorApiIdentity(): Promise<string | Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ message: "Sign in to your vendor account." }, { status: 401 });
  const profile = await getUserProfile(userId);
  const restricted = accountAccessResponse(profile); if (restricted) return restricted;
  if (profile?.role !== "vendor") return Response.json({ message: "A vendor account is required." }, { status: 403 });
  return userId;
}

// Cookie-authenticated writes must originate from this application.
export function rejectCrossOriginWrite(request: Request) {
  const origin = request.headers.get("origin");
  // Coolify terminates HTTPS at the proxy; Next's internal request URL may be
  // HTTP localhost. The forwarded request Host is the browser-facing boundary.
  let differentHost = false;
  if (origin) {
    try { differentHost = new URL(origin).host !== (request.headers.get("host") || new URL(request.url).host); }
    catch { differentHost = true; }
  }
  if (request.headers.get("sec-fetch-site") === "cross-site" || differentHost) {
    return Response.json({ message: "Please submit changes from Smitten." }, { status: 403 });
  }
  return null;
}
