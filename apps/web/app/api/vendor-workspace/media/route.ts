import { vendorApiIdentity, rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { appendPortfolioMedia, getOwnedVendor, updatePortfolioMedia } from "@/lib/vendor-workspace";
import { MediaError, discardMedia, readMediaForm, storeMedia } from "@/lib/vendor-media";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const rejected = rejectCrossOriginWrite(request);
  if (rejected) return rejected;
  const identity = await vendorApiIdentity();
  if (identity instanceof Response) return identity;
  let stored: Awaited<ReturnType<typeof storeMedia>> | undefined;
  try {
    const vendor = await getOwnedVendor(identity);
    if (!vendor) return Response.json({ message: "Save your business profile before adding a portfolio." }, { status: 409 });
    if ((vendor.gallery as string[]).length >= 24) return Response.json({ message: "Your portfolio can contain up to 24 files." }, { status: 409 });
    const form = await readMediaForm(request);
    const file = form.get("file");
    const cover = form.get("cover") === "true";
    if (!(file instanceof File)) throw new MediaError("Choose a file to upload.");
    if (cover && file.type === "video/mp4") throw new MediaError("Choose an image for your cover.");
    stored = await storeMedia(file);
    await appendPortfolioMedia(identity, stored.url, cover);
    return Response.json({ ok: true, url: stored.url }, { status: 201 });
  } catch (error) {
    if (stored) await discardMedia(stored.name);
    const full = error instanceof Error && error.message === "GALLERY_FULL";
    return Response.json({ message: error instanceof MediaError ? error.message : full ? "Your portfolio can contain up to 24 files." : "We couldn’t upload your media. Please try again." }, { status: error instanceof MediaError ? error.status : full ? 409 : 500 });
  }
}

export async function PATCH(request: Request) {
  const rejected = rejectCrossOriginWrite(request);
  if (rejected) return rejected;
  const identity = await vendorApiIdentity();
  if (identity instanceof Response) return identity;
  const input = await request.json().catch(() => null);
  if (typeof input?.url !== "string" || input.url.length > 2000 || !["cover", "remove"].includes(input.action)) return Response.json({ message: "Choose a portfolio item." }, { status: 400 });
  try {
    await updatePortfolioMedia(identity, input.url, input.action);
    // Removing from the gallery retains the file on disk; cleanup belongs to a
    // separate retention job and must not race a simultaneous gallery update.
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ message: message === "IMAGE_COVER_REQUIRED" ? "Choose an image for your cover." : message === "NOT_FOUND" ? "Portfolio item not found." : "We couldn’t update your portfolio." }, { status: message === "IMAGE_COVER_REQUIRED" ? 400 : message === "NOT_FOUND" ? 404 : 500 });
  }
}
