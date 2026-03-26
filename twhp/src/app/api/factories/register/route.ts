import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type RegisterBody = {
  username: string;
  password: string;
  email: string;
  factoryType: number;
  nameTh: string;
  nameEn: string;
  tsicCode: string;
  addressNo: string;
  soi: string;
  road: string;
  zipcode: string;
  phoneNumber: string;
  faxNumber: string;
  subdistrictId: number;
};

function isRegisterBody(v: unknown): v is RegisterBody {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const reqStr = (k: string) => typeof o[k] === "string" && (o[k] as string).trim().length > 0;
  const reqNum = (k: string) => typeof o[k] === "number" && Number.isFinite(o[k] as number);

  return (
    reqStr("username") &&
    reqStr("password") &&
    reqStr("email") &&
    reqNum("factoryType") &&
    reqStr("nameTh") &&
    reqStr("nameEn") &&
    reqStr("tsicCode") &&
    reqStr("addressNo") &&
    typeof o["soi"] === "string" &&
    typeof o["road"] === "string" &&
    reqStr("zipcode") &&
    reqStr("phoneNumber") &&
    typeof o["faxNumber"] === "string" &&
    reqNum("subdistrictId")
  );
}

export async function POST(req: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ message: "Missing API_BASE_URL" }, { status: 500 });
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

  const target = `${API_BASE_URL}/factories/register`;

  try {
    const r = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    const contentType = r.headers.get("content-type") || "";

    // ✅ ทำให้ response กลับเป็น JSON เสมอ
    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        return NextResponse.json(json, { status: r.status });
      } catch {
        return NextResponse.json({ message: text }, { status: r.status });
      }
    }

    return NextResponse.json({ message: text }, { status: r.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upstream fetch failed";
    return NextResponse.json({ message: msg }, { status: 502 });
  }
}