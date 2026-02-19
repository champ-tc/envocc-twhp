import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type EmployeeKeys =
  | "th"
  | "mm"
  | "kh"
  | "la"
  | "vn"
  | "cn"
  | "ph"
  | "jp"
  | "in"
  | "other";
type Sex = "m" | "f";
type EmployeeState = Record<`employee_${EmployeeKeys}_${Sex}`, number>;

type StandardState = {
  standard_HC: boolean;
  standard_SAN: boolean;
  standard_wellness: boolean;
  standard_safety: boolean;
  standard_TIS18001: boolean;
  standard_ISO45001: boolean;
  standard_ISO14001: boolean;
  standard_zero: boolean;
  standard_5S: boolean;
  standard_HAS: boolean;
};

type SafetyOfficerState = {
  safety_officer_prefix: string;
  safety_officer_first_name: string;
  safety_officer_last_name: string;
  safety_officer_position: string;
  safety_officer_email: string;
  safety_officer_phone: string;
  safety_officer_lineID: string;
};

type EnrollBody = {
  employee: Partial<EmployeeState>;
  standard: Partial<StandardState>;
  safety_officer: Partial<SafetyOfficerState>;
};

const EMP_CODES: EmployeeKeys[] = [
  "th",
  "mm",
  "kh",
  "la",
  "vn",
  "cn",
  "ph",
  "jp",
  "in",
  "other",
];

const STD_KEYS: (keyof StandardState)[] = [
  "standard_HC",
  "standard_SAN",
  "standard_wellness",
  "standard_safety",
  "standard_TIS18001",
  "standard_ISO45001",
  "standard_ISO14001",
  "standard_zero",
  "standard_5S",
  "standard_HAS",
];

const toInt = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

// กัน "false" (string) กลายเป็น true
const toBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0" || s === "") return false;
  }
  return false;
};

const ensureApiBase = () => {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Missing API_BASE_URL" },
      { status: 500 },
    );
  }
  return null;
};

const targetUrl = () => `${API_BASE_URL}/factories/enroll`;

function forwardHeaders(
  req: NextRequest,
  initHeaders?: HeadersInit,
): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };

  // copy initHeaders
  if (initHeaders) {
    if (Array.isArray(initHeaders)) {
      for (const [k, v] of initHeaders) h[k] = v;
    } else if (initHeaders instanceof Headers) {
      initHeaders.forEach((v, k) => (h[k] = v));
    } else {
      Object.assign(h, initHeaders);
    }
  }

  // forward cookie (ถ้ามี)
  const cookie = req.headers.get("cookie");
  if (cookie) h.cookie = cookie;

  // forward authorization (ถ้ามี)
  const auth = req.headers.get("authorization");
  if (auth) h.authorization = auth;

  return h;
}

async function proxy(req: NextRequest, init: RequestInit) {
  const upstream = await fetch(targetUrl(), {
    ...init,
    headers: forwardHeaders(req, init.headers),
    cache: "no-store",
  });

  const text = await upstream.text();

  if (!upstream.ok) {
    console.error("[api/factories/enroll][UPSTREAM ERROR]", {
      status: upstream.status,
      url: targetUrl(),
      response: text?.slice(0, 2000),
    });
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ??
        "application/json; charset=utf-8",
    },
  });
}

// ✅ GET
export async function GET(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  try {
    return await proxy(req, { method: "GET" });
  } catch (e) {
    console.error("[api/factories/enroll][GET] error:", e);
    return NextResponse.json(
      { message: "Upstream request failed" },
      { status: 502 },
    );
  }
}

// ✅ POST (ส่งแบบรวมก้อนเดียว/flat เท่านั้น)
export async function POST(req: NextRequest) {
  const err = ensureApiBase();
  if (err) return err;

  const body = (await req.json().catch(() => null)) as EnrollBody | null;
  if (!body?.employee || !body?.standard || !body?.safety_officer) {
    return NextResponse.json(
      { message: "employee, standard, safety_officer are required" },
      { status: 400 },
    );
  }

  // employee -> number
  const cleanEmployee: EmployeeState = {} as EmployeeState;
  for (const c of EMP_CODES) {
    cleanEmployee[`employee_${c}_m`] = toInt(body.employee[`employee_${c}_m`]);
    cleanEmployee[`employee_${c}_f`] = toInt(body.employee[`employee_${c}_f`]);
  }

  // standard -> boolean strict
  const cleanStandard: StandardState = {} as StandardState;
  for (const k of STD_KEYS) cleanStandard[k] = toBool(body.standard[k]);

  // officer -> string
  const o = body.safety_officer;
  const cleanOfficer: SafetyOfficerState = {
    safety_officer_prefix: String(o.safety_officer_prefix ?? ""),
    safety_officer_first_name: String(o.safety_officer_first_name ?? ""),
    safety_officer_last_name: String(o.safety_officer_last_name ?? ""),
    safety_officer_position: String(o.safety_officer_position ?? ""),
    safety_officer_email: String(o.safety_officer_email ?? ""),
    safety_officer_phone: String(o.safety_officer_phone ?? ""),
    safety_officer_lineID: String(o.safety_officer_lineID ?? ""),
  };

  // ✅ รวมทุกอย่างเป็นก้อนเดียว
  const payloadFlat = { ...cleanEmployee, ...cleanStandard, ...cleanOfficer };

  // log เฉพาะ keys (ไม่พิมพ์ข้อมูลส่วนบุคคลทั้งหมด)
  console.log(
    "[api/factories/enroll][POST] payloadFlat keys:",
    Object.keys(payloadFlat),
  );

  try {
    return await proxy(req, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFlat),
    });
  } catch (e) {
    console.error("[api/factories/enroll][POST] error:", e);
    return NextResponse.json(
      { message: "Upstream request failed" },
      { status: 502 },
    );
  }
}
