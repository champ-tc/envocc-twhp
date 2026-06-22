import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(req: NextRequest) {
  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for admin score");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const base = API_BASE_URL.replace(/\/+$/, "");
    const url = new URL(`${base}/admins/score`);

    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const headersObj = forwardHeaders(req);

    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: headersObj,
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    const bodyText = await upstream.text();

    if (!upstream.ok) {
      logger.error("Admin score failed", {
        status: upstream.status,
        body: bodyText.slice(0, 500),
      });
    }

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    logger.error("Admin Score API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
