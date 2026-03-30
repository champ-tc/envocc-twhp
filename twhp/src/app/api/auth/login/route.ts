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
    const envApiKey = process.env.TWHP_API_KEY;
    const forwardedApiKey = request.headers.get("x-api-key");

    const apiKey = envApiKey || forwardedApiKey || "";

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, message: "API_BASE_URL not configured" },
        { status: 500 },
      );
    }

    const apiRes = await fetch(`${baseUrl}/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
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
      res.headers.append("set-cookie", c);
    }

    return res;
  } catch (e) {
    console.error("Login Error:", e);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
      { status: 500 },
    );
  }
}