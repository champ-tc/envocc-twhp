import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

export async function POST(request: NextRequest) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    logger.error("API_BASE_URL not configured for logout");
    return NextResponse.json({ success: false, error: "Configuration Error" }, { status: 500 });
  }

  try {
    const headersObj = forwardHeaders(request);

    // Call backend logout
    const apiRes = await fetch(`${baseUrl}/authentication/logout`, {
      method: "POST",
      headers: headersObj,
      cache: "no-store",
    });

    // Send response back and forward Set-Cookie if any (to clear session)
    const res = NextResponse.json({ success: apiRes.ok });

    const getSetCookie =
      "getSetCookie" in apiRes.headers &&
        typeof (apiRes.headers as Headers & { getSetCookie?: () => string[] })
          .getSetCookie === "function"
        ? (
          apiRes.headers as Headers & {
            getSetCookie: () => string[];
          }
        ).getSetCookie()
        : [];

    const fallbackSetCookie = apiRes.headers.get("set-cookie");
    const setCookies =
      getSetCookie.length > 0
        ? getSetCookie
        : fallbackSetCookie
          ? [fallbackSetCookie]
          : [];

    for (const c of setCookies) {
      let secureCookie = c;
      if (!secureCookie.toLowerCase().includes("httponly")) secureCookie += "; HttpOnly";
      if (!secureCookie.toLowerCase().includes("secure")) secureCookie += "; Secure";
      if (!secureCookie.toLowerCase().includes("samesite")) secureCookie += "; SameSite=Lax";
      res.headers.append("set-cookie", secureCookie);
    }

    return res;
  } catch (error) {
    logger.error("Logout Error", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
