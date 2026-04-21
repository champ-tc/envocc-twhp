import { NextRequest, NextResponse } from "next/server";
import { normalizeUserData, type RawAuthResponse } from "@/lib/auth-utils";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    logger.error("API_BASE_URL not configured for authentication check");
    return NextResponse.json({ isLoggedIn: false, error: "Configuration Error" }, { status: 500 });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  }

  try {
    const headersObj = forwardHeaders(request);

    const res = await fetch(`${baseUrl}/authentication`, {
      method: "GET",
      cache: "no-store",
      headers: headersObj,
    });

    if (!res.ok) {
      if (res.status !== 401) {
        const errorText = await res.text();
        logger.error("Backend authentication check failed", { status: res.status, error: errorText.slice(0, 500) });
      }
      return NextResponse.json({ isLoggedIn: false }, { status: res.status });
    }

    const raw = (await res.json()) as RawAuthResponse;
    return NextResponse.json({
      isLoggedIn: true,
      user: normalizeUserData(raw),
    });
  } catch (error) {
    logger.error("Authentication Check Error", error);
    return NextResponse.json({ isLoggedIn: false, error: "Internal Server Error" }, { status: 500 });
  }
}