import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) return NextResponse.json({ success: false }, { status: 500 });

    const apiRes = await fetch(`${baseUrl}/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    // อ่าน json ถ้าอ่านไม่ได้ให้เป็น null
    const data = await apiRes.json().catch(() => null);

    // ✅ ถ้า backend ตอบ error → map message แล้วส่งกลับ
    if (!apiRes.ok) {
      const backendMessage =
        data?.message ?? data?.error ?? data?.msg ?? data?.detail ?? "";
      const message = mapLoginMessage(backendMessage);

      // เลือก status ตาม backend ถ้าเป็น 401/403 ก็ส่งตามนั้น
      const status = apiRes.status || 401;

      return NextResponse.json({ success: false, message }, { status });
    }

    if (!data?.user) {
      return NextResponse.json(
        { success: false, message: "เข้าสู่ระบบไม่สำเร็จ" },
        { status: 401 },
      );
    }

    // ✅ สำเร็จ: ส่ง set-cookie จาก backend กลับไปให้ browser
    const res = NextResponse.json({
      success: true,
      redirectUrl: ["Provincial", "Provicial", "Evaluator", "DOED"].includes(
        data.user.role,
      )
        ? "/admins/main"
        : "/factories/main",
    });

    const setCookies =
      apiRes.headers.getSetCookie?.() ??
      (apiRes.headers.get("set-cookie")
        ? [apiRes.headers.get("set-cookie")!]
        : []);

    for (const c of setCookies) res.headers.append("set-cookie", c);

    return res;
  } catch (e) {
    console.error("Login Error:", e);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
      { status: 500 },
    );
  }
}
