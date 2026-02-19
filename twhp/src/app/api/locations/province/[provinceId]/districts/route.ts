import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type Ctx = { params: Promise<{ provinceId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }

  const { provinceId } = await ctx.params;

  const r = await fetch(
    `${API_BASE_URL}/locations/province/${encodeURIComponent(provinceId)}/districts`,
    { cache: "no-store" },
  );

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
