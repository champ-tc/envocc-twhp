// src/app/api/_utils/validatePayload.ts
import { NextResponse } from "next/server";

export async function validatePayload(req: Request, options: { maxSize?: number; allowedTypes?: string[] } = {}) {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options;

  const contentLength = parseInt(req.headers.get("content-length") || "0");
  if (contentLength > maxSize) {
    return NextResponse.json({ error: "Payload too large", details: `Max size is ${maxSize / (1024 * 1024)}MB` }, { status: 413 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    if (!isAllowed) {
      return NextResponse.json({ error: "Invalid Content-Type", details: `Allowed: ${allowedTypes.join(", ")}` }, { status: 415 });
    }
  }

  return null;
}
