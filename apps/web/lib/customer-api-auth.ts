import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "./accounts";

export async function customerApiIdentity(): Promise<string | Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ message: "Sign in to your planning account." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (profile?.role !== "couple") return Response.json({ message: "A couple account is required." }, { status: 403 });
  return userId;
}

export function planningError(error: unknown) {
  if (error instanceof Error && error.message === "ITEM_NOT_FOUND") return Response.json({ message: "That item was not found in your plan." }, { status: 404 });
  console.error("Customer planning failed", error);
  return Response.json({ message: "We couldn’t save your plan. Please try again." }, { status: 500 });
}
