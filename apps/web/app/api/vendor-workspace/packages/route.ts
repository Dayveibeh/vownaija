import { vendorApiIdentity, rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { archiveOwnedPackage, saveOwnedPackage } from "@/lib/vendor-workspace";
import { vendorPackageSchema } from "@/lib/vendor-validation";

export async function POST(request: Request) {
  const rejected = rejectCrossOriginWrite(request);
  if (rejected) return rejected;
  const identity = await vendorApiIdentity();
  if (identity instanceof Response) return identity;
  const input = await request.json().catch(() => null);
  const parsed = vendorPackageSchema.safeParse(input);
  if (!parsed.success) return Response.json({ message: parsed.error.issues[0].message }, { status: 400 });
  try {
    const id = await saveOwnedPackage(identity, parsed.data);
    return Response.json({ ok: true, id });
  } catch (error) {
    const missing = error instanceof Error && error.message === "NOT_FOUND";
    return Response.json({ message: missing ? "Package or vendor profile not found." : "We couldn’t save this package. Please try again." }, { status: missing ? 404 : 500 });
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectCrossOriginWrite(request);
  if (rejected) return rejected;
  const identity = await vendorApiIdentity();
  if (identity instanceof Response) return identity;
  const input = await request.json().catch(() => null);
  if (typeof input?.id !== "string" || !input.id || input.id.length > 100) return Response.json({ message: "Choose a package." }, { status: 400 });
  try { await archiveOwnedPackage(identity, input.id); return Response.json({ ok: true }); }
  catch (error) {
    const missing = error instanceof Error && error.message === "NOT_FOUND";
    return Response.json({ message: missing ? "Package not found." : "We couldn’t archive this package." }, { status: missing ? 404 : 500 });
  }
}
