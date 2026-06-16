import { NextRequest, NextResponse } from "next/server";
import { forwardHeaders } from "../../_utils/forwardHeaders";
import { logger } from "../../_utils/logger";

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 });
    }

    const headersObj = forwardHeaders(request, { "Content-Type": "application/json" });

    // Proxy request to backend
    const apiRes = await fetch(`${baseUrl}/factories/assessments/score`, {
      method: "GET",
      headers: headersObj,
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
      return NextResponse.json(
        data || { message: "Failed to fetch assessment summary" },
        { status: apiRes.status }
      );
    }

    const res = NextResponse.json(data);

    // Proxy cookies back if any
    const rawCookies = apiRes.headers.getSetCookie?.() || [apiRes.headers.get("set-cookie")].filter(Boolean) as string[];
    rawCookies.forEach((c) => {
      let secure = c;
      if (!c.toLowerCase().includes("httponly")) secure += "; HttpOnly";
      if (!c.toLowerCase().includes("secure")) secure += "; Secure";
      if (!c.toLowerCase().includes("samesite")) secure = secure.replace(/; SameSite=[^;]+/i, "") + "; SameSite=Lax";
      res.headers.append("set-cookie", secure);
    });

    return res;
  } catch (error) {
    logger.error("Fetch assessment summary error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
