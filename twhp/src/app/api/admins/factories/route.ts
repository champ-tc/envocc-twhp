import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(req: NextRequest) {
  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for admin factories");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const validated = req.nextUrl.searchParams.get("validated");
    const url = new URL(`${API_BASE_URL}/admins/factories`);
    if (validated !== null) {
      url.searchParams.set("validated", validated);
    }

    const headersObj = forwardHeaders(req);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: headersObj,
      cache: "no-store",
    });

    if (!res.ok) {
        const errorText = await res.text();
        logger.error(`Admin factories list failed`, { status: res.status, error: errorText.slice(0, 500) });
        return NextResponse.json({ error: "Upstream Error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Admin Factories API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
