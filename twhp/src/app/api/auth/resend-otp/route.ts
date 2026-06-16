import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";
import { rateLimit } from "../../_utils/rateLimit";
import { resendOtpSchema } from "../../_schemas";

export async function POST(request: NextRequest) {
    // 1. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const limitError = rateLimit(ip, { limit: 3, windowMs: 60000, group: "resend-otp" });
    if (limitError) return limitError;

    try {
        // 2. Validation
        const body = await request.json();
        const validation = resendOtpSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ success: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        const { challengeId } = validation.data;
        const baseUrl = process.env.API_BASE_URL;

        if (!baseUrl) {
            return NextResponse.json({ success: false, message: "ระบบยังไม่พร้อมใช้งาน" }, { status: 500 });
        }

        // 3. Call Backend
        const apiRes = await fetch(`${baseUrl}/authentication/login/resend-otp`, {
            method: "POST",
            headers: forwardHeaders(request, { "Content-Type": "application/json" }),
            body: JSON.stringify({ challengeId: String(challengeId) }),
            cache: "no-store",
        });

        const data = await apiRes.json().catch(() => null);

        if (!apiRes.ok) {
            return NextResponse.json(
                { success: false, message: data?.message || "ไม่สามารถส่งรหัส OTP ใหม่ได้" },
                { status: apiRes.status || 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "ส่งรหัส OTP ใหม่เรียบร้อยแล้ว โปรดตรวจสอบอีเมลของคุณ",
        });

    } catch (error) {
        logger.error("Critical Resend OTP Error", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
            { status: 500 }
        );
    }
}
