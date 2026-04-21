import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../_utils/logger";
import { forwardHeaders } from "../../../../_utils/forwardHeaders";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
        logger.error("API_BASE_URL not configured for admin provincialOfficers enrolls");
        return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    try {
        const validated = request.nextUrl.searchParams.get("validated") ?? "true";
        const qs = request.nextUrl.searchParams.toString();

        // Remove validated from qs if it exists to avoid duplication
        const params = new URLSearchParams(qs);
        params.delete("validated");
        const remainingQs = params.toString();

        const base = baseUrl.replace(/\/+$/, "");
        const targetUrl = `${base}/provincialOfficers/factories?validated=${validated}${remainingQs ? `&${remainingQs}` : ""}`;

        const headersObj = forwardHeaders(request);

        const upstream = await fetch(targetUrl, {
            method: "GET",
            cache: "no-store",
            headers: headersObj,
        });

        const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
        const bodyText = await upstream.text();

        if (!upstream.ok) {
            logger.error(`Admin provincialOfficers enrolls upstream failed`, { status: upstream.status, body: bodyText.slice(0, 500) });
        }

        return new NextResponse(bodyText, {
            status: upstream.status,
            headers: { "Content-Type": contentType },
        });
    } catch (error) {
        logger.error("Admin provincialOfficers enrolls API error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}