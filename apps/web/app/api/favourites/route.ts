import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ensureDatabaseSchema, getDb } from "@/db";
import { favourites, marketplaceVendors } from "@/db/schema";
import { ensureMarketplaceSeed } from "@/lib/marketplace";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

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

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  let vendorId = "";
  try {
    const body = await request.json() as { vendorId?: unknown };
    vendorId = typeof body.vendorId === "string" ? body.vendorId.trim() : "";
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  if (!vendorId) return NextResponse.json({ message: "Vendor is required." }, { status: 400 });

  try {
    await ensureMarketplaceSeed();
    await ensureDatabaseSchema();

    const [vendor] = await getDb().select({ id: marketplaceVendors.id })
      .from(marketplaceVendors)
      .where(eq(marketplaceVendors.id, vendorId))
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
