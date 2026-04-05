import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../_utils/logger";
import { forwardHeaders } from "../../_utils/forwardHeaders";

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(req: NextRequest) {
  try {
    if (!API_BASE_URL) {
      logger.error("API_BASE_URL not configured for admin enrolls");
      return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const validated = searchParams.get("validated");
    const enrolled = searchParams.get("enrolled");

    const factoryId =
      searchParams.get("factory_id") ||
      searchParams.get("factoryId") ||
      searchParams.get("id") ||
      searchParams.get("account_id");

    const headersObj = forwardHeaders(req, { "Content-Type": "application/json" });

    // A) LIST: approved + enrolled
    if (validated !== null || enrolled !== null) {
      if (validated !== "true" || enrolled !== "true") {
        return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
      }

      const targetUrl = `${API_BASE_URL}/admins/factories?validated=true&enrolled=true`;
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: headersObj,
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        logger.error(`Admin factories list failed`, { status: res.status, error: text.slice(0, 500) });
        return NextResponse.json({ error: "Upstream Error", details: text }, { status: res.status });
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return NextResponse.json({ error: "Invalid upstream content type" }, { status: 502 });
      }

      const data = await res.json();
      return NextResponse.json(data);
    }

    // B) DETAIL: enrolls by factory id
    if (factoryId) {
      const targetUrl = `${API_BASE_URL}/admins/enrolls?factory_id=${encodeURIComponent(factoryId)}`;
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: headersObj,
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        logger.error(`Admin enroll detail failed`, { status: res.status, error: text.slice(0, 500) });
        return NextResponse.json({ error: "Upstream Error", details: text }, { status: res.status });
      }

      const data = await res.json();
      let result = data;

      if (Array.isArray(data)) {
        const found = data.find((item: any) =>
          String(item.factory_id) === String(factoryId) ||
          String(item.factoryId) === String(factoryId)
        );
        result = found || (data.length > 0 ? data[0] : null);
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
  } catch (error) {
    logger.error("Admin Enrolls API Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
