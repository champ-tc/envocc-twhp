export interface NormalizedUser {
  id: number;
  role: string;
  fullName: string;
  provinceId?: number;
  region?: number;
  change_pw?: boolean;
  eval_level?: string;
}

type UserDetailFields = {
  first_name?: string;
  last_name?: string;
  factory_name?: string;
  province?: string;
  name_th?: string; // สำหรับ Factory
  province_id?: number;
  region?: number;
  eval_level?: string; // เพิ่ม eval_level
  [k: string]: unknown;
};

export interface RawAuthResponse {
  id: number;
  username: string;
  role: string;
  name_th?: string; // บาง backend อาจส่ง name_th ไว้ระดับ root
  full_name?: string; // เพิ่ม full_name
  change_pw?: boolean;
  eval_level?: string; // เพิ่ม eval_level กรณีส่งมาระดับ root
  [k: string]: unknown;
}

function pickDetails(raw: RawAuthResponse, keys: string[]): UserDetailFields {
  for (const k of keys) {
    const v = raw[k];
    if (v && typeof v === "object") return v as UserDetailFields;
  }
  return {};
}

function fullNameFromAdmin(details: UserDetailFields, fallback: string) {
  const name = `${details.first_name ?? ""} ${details.last_name ?? ""}`.trim();
  return name || fallback;
}

export function normalizeUserData(raw: RawAuthResponse): NormalizedUser {
  const role = raw.role;
  const fullName = raw.full_name || raw.username;

  // ===== Admin (DOED) =====
  if (role === "DOED") {
    const d = pickDetails(raw, ["adminDoed", "AdminsDoed"]);
    return {
      id: raw.id,
      role,
      fullName,
      change_pw: raw.change_pw,
      eval_level: typeof d.eval_level === "string" ? d.eval_level : raw.eval_level,
    };
  }

  // ===== Evaluator =====
  if (role === "Evaluator") {
    const d = pickDetails(raw, ["evaluator", "Evaluators"]);
    const eval_level =
      typeof d.eval_level === "string" && d.eval_level.trim() ? d.eval_level : raw.eval_level;

    return {
      id: raw.id,
      role,
      fullName,
      change_pw: raw.change_pw,
      eval_level,
    };
  }

  // ===== Provincial / Provicial =====
  if (role === "Provincial" || role === "Provicial" || role === "ODPC") {
    const d = pickDetails(raw, [
      "provincial",
      "ProvicialOfficers",
      "odpc",
      "OdpcOfficers",
    ]);
    const province =
      typeof d.province === "string" && d.province ? ` ${d.province}` : "";

    return {
      id: raw.id,
      role,
      fullName,
      provinceId: typeof d.province_id === "number" ? d.province_id : undefined,
      region: typeof d.region === "number" ? d.region : undefined,
      change_pw: raw.change_pw,
      eval_level: typeof d.eval_level === "string" ? d.eval_level : raw.eval_level,
    };
  }

  // ===== Factory (User) =====
  if (role === "Factory") {
    const d = pickDetails(raw, ["factory", "Factories"]);

    return {
      id: raw.id,
      role,
      fullName,
      change_pw: raw.change_pw,
      eval_level: typeof d.eval_level === "string" ? d.eval_level : raw.eval_level,
    };
  }

  // ===== Fallback =====
  return {
    id: raw.id,
    role,
    fullName,
    change_pw: raw.change_pw,
    eval_level: raw.eval_level,
  };
}