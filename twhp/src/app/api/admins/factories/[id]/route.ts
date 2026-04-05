import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../_utils/logger";
import { forwardHeaders } from "../../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

type PatchBody = {
  account_id: number;
};

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for admin factory detail update");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as PatchBody | null;

    if (!body || typeof body.account_id !== "number") {
      return NextResponse.json({ error: "account_id is required and must be a number" }, { status: 400 });
    }

    const pathId = Number(id);
    if (Number.isFinite(pathId) && pathId !== body.account_id) {
      return NextResponse.json({ error: "ID mismatch: path ID and account_id must match" }, { status: 400 });
    }

    const targetUrl = `${API_BASE_URL}/admins/factories/validate/${encodeURIComponent(String(body.account_id))}`;
    const headersObj = forwardHeaders(req, { "Content-Type": "application/json" });

    const res = await fetch(targetUrl, {
      method: "PATCH",
      headers: headersObj,
      body: JSON.stringify({ account_id: body.account_id }),
      cache: "no-store",
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "application/json";

    if (!res.ok) {
      logger.error(`Upstream factory validation failed for ID ${id}`, { status: res.status, body: text.slice(0, 500) });
    }

    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    logger.error("Admin Factory Validation API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
