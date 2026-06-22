import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../_utils/logger";
import { forwardHeaders } from "../../../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

type RouteContext = {
  params: Promise<{
    coverId: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for evaluator cover verdict");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const { coverId } = await context.params;
    const base = API_BASE_URL.replace(/\/+$/, "");
    const targetUrl = `${base}/evaluators/covers/${encodeURIComponent(coverId)}/verdict`;
    const requestBody = await req.text();
    const headersObj = forwardHeaders(req, {
      "Content-Type": req.headers.get("content-type") || "application/json",
    });

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: headersObj,
      body: requestBody,
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    const responseBody = await upstream.text();

    if (!upstream.ok) {
      logger.error("Evaluator cover verdict failed", {
        status: upstream.status,
        coverId,
        body: responseBody.slice(0, 500),
      });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    logger.error("Evaluator Cover Verdict API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
