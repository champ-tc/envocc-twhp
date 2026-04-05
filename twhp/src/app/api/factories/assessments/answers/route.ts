import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../_utils/logger";
import { forwardHeaders } from "../../../_utils/forwardHeaders";
import { validatePayload } from "../../../_utils/validatePayload";
import { assessmentAnswerSchema } from "../../../_schemas";

const API_BASE_URL = process.env.API_BASE_URL;

const ensureApiBase = () => {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }
  return null;
};

const targetUrl = () => {
  const base = API_BASE_URL?.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}/factories/assessments/answers`;
};

async function proxy(req: NextRequest, init: RequestInit) {
  const url = targetUrl();
  const headersObj = forwardHeaders(req, init.headers);

  try {
    const upstream = await fetch(url, {
      ...init,
      headers: headersObj,
      cache: "no-store",
    });

    const text = await upstream.text();
    
    if (!upstream.ok && upstream.status !== 404) {
      logger.error(`Upstream error from ${url}`, { status: upstream.status, body: text.slice(0, 500) });
      return new NextResponse(text, { status: upstream.status });
    }

    // ✅ If GET and 404, return empty array to prevent console error
    if (req.method === "GET" && upstream.status === 404) {
      return NextResponse.json([], { status: 200 });
    }

    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    if (!contentType.includes("application/json")) {
       logger.error(`Unexpected content type from upstream: ${contentType}`, { url });
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (err) {
    logger.error(`Proxy failure for ${url}`, err);
    return NextResponse.json({ error: "Gateway Error", details: "Failed to connect to upstream service" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;
  return await proxy(req, { method: "GET" });
}

export async function POST(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  const validationError = await validatePayload(req, { maxSize: 10 * 1024 * 1024 }); // 10MB for answers with possible evidence
  if (validationError) return validationError;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return await proxy(req, { method: "POST", body: formData });
  }

  try {
    const body = await req.json();
    const result = assessmentAnswerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data format", details: result.error.format() }, { status: 400 });
    }
    return await proxy(req, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  const validationError = await validatePayload(req, { maxSize: 10 * 1024 * 1024 });
  if (validationError) return validationError;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return await proxy(req, { method: "PATCH", body: formData });
  }

  try {
    const body = await req.json();
    // For PATCH we might want a partial schema or just reuse the same for now
    return await proxy(req, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
