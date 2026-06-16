// src/app/api/_utils/rateLimit.ts
import { NextResponse } from "next/server";

const tracker = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
    group?: string;
  } = { limit: 5, windowMs: 60000 },
) {
  const recordKey = `${options.group ?? "global"}:${key}`;
  const now = Date.now();
  const record = tracker.get(recordKey);

  if (!record || now > record.resetTime) {
    tracker.set(recordKey, { count: 1, resetTime: now + options.windowMs });
    return null;
  }

  record.count++;
  if (record.count > options.limit) {
    return NextResponse.json(
      { error: "Too many requests", details: "Please try again later." },
      { status: 429 },
    );
  }

  return null;
}
