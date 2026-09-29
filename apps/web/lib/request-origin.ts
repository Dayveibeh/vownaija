function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function configuredPublicOrigin() {
  const value = process.env.SMITTEN_PUBLIC_URL?.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function getPublicRequestOrigin(request: Request) {
  const configured = configuredPublicOrigin();
  if (configured) return configured;

  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(request.headers.get("host"));
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));

  if (host) {
    const protocol =
      forwardedProto === "http" || forwardedProto === "https"
        ? forwardedProto
        : host.startsWith("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https";

    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}
