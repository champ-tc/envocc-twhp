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
  return `${base}/factories/enrolls`;
};

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

    if (!upstream.ok) {
      console.error("[api/factories/enrolls][UPSTREAM ERROR]", {
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
  } catch (err) {
    console.error("[api/factories/enrolls][PROXY ERROR]", err);
    return NextResponse.json({ message: "Upstream error" }, { status: 502 });
  }
}

// ✅ GET
export async function GET(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;
  return await proxy(req, { method: "GET" });
}

// ✅ POST (ส่งแบบ FormData ก้อนเดียว หรือ JSON)
export async function POST(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      return await proxy(req, {
        method: "POST",
        body: formData,
      });
    }

    const body = await req.json();
    return await proxy(req, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[api/factories/enrolls][POST] error:", e);
    return NextResponse.json(
      { message: "Upstream request failed or invalid body" },
      { status: 502 },
    );
  }
}

// ✅ PATCH (แก้ไขข้อมูลเดิม)
export async function PATCH(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      return await proxy(req, {
        method: "PATCH",
        body: formData,
      });
    }

    const body = await req.json();
    return await proxy(req, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[api/factories/enrolls][PATCH] error:", e);
    return NextResponse.json(
      { message: "Upstream request failed or invalid body" },
      { status: 502 },
    );
  }
}

