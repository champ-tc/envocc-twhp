import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get("fileName");

    if (!fileName) {
        return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    const h: Record<string, string> = { Accept: "application/json" };

    // forward cookie
    const cookie = request.headers.get("cookie");
    if (cookie) h.cookie = cookie;

    // forward authorization
    const auth = request.headers.get("authorization");
    if (auth) h.authorization = auth;

    // Add X-API-Key
    const envApiKey = process.env.TWHP_API_KEY;
    const forwardedApiKey = request.headers.get("x-api-key");
    const apiKey = envApiKey || forwardedApiKey || "";
    if (apiKey) h["X-API-Key"] = apiKey;

    try {
        const res = await fetch(`${process.env.API_BASE_URL}/file/presigned-url?fileName=${encodeURIComponent(fileName)}`, {
            method: "GET",
            headers: h,
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: "Failed to get presigned url" },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error fetching presigned URL:", error);
        return NextResponse.json(
            { error: "Internal Server Error", message: error.message },
            { status: 500 }
        );
    }
}
