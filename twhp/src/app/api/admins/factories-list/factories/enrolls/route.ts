import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildUrl(baseUrl: string, path: string, qs: string) {
    const base = baseUrl.replace(/\/+$/, "");
    return `${base}${path}${qs ? `?${qs}` : ""}`;
}

export async function GET(request: NextRequest) {
    try {
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

        const qs = request.nextUrl.searchParams.toString();
        const cookieHeader = request.headers.get("cookie") || "";

        const targetUrl = buildUrl(
            baseUrl,
            "/evaluators/factories?validated=true",
            qs,
        );

        const upstream = await fetch(targetUrl, {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                ...(apiKey ? { "X-API-Key": apiKey } : {}),
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            },
        });

        const contentType =
            upstream.headers.get("content-type") ||
            "application/json; charset=utf-8";

        const bodyText = await upstream.text();

        return new NextResponse(bodyText, {
            status: upstream.status,
            headers: {
                "Content-Type": contentType,
            },
        });
    } catch (error) {
        console.error("GET /api/admin/factories-list/factories/enrolls error:", error);

        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" },
            { status: 500 },
        );
    }
}