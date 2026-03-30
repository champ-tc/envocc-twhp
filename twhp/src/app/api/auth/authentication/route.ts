import { NextResponse } from "next/server";
import { normalizeUserData, type RawAuthResponse } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  const envApiKey = process.env.TWHP_API_KEY;
  const forwardedApiKey = request.headers.get("x-api-key");
  const apiKey = envApiKey || forwardedApiKey || "";

  if (!baseUrl) {
    return NextResponse.json({ isLoggedIn: false }, { status: 500 });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) {
    return NextResponse.json(
      {
        isLoggedIn: false,
        debugCookies: [],
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
      Cookie: cookieHeader,
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        isLoggedIn: false,
        backendError: await res.text(),
        debugCookies,
      },
      { status: res.status },
    );
  }

  const raw = (await res.json()) as RawAuthResponse;

  return NextResponse.json({
    isLoggedIn: true,
    user: normalizeUserData(raw),
  });
}