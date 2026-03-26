import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) return NextResponse.json({ success: false, message: "Server configuration Error" }, { status: 500 });

    const apiRes = await fetch(`${baseUrl}/authentication/reset-password-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
        const backendMessage =
        data?.message ?? data?.error ?? data?.msg ?? data?.detail ?? "";
        return NextResponse.json({ success: false, message: backendMessage || "ส่งคำขอไม่สำเร็จ" }, { status: apiRes.status || 400 });
    }

    return NextResponse.json({ success: true, message: "Request sent successfully" });
  } catch (e) {
    console.error("Forget Password Error:", e);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
      { status: 500 },
    );
  }
}
