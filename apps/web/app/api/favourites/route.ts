import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ensureDatabaseSchema, getDb } from "@/db";
import { favourites, marketplaceVendors } from "@/db/schema";
import { isClerkConfigured } from "@/lib/accounts";
import { ensureMarketplaceSeed } from "@/lib/marketplace";

function authUnavailable() {
  return NextResponse.json({ message: "Sign in required." }, { status: 401 });
}

async function authenticatedUserId() {
  if (!isClerkConfigured()) return null;
  const { userId } = await auth();
  return userId;
}

export async function GET() {
  const userId = await authenticatedUserId();
  if (!userId) return authUnavailable();

  try {
    await ensureMarketplaceSeed();
    const rows = await getDb()
      .select({
        vendorId: favourites.vendorId,
        createdAt: favourites.createdAt,
        vendor: marketplaceVendors,
      })
      .from(favourites)
      .innerJoin(marketplaceVendors, eq(favourites.vendorId, marketplaceVendors.id))
      .where(eq(favourites.clerkUserId, userId));

    return NextResponse.json({ currency: "NGN", favourites: rows });
  } catch (error) {
    console.error("Failed to load favourites", error);
    return NextResponse.json({ message: "Unable to load saved vendors right now." }, { status: 500 });
  }
}

async function vendorIdFromRequest(request: Request) {
  try {
    const body = await request.json() as { vendorId?: unknown };
    return typeof body.vendorId === "string" ? body.vendorId.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return authUnavailable();

  const vendorId = await vendorIdFromRequest(request);
  if (!vendorId) return NextResponse.json({ message: "Vendor is required." }, { status: 400 });

  try {
    await ensureMarketplaceSeed();
    await ensureDatabaseSchema();

    const [vendor] = await getDb().select({ id: marketplaceVendors.id })
      .from(marketplaceVendors)
      .where(and(eq(marketplaceVendors.id, vendorId), eq(marketplaceVendors.active, true)))
      .limit(1);
    if (!vendor) return NextResponse.json({ message: "Vendor not found." }, { status: 404 });

    await getDb().insert(favourites).values({ clerkUserId: userId, vendorId })
      .onConflictDoNothing({ target: [favourites.clerkUserId, favourites.vendorId] });

    return NextResponse.json({ ok: true, vendorId }, { status: 201 });
  } catch (error) {
    console.error("Failed to save favourite", error);
    return NextResponse.json({ message: "Unable to save this vendor right now." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return authUnavailable();

  const vendorId = await vendorIdFromRequest(request);
  if (!vendorId) return NextResponse.json({ message: "Vendor is required." }, { status: 400 });

  try {
    await ensureDatabaseSchema();
    await getDb().delete(favourites).where(and(
      eq(favourites.clerkUserId, userId),
      eq(favourites.vendorId, vendorId),
    ));
    return NextResponse.json({ ok: true, vendorId });
  } catch (error) {
    console.error("Failed to remove favourite", error);
    return NextResponse.json({ message: "Unable to remove this saved vendor right now." }, { status: 500 });
  }
}
