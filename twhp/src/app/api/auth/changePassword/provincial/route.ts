import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl)
    return NextResponse.json({ message: "No base url" }, { status: 500 });

  const cookieHeader = request.headers.get("cookie") || "";

  try {
    const body = await request.json();
    console.log(`[PATCH Provincial] Sending body:`, body);

    const envApiKey = process.env.TWHP_API_KEY;
    const forwardedApiKey = request.headers.get("x-api-key");
    const apiKey = envApiKey || forwardedApiKey || "";

    const res = await fetch(`${baseUrl}/provincialOfficers/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log(`[PATCH Provincial] Response: ${res.status}`, text);

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
