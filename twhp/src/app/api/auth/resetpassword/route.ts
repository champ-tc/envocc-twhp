import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) return NextResponse.json({ success: false, message: "Server configuration Error" }, { status: 500 });

    const apiRes = await fetch(`${baseUrl}/authentication/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
        const backendMessage =
        data?.message ?? data?.error ?? data?.msg ?? data?.detail ?? "";
        return NextResponse.json({ success: false, message: backendMessage || "เปลี่ยนรหัสผ่านไม่สำเร็จ" }, { status: apiRes.status || 400 });
    }

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (e) {
    console.error("Reset Password Error:", e);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
      { status: 500 },
    );
  }
}
