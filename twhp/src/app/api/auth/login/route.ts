import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";
import { rateLimit } from "../../_utils/rateLimit";
import { loginSchema } from "../../_schemas";

function mapLoginMessage(raw: unknown): string {
  const msg = typeof raw === "string" ? raw.toLowerCase().trim() : "";

  if (msg.includes("invalid username or password")) {
    return "ชื่อผู้ใช้ หรือ รหัสผ่านผิด";
  }
  if (msg.includes("factory not validated")) {
    return "สถานประกอบการยังไม่ได้รับการอนุมัติ";
  }

  return "เข้าสู่ระบบไม่สำเร็จ";
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const limitError = rateLimit(ip, { limit: 5, windowMs: 60000 });
  if (limitError) return limitError;

  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const { username, password } = validation.data;
    const baseUrl = process.env.API_BASE_URL;

    if (!baseUrl) {
      logger.error("API_BASE_URL not configured for login");
      return NextResponse.json(
        { success: false, message: "ระบบยังไม่พร้อมใช้งาน" },
        { status: 500 },
      );
    }

    const headersObj = forwardHeaders(request, { "Content-Type": "application/json" });

    const apiRes = await fetch(`${baseUrl}/authentication/login`, {
      method: "POST",
      headers: headersObj,
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
      const backendMessage =
        data?.message ?? data?.error ?? data?.msg ?? data?.detail ?? "";
      const message = mapLoginMessage(backendMessage);
      const status = apiRes.status || 401;

      return NextResponse.json({ success: false, message }, { status });
    }

    if (!data?.user) {
      return NextResponse.json(
        { success: false, message: "เข้าสู่ระบบไม่สำเร็จ" },
        { status: 401 },
      );
    }

    const res = NextResponse.json({
      success: true,
      redirectUrl: ["Provincial", "Provicial", "Evaluator", "DOED"].includes(
        data.user.role,
      )
        ? "/admins/main"
        : "/factories/main",
    });

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
      // Append secure cookie attributes if missing
      let secureCookie = c;
      if (!secureCookie.toLowerCase().includes("httponly")) secureCookie += "; HttpOnly";
      if (!secureCookie.toLowerCase().includes("secure")) secureCookie += "; Secure";
      if (!secureCookie.toLowerCase().includes("samesite")) secureCookie += "; SameSite=Lax";
      
      res.headers.append("set-cookie", secureCookie);
    }

    return res;
  } catch (e) {
    logger.error("Login Error", e);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
      { status: 500 },
    );
  }
}