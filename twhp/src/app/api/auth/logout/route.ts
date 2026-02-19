import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  // รับ cookie จาก browser
  const cookieHeader = request.headers.get("cookie") || "";

  // เรียก backend logout
  const apiRes = await fetch(`${baseUrl}/authentication/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader, // ✅ forward cookie backend
    },
    cache: "no-store",
  });

  // ส่ง response กลับ พร้อม forward Set-Cookie (ถ้ามี)
  const res = NextResponse.json({ success: true });

  const setCookies =
    apiRes.headers.getSetCookie?.() ??
    (apiRes.headers.get("set-cookie")
      ? [apiRes.headers.get("set-cookie")!]
      : []);

  for (const c of setCookies) {
    res.headers.append("set-cookie", c);
  }

  return res;
}
