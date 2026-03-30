import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type Ctx = { params: Promise<{ districtId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }

  const { districtId } = await ctx.params;

  const envApiKey = process.env.TWHP_API_KEY;
  const forwardedApiKey = req.headers.get("x-api-key");
  const apiKey = envApiKey || forwardedApiKey || "";

  const r = await fetch(
    `${API_BASE_URL}/location/districts/${encodeURIComponent(districtId)}/subdistricts`,
    {
      cache: "no-store",
      headers: {
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
    },
  );

  const text = await r.text();

  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
