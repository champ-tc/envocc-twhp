import { NextResponse } from "next/server";
import { normalizeUserData, type RawAuthResponse } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl)
    return NextResponse.json({ isLoggedIn: false }, { status: 500 });

  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) {
    return NextResponse.json(
      {
        isLoggedIn: false,
        debugCookies: [], // ไม่มี cookie ส่งมา
      },
      { status: 401 },
    );
  }

  // debug เฉพาะชื่อ cookie (ไม่โชว์ค่า)
  const debugCookies = cookieHeader
    .split(";")
    .map((p) => p.trim().split("=")[0])
    .filter(Boolean);

  const res = await fetch(`${baseUrl}/authentication`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader, // ✅ forward cookie backend ไปตรง ๆ
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { isLoggedIn: false, backendError: await res.text(), debugCookies },
      { status: res.status },
    );
  }

  const raw = (await res.json()) as RawAuthResponse;
  return NextResponse.json({
    isLoggedIn: true,
    user: normalizeUserData(raw),
  });
}
