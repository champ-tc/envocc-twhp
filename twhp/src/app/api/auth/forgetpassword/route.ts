import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";
import { rateLimit } from "../../_utils/rateLimit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const limitError = rateLimit(ip, { limit: 3, windowMs: 60000 }); // Stricter for sensitive actions
  if (limitError) return limitError;

  try {
    const { email } = await request.json();
    const baseUrl = process.env.API_BASE_URL;

    if (!baseUrl) {
      logger.error("API_BASE_URL not configured for forgetpassword");
      return NextResponse.json({ success: false, message: "ระบบขัดข้อง โปรดติดต่อเจ้าหน้าที่" }, { status: 500 });
    }

    const headersObj = forwardHeaders(request, { "Content-Type": "application/json" });

    const apiRes = await fetch(`${baseUrl}/authentication/reset-password-request`, {
      method: "POST",
      headers: headersObj,
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
      const backendMessage = data?.message ?? data?.error ?? data?.msg ?? data?.detail ?? "";
      logger.error("Forget Password upstream failure", { status: apiRes.status, backendMessage });
      // Don't leak exact reason if possible, but localized messages are often helpful for users here
      return NextResponse.json(
        { success: false, message: backendMessage || "ส่งคำขอไม่สำเร็จ" },
        { status: apiRes.status || 400 }
      );
    }

    return NextResponse.json({ success: true, message: "ระบบได้ส่งอีเมลเพื่อรีเซ็ตรหัสผ่านแล้ว" });
  } catch (e) {
    logger.error("Forget Password Error", e);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
      { status: 500 },
    );
  }
}
