import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const baseUrl = process.env.API_BASE_URL;
    const envApiKey = process.env.TWHP_API_KEY;
    const cookieHeader = request.headers.get("cookie") || "";

    if (!baseUrl) {
        return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 });
    }

    try {
        // Core API expects POST for final submission
        const res = await fetch(`${baseUrl}/factories/assessments/submission`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Cookie": cookieHeader,
                ...(envApiKey ? { "X-API-Key": envApiKey } : {}),
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }
            
            return NextResponse.json(
                { error: "Submission failed", details: errorData },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Submission error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", message: error.message },
            { status: 500 }
        );
    }
}
