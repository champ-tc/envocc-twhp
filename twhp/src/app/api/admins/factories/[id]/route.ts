import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type PatchBody = {
  account_id: number;
};

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }

  const { id } = await ctx.params; // ✅ await ตาม type ที่ Next.js สร้างมา
  const cookieHeader = req.headers.get("cookie") || "";

  const body = (await req.json().catch(() => null)) as PatchBody | null;

  if (!body || typeof body.account_id !== "number") {
    return NextResponse.json(
      { message: "account_id is required (number)" },
      { status: 400 },
    );
  }

  const pathId = Number(id);
  if (Number.isFinite(pathId) && pathId !== body.account_id) {
    return NextResponse.json(
      { message: "id in path must match body.account_id" },
      { status: 400 },
    );
  }

  const targetUrl = `${API_BASE_URL}/admins/factories/validate/${encodeURIComponent(
    String(body.account_id),
  )}`;

  const envApiKey = process.env.TWHP_API_KEY;
  const forwardedApiKey = req.headers.get("x-api-key");
  const apiKey = envApiKey || forwardedApiKey || "";

  const res = await fetch(targetUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader, // forward cookie
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    body: JSON.stringify({
      account_id: body.account_id,
    }),
    cache: "no-store",
  });

  const text = await res.text();

  console.log(text)
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
    },
  });
}
