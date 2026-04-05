import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";
import { rateLimit } from "../../_utils/rateLimit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const limitError = rateLimit(ip, { limit: 3, windowMs: 60000 });
  if (limitError) return limitError;

  try {
    const { token, password } = await request.json();
    const baseUrl = process.env.API_BASE_URL;

    if (!baseUrl) {
      logger.error("API_BASE_URL not configured for resetpassword");
      return NextResponse.json({ success: false, message: "ระบบขัดข้อง" }, { status: 500 });
    }

    const headersObj = forwardHeaders(request, { "Content-Type": "application/json" });

    const apiRes = await fetch(`${baseUrl}/authentication/reset-password`, {
      method: "POST",
      headers: headersObj,
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
      const backendMessage = data?.message ?? data?.error ?? data?.msg ?? data?.detail ?? "";
      logger.error("Reset Password upstream failure", { status: apiRes.status, backendMessage });
      return NextResponse.json(
        { success: false, message: backendMessage || "เปลี่ยนรหัสผ่านไม่สำเร็จ" },
        { status: apiRes.status || 400 }
      );
    }

    return NextResponse.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จแล้ว" });
  } catch (e) {
    logger.error("Reset Password Error", e);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
      { status: 500 },
    );
  }
}
