import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

const ensureApiBase = () => {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }
  return null;
};

const targetUrl = () => {
  const base = API_BASE_URL?.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const url = `${base}/factories/assessments/questions`;
  return url;
};

function forwardHeaders(
  req: NextRequest,
  initHeaders?: HeadersInit,
): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };

  if (initHeaders) {
    if (Array.isArray(initHeaders)) {
      for (const [k, v] of initHeaders) h[k] = v;
    } else if (initHeaders instanceof Headers) {
      initHeaders.forEach((v, k) => (h[k] = v));
    } else {
      Object.assign(h, initHeaders);
    }
  }

  const cookie = req.headers.get("cookie");
  if (cookie) h.cookie = cookie;

  const auth = req.headers.get("authorization");
  if (auth) h.authorization = auth;

  // Add X-API-Key
  const envApiKey = process.env.TWHP_API_KEY;
  const forwardedApiKey = req.headers.get("x-api-key");
  const apiKey = envApiKey || forwardedApiKey || "";
  if (apiKey) h["X-API-Key"] = apiKey;

  return h;
}

async function proxy(req: NextRequest, init: RequestInit) {
  const url = targetUrl();
  const headersObj = forwardHeaders(req, init.headers);

  try {
    const upstream = await fetch(url, {
      ...init,
      headers: headersObj,
      cache: "no-store",
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ??
          "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    console.error(`[api/factories/assessments/questions] proxy error:`, err);
    return NextResponse.json({ message: "Upstream error" }, { status: 502 });
  }
}

// ✅ GET
export async function GET(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;
  const url = targetUrl();
  return await proxy(req, { method: "GET" });
}
