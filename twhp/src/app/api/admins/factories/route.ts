import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL!;

export async function GET(req: NextRequest) {
  const validated = req.nextUrl.searchParams.get("validated");

  const url = new URL(`${API_BASE_URL}/admins/factories`);
  if (validated !== null) {
    url.searchParams.set("validated", validated);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      cookie: req.headers.get("cookie") || "",
      Authorization: req.headers.get("authorization") || "",
    },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
