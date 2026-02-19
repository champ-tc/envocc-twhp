import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET() {
  if (!API_BASE_URL)
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );

  const r = await fetch(`${API_BASE_URL}/locations/provinces`, {
    cache: "no-store",
  });
  const text = await r.text();

  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
