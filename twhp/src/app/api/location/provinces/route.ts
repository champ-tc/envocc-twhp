import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(req: NextRequest) {
  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for location provinces");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const headersObj = forwardHeaders(req);

    const r = await fetch(`${API_BASE_URL}/location/provinces`, {
      cache: "no-store",
      headers: headersObj,
    });

    const text = await r.text();
    const contentType = r.headers.get("content-type") || "application/json";

    if (!r.ok) {
        logger.error(`Location provinces fetch failed`, { status: r.status });
    }

    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    logger.error("Location Provinces API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
