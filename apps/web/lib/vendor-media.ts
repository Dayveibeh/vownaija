import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const mediaPattern = /^[a-f0-9-]{36}\.(jpg|png|webp|mp4)$/;
export class MediaError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function mediaDirectory() {
  if (process.env.VERCEL) throw new MediaError("Portfolio uploads are available on the Smitten VPS deployment.", 503);
  const configured = process.env.SMITTEN_MEDIA_DIR;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new MediaError("Portfolio storage is not configured yet. Please try again once uploads are enabled.", 503);
  }
  if (configured && !path.isAbsolute(configured)) throw new MediaError("Portfolio storage needs an absolute directory path.", 503);
  return configured || path.join(process.cwd(), ".data", "vendor-media");
}

export function validatedMediaName(name: string) { return mediaPattern.test(name); }
export function mediaContentType(name: string) {
  return name.endsWith(".mp4") ? "video/mp4" : name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
}

export function validateMedia(bytes: Uint8Array, declaredType: string) {
  const buffer = Buffer.from(bytes);
  const extension = buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? "jpg"
    : buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
    : buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" ? "webp"
    : buffer.toString("ascii", 4, 8) === "ftyp" && /^(isom|iso2|mp41|mp42|avc1|M4V )$/.test(buffer.toString("ascii", 8, 12)) ? "mp4" : null;
  if (!extension || mediaContentType(`file.${extension}`) !== declaredType) throw new MediaError("Choose a JPG, PNG, WebP image or MP4 video.");
  if (!bytes.length || bytes.length > (extension === "mp4" ? MAX_MEDIA_BYTES : 8 * 1024 * 1024)) {
    throw new MediaError("Images must be under 8 MB and MP4 videos under 25 MB.", 413);
  }
  return extension;
}

export async function storeMedia(file: File) {
  const directory = mediaDirectory();
  if (file.size > MAX_MEDIA_BYTES) throw new MediaError("This file is too large.", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = validateMedia(bytes, file.type);
  const name = `${crypto.randomUUID()}.${extension}`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ directory, name), bytes, { flag: "wx", mode: 0o600 });
  return { name, url: `/api/vendor-media/${name}` };
}

export async function discardMedia(name: string) {
  if (validatedMediaName(name)) await unlink(path.join(/* turbopackIgnore: true */ mediaDirectory(), name)).catch(() => undefined);
}

export async function readMedia(name: string) {
  if (!validatedMediaName(name)) throw new MediaError("Media not found.", 404);
  return readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ mediaDirectory(), name));
}

// Bound multipart input before parsing, even if Content-Length is absent or false.
export async function readMediaForm(request: Request) {
  const limit = MAX_MEDIA_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw new MediaError("This file is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new MediaError("Choose a file to upload.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > limit) { await reader.cancel(); throw new MediaError("This file is too large.", 413); }
    chunks.push(next.value);
  }
  try {
    return await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
  } catch { throw new MediaError("Choose a valid file to upload."); }
}
