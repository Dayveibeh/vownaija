function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

export function getPublicRequestOrigin(request: Request) {
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
