import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../_utils/logger";
import { forwardHeaders } from "../../../_utils/forwardHeaders";
import { validatePayload } from "../../../_utils/validatePayload";

export async function POST(request: NextRequest) {
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 });
  }

  // 1. Validate Payload (Max 5MB)
  const validationError = await validatePayload(request, { maxSize: 5 * 1024 * 1024 });
  if (validationError) return validationError;

  try {
    const headersObj = forwardHeaders(request);

    // Core API expects POST for final submission
    const res = await fetch(`${baseUrl}/factories/assessments/submission`, {
      method: "POST",
      headers: headersObj,
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: "Unexpected upstream error format" };
      }

      logger.error("Submission failed upstream", { status: res.status, details: errorData });

      return NextResponse.json(
        { error: "Submission failed", details: errorData },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("Internal Submission Error", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: "Failed to process submission request" },
      { status: 500 }
    );
  }
}
