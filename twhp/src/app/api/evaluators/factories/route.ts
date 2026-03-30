import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL!;

export async function GET(req: NextRequest) {
  const url = new URL(`${API_BASE_URL}/evaluators/factories`);

  // Forward any search params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const envApiKey = process.env.TWHP_API_KEY;
  const forwardedApiKey = req.headers.get("x-api-key");
  const apiKey = envApiKey || forwardedApiKey || "";

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      cookie: req.headers.get("cookie") || "",
      Authorization: req.headers.get("authorization") || "",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    cache: "no-store",
  });

  const data = await res.json();

  console.log(data)
  return NextResponse.json(data, { status: res.status });
}
