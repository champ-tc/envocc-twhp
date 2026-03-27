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

const targetUrl = () => `${API_BASE_URL}/factories/assessments/covers`;

function forwardHeaders(
  req: NextRequest,
  initHeaders?: HeadersInit,
): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };

  // copy initHeaders
  if (initHeaders) {
    if (Array.isArray(initHeaders)) {
      for (const [k, v] of initHeaders) h[k] = v;
    } else if (initHeaders instanceof Headers) {
      initHeaders.forEach((v, k) => (h[k] = v));
    } else {
      Object.assign(h, initHeaders);
    }
  }

  // forward cookie (ถ้ามี)
  const cookie = req.headers.get("cookie");
  if (cookie) h.cookie = cookie;

  // forward authorization (ถ้ามี)
  const auth = req.headers.get("authorization");
  if (auth) h.authorization = auth;

  return h;
}

async function proxy(req: NextRequest, init: RequestInit) {
  const url = targetUrl();
  const headersObj = forwardHeaders(req, init.headers);

  const upstream = await fetch(url, {
    ...init,
    headers: headersObj,
    cache: "no-store",
  });

  const text = await upstream.text();

  if (!upstream.ok) {
    console.error("[api/factories/assessments/covers][UPSTREAM ERROR]", {
      status: upstream.status,
      url: url,
      response: text?.slice(0, 2000),
    });
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ??
        "application/json; charset=utf-8",
    },
  });
}

// ✅ GET (For checking existing cover)
export async function GET(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  try {
    return await proxy(req, { method: "GET" });
  } catch (e) {
    console.error("[api/factories/assessments/covers][GET] error:", e);
    return NextResponse.json(
      { message: "Upstream request failed" },
      { status: 502 },
    );
  }
}

// ✅ POST
export async function POST(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  try {
    return await proxy(req, {
      method: "POST",
    });
  } catch (e) {
    console.error("[api/factories/assessments/covers][POST] error:", e);
    return NextResponse.json(
      { message: "Upstream request failed" },
      { status: 502 },
    );
  }
}
