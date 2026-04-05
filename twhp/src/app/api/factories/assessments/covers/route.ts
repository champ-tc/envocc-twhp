import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../_utils/logger";
import { forwardHeaders } from "../../../_utils/forwardHeaders";
import { validatePayload } from "../../../_utils/validatePayload";

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

const targetUrl = () => `${API_BASE_URL}/factories/assessments/covers`;

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

    if (!upstream.ok) {
      logger.error(`Upstream error from ${url}`, { status: upstream.status, body: text.slice(0, 500) });
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ??
          "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    logger.error(`Proxy failure for ${url}`, err);
    return NextResponse.json({ error: "Gateway Error" }, { status: 502 });
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

  const validationError = await validatePayload(req, {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["multipart/form-data", "application/json"]
  });
  if (validationError) return validationError;

  return await proxy(req, { method: "POST" });
}
