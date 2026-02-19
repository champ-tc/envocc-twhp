import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type PatchBody = {
  account_id: number; // ต้องส่งมา
  is_validate: "true" | "false"; // backend ต้องการ boolean string
};

type Ctx = { params: Promise<{ id: string }> }; // ✅ ให้ตรงกับที่ Next.js validate

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }

  const { id } = await ctx.params; // ✅ await ตาม type ที่ Next.js สร้างมา
  const cookieHeader = req.headers.get("cookie") || "";

  const body = (await req.json().catch(() => null)) as PatchBody | null;

  if (!body || typeof body.account_id !== "number") {
    return NextResponse.json(
      { message: "account_id is required (number)" },
      { status: 400 },
    );
  }

  if (body.is_validate !== "true" && body.is_validate !== "false") {
    return NextResponse.json(
      { message: 'is_validate must be "true" or "false" (string)' },
      { status: 400 },
    );
  }

  // (optional) เช็คว่าพารามิเตอร์ใน path ตรงกับ body.account_id
  const pathId = Number(id);
  if (Number.isFinite(pathId) && pathId !== body.account_id) {
    return NextResponse.json(
      { message: "id in path must match body.account_id" },
      { status: 400 },
    );
  }

  const targetUrl = `${API_BASE_URL}/admins/factory/validate/${encodeURIComponent(
    String(body.account_id),
  )}`;

  const res = await fetch(targetUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader, // forward cookie
    },
    body: JSON.stringify({
      account_id: body.account_id,
      is_validate: body.is_validate,
    }),
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
    },
  });
}
