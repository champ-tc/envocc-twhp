import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(req: NextRequest) {
  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for evaluator factories");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const url = new URL(`${API_BASE_URL}/evaluators/factories`);

    // Forward search params
    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const headersObj = forwardHeaders(req);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: headersObj,
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
        logger.error(`Evaluator factories list failed`, { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    logger.error("Evaluator Factories API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
