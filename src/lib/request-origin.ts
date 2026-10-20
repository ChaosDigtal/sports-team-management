export function redirectUrl(request: Request, path: string) {
  const url = new URL(path, request.url);
  const host = preferredHost(request);
  if (!host) return url;
  const parsed = new URL(`http://${host}`);
  url.hostname = parsed.hostname;
  url.port = parsed.port;
  const proto = headerValue(request.headers.get("x-forwarded-proto"));
  if (proto === "http" || proto === "https") url.protocol = `${proto}:`;
  return url;
}

function preferredHost(request: Request) {
  const forwarded = headerValue(request.headers.get("x-forwarded-host"));
  const host = headerValue(request.headers.get("host"));
  const candidates = [forwarded, host].filter(Boolean);
  return candidates.find((value) => !isLoopback(value)) ?? candidates[0] ?? "";
}

function isLoopback(host: string) {
  const name = host.replace(/^\[|\]$/g, "").split(":")[0];
  return name === "localhost" || name === "127.0.0.1" || name === "::1";
}

function headerValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}
