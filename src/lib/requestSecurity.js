const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function forbidden() {
  return Response.json(
    {
      success: false,
      message: "Cross-origin request blocked",
    },
    { status: 403 },
  );
}

export function validateWriteOrigin(request) {
  if (SAFE_METHODS.has(String(request.method || "GET").toUpperCase())) {
    return null;
  }

  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (
    fetchSite &&
    !["same-origin", "same-site", "none"].includes(fetchSite)
  ) {
    return forbidden();
  }

  if (!origin) {
    return null;
  }

  if (!host) {
    return forbidden();
  }

  try {
    const originUrl = new URL(origin);
    const expectedHost = String(host)
      .split(",")[0]
      .trim()
      .toLowerCase();

    if (originUrl.host.toLowerCase() !== expectedHost) {
      return forbidden();
    }

    return null;
  } catch {
    return forbidden();
  }
}
