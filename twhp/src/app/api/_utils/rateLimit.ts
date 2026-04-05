// src/app/api/_utils/rateLimit.ts
import { NextResponse } from "next/server";

const tracker = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(ip: string, options: { limit: number; windowMs: number } = { limit: 5, windowMs: 60000 }) {
  const now = Date.now();
  const record = tracker.get(ip);

  if (!record || now > record.resetTime) {
    tracker.set(ip, { count: 1, resetTime: now + options.windowMs });
    return null;
  }

  record.count++;
  if (record.count > options.limit) {
    return NextResponse.json({ error: "Too many requests", details: "Please try again later." }, { status: 429 });
  }

  return null;
}
