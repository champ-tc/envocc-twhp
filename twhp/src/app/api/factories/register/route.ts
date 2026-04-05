import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";
import { rateLimit } from "../../_utils/rateLimit";

const API_BASE_URL = process.env.API_BASE_URL;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limitError = rateLimit(ip, { limit: 2, windowMs: 60000 }); // Very strict for registration
  if (limitError) return limitError;

  if (!API_BASE_URL) {
    logger.error("API_BASE_URL not configured for factory registration");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const body = await req.json();
    // Use the existing validation logic or we could migrate to Zod later
    const target = `${API_BASE_URL}/factories/register`;
    const headersObj = forwardHeaders(req, { "Content-Type": "application/json" });

    const r = await fetch(target, {
      method: "POST",
      headers: headersObj,
      body: JSON.stringify(body),
    });

    const text = await r.text();
    const contentType = r.headers.get("content-type") || "";

    if (!r.ok) {
        logger.error(`Upstream registration failed`, { status: r.status, body: text.slice(0, 500) });
    }

    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        return NextResponse.json(json, { status: r.status });
      } catch {
        return NextResponse.json({ message: "Invalid JSON from upstream" }, { status: r.status });
      }
    }

    return NextResponse.json({ message: text }, { status: r.status });
  } catch (err) {
    logger.error("Factory Registration Error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 502 });
  }
}