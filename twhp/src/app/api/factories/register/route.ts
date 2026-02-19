import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type RegisterBody = {
  username: string;
  password: string;
  email: string;
  factory_type: number;
  name_th: string;
  name_en: string;
  tsic_code: string;
  address_no: string;
  soi: string;
  road: string;
  zipcode: string;
  phone_number: string;
  fax_number: string;
  subdistrict_id: number;
};

function isRegisterBody(v: unknown): v is RegisterBody {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const reqStr = (k: string) =>
    typeof o[k] === "string" && (o[k] as string).length > 0;
  const reqNum = (k: string) =>
    typeof o[k] === "number" && Number.isFinite(o[k] as number);
  return (
    reqStr("username") &&
    reqStr("password") &&
    reqStr("email") &&
    reqNum("factory_type") &&
    reqStr("name_th") &&
    reqStr("name_en") &&
    reqStr("tsic_code") &&
    reqStr("address_no") &&
    typeof o["soi"] === "string" &&
    typeof o["road"] === "string" &&
    reqStr("zipcode") &&
    reqStr("phone_number") &&
    typeof o["fax_number"] === "string" &&
    reqNum("subdistrict_id")
  );
}

export async function POST(req: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!isRegisterBody(body)) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const target = `${API_BASE_URL}/factories/register`; // ✅ /twhp/api/factories/register อยู่ใน API_BASE_URL แล้ว
  const r = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
