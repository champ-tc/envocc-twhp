import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../_utils/logger";
import { forwardHeaders } from "../../../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

type RouteContext = {
  params: Promise<{
    coverId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for admin cover answers");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const { coverId } = await context.params;
    const base = API_BASE_URL.replace(/\/+$/, "");
    const targetUrl = `${base}/evaluators/covers/${encodeURIComponent(coverId)}/answers`;
    const headersObj = forwardHeaders(req);

    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: headersObj,
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    const bodyText = await upstream.text();

    if (!upstream.ok) {
      logger.error("Admin cover answers proxy failed", {
        status: upstream.status,
        coverId,
        body: bodyText.slice(0, 500),
      });
    }

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    logger.error("Admin Cover Answers API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
