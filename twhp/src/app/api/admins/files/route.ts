import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

/**
 * Admin File Proxy API
 * Proxies requests to backend to get presigned URLs for admins.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get("fileName");

    if (!fileName) {
        return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
        logger.error("API_BASE_URL not configured for admin file download");
        return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    try {
        const headersObj = forwardHeaders(request);
        const res = await fetch(`${baseUrl}/file/presigned-url?fileName=${encodeURIComponent(fileName)}`, {
            method: "GET",
            headers: headersObj,
        });

        if (!res.ok) {
            const errorText = await res.text();
            logger.error(`Admin failed to get presigned URL for ${fileName}`, { status: res.status, error: errorText.slice(0, 500) });
            return NextResponse.json({ error: "Failed to get presigned url" }, { status: res.status });
        }

        const data = await res.json();
        // Normalize: always return { url: "..." }
        const url = data.url || data.presignedUrl || data.presigned_url;
        if (typeof url !== "string") {
            logger.error(`Invalid URL format received for admin: ${fileName}`, { data });
            return NextResponse.json({ error: "Invalid URL from backend", raw: data }, { status: 500 });
        }

        return NextResponse.json({ url });
    } catch (error: any) {
        logger.error("Error in admin file proxy route", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
