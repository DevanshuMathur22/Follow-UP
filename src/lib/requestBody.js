const DEFAULT_MAX_BYTES = 64 * 1024;

function errorResponse(message, status) {
  return Response.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

export async function readJsonBody(request, maxBytes = DEFAULT_MAX_BYTES) {
  const contentLength = Number(request.headers.get("content-length") || 0);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      data: null,
      error: errorResponse("Request body is too large", 413),
    };
  }

  let text;

  try {
    text = await request.text();
  } catch {
    return {
      data: null,
      error: errorResponse("Invalid request body", 400),
    };
  }

  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      data: null,
      error: errorResponse("Request body is too large", 413),
    };
  }

  if (!text.trim()) {
    return {
      data: null,
      error: errorResponse("Request body is required", 400),
    };
  }

  try {
    const data = JSON.parse(text);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      return {
        data: null,
        error: errorResponse("Invalid request body", 400),
      };
    }

    return {
      data,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: errorResponse("Invalid request body", 400),
    };
  }
}
