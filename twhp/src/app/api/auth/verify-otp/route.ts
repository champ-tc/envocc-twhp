import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";
import { rateLimit } from "../../_utils/rateLimit";
import { verifyOtpSchema } from "../../_schemas";
import { normalizeUserData, type RawAuthResponse } from "@/lib/auth-utils";

type OtpPayloadAttempt = {
    label: string;
    payload: Record<string, string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";

const getBackendMessage = (value: unknown) => {
    if (!isRecord(value)) return "";
    const message = value.message ?? value.error ?? value.details;
    return typeof message === "string" ? message : "";
};

export async function POST(request: NextRequest) {
    // 1. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const limitError = rateLimit(ip, { limit: 5, windowMs: 60000, group: "verify-otp" });
    if (limitError) return limitError;

    try {
        // 2. Payload Validation
        const body = await request.json();
        const validation = verifyOtpSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ success: false, message: "ข้อมูล OTP ไม่ถูกต้อง" }, { status: 400 });
        }

        const { challengeId, otpCode } = validation.data;

        const baseUrl = process.env.API_BASE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, message: "ระบบยังไม่พร้อมใช้งาน" }, { status: 500 });
        }

        const payloadAttempts: OtpPayloadAttempt[] = [
            { label: "challengeId + otpCode", payload: { challengeId: String(challengeId), otpCode: String(otpCode) } },
            { label: "challengeId + otp", payload: { challengeId: String(challengeId), otp: String(otpCode) } },
            { label: "challengeId + code", payload: { challengeId: String(challengeId), code: String(otpCode) } },
            { label: "challengeId + otp_code", payload: { challengeId: String(challengeId), otp_code: String(otpCode) } },
        ];

        let apiRes: Response | null = null;
        let data: unknown = null;

        for (const attempt of payloadAttempts) {
            apiRes = await fetch(`${baseUrl}/authentication/login/verify-otp`, {
                method: "POST",
                headers: forwardHeaders(request, { "Content-Type": "application/json" }),
                body: JSON.stringify(attempt.payload),
                cache: "no-store",
            });

            data = await apiRes.json().catch(() => null);

            if (apiRes.ok) break;
            if (!getBackendMessage(data).toLowerCase().includes("expected string")) break;
        }

        // 4. Handle Backend Errors
        if (!apiRes || !apiRes.ok) {
            return NextResponse.json(
                { success: false, message: getBackendMessage(data) || "ยืนยัน OTP ไม่สำเร็จ" },
                { status: apiRes?.status || 401 }
            );
        }

        if (!isRecord(data) || !data.user) {
            return NextResponse.json({ success: false, message: "ข้อมูลผู้ใช้ไม่สมบูรณ์" }, { status: 401 });
        }

        // 5. Successful Response & Redirect Logic
        const user = normalizeUserData(data.user as RawAuthResponse);
        const adminRoles = ["Provincial", "Provicial", "Evaluator", "DOED", "ODPC"];
        const redirectUrl = adminRoles.includes(user.role) ? "/admins/main" : "/factories/main";

        const res = NextResponse.json({
            success: true,
            user,
            redirectUrl,
        });

        // 6. Handle Cookies
        const setCookies =
            "getSetCookie" in apiRes.headers &&
                typeof (apiRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
                ? (apiRes.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
                : [];
        setCookies.forEach((cookie: string) => {
            res.headers.append("set-cookie", cookie);
        });

        return res;

    } catch (error) {
        logger.error("Critical OTP Verification Error", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
            { status: 500 }
        );
    }
}
