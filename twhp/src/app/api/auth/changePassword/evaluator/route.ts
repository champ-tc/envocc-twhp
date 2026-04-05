import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../_utils/logger";
import { forwardHeaders } from "../../../_utils/forwardHeaders";

export async function PATCH(request: NextRequest) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    logger.error("API_BASE_URL not configured for evaluator change password");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const headersObj = forwardHeaders(request, { "Content-Type": "application/json" });

    const res = await fetch(`${baseUrl}/evaluators/password`, {
      method: "PATCH",
      headers: headersObj,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "application/json";

    if (!res.ok) {
      logger.error(`Evaluator change password failed`, { status: res.status, body: text.slice(0, 500) });
    }

    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  } catch (err: any) {
    logger.error("Evaluator change password error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
