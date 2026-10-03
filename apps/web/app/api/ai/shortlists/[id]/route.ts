import { getShortlist } from "@/lib/ai/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shortlist = await getShortlist(id);
  return Response.json(shortlist ? { shortlist } : { error: "Shortlist not found or expired" }, {
    status: shortlist ? 200 : 404,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
