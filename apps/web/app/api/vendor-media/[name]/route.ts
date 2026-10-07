import { isPublishedMedia } from "@/lib/vendor-workspace";
import { MediaError, mediaContentType, readMedia, validatedMediaName } from "@/lib/vendor-media";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!validatedMediaName(name)) return new Response(null, { status: 404 });
  try {
    if (!await isPublishedMedia(`/api/vendor-media/${name}`)) return new Response(null, { status: 404 });
    const bytes = await readMedia(name);
    const headers = new Headers({ "Content-Type": mediaContentType(name), "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=300", "Accept-Ranges": "bytes" });
    const range = request.headers.get("range");
    let start = 0, end = bytes.length - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || !match[1] && !match[2]) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes.length}` } });
      start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      if (start > end || start >= bytes.length || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes.length}` } });
      headers.set("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
    }
    headers.set("Content-Length", String(end - start + 1));
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), { status: range ? 206 : 200, headers });
  } catch (error) {
    const status = error instanceof MediaError ? error.status : (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;
    return new Response(null, { status });
  }
}
