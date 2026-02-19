export interface NormalizedUser {
  id: number;
  username: string;
  role: string;
  fullName: string;
  establishment: string;
}

type UserDetailFields = {
  first_name?: string;
  last_name?: string;
  factory_name?: string;
  province?: string;
  name_th?: string; // 👈 สำหรับ Factory
  [k: string]: unknown;
};

export interface RawAuthResponse {
  id: number;
  username: string;
  role: string;
  name_th?: string; // 👈 บาง backend อาจส่ง name_th ไว้ระดับ root
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

  // ===== Admin (DOED) =====
  if (role === "DOED") {
    const d = pickDetails(raw, ["adminDoed", "AdminsDoed"]);
    return {
      id: raw.id,
      username: raw.username,
      role,
      fullName: fullNameFromAdmin(d, raw.username),
      establishment: "กรมควบคุมโรค",
    };
  }

  // ===== Evaluator =====
  if (role === "Evaluator") {
    const d = pickDetails(raw, ["evaluator", "Evaluators"]);
    return {
      id: raw.id,
      username: raw.username,
      role,
      fullName: fullNameFromAdmin(d, raw.username),
      establishment: "ผู้ประเมินอิสระ",
    };
  }

  // ===== Provincial / Provicial =====
  if (role === "Provincial" || role === "Provicial") {
    const d = pickDetails(raw, ["provincial", "ProvicialOfficers"]);
    const province =
      typeof d.province === "string" && d.province ? ` ${d.province}` : "";

    return {
      id: raw.id,
      username: raw.username,
      role,
      fullName: fullNameFromAdmin(d, raw.username),
      establishment: `สำนักงานพลังงานจังหวัด${province}`,
    };
  }

  // ===== Factory (User) =====
  if (role === "Factory") {
    const d = pickDetails(raw, ["factory", "Factories"]);
    const fullName = d.name_th || raw.name_th || raw.username;

    const establishment = d.factory_name || "ไม่ระบุชื่อโรงงาน";

    return {
      id: raw.id,
      username: raw.username,
      role,
      fullName,
      establishment,
    };
  }

  // ===== Fallback =====
  return {
    id: raw.id,
    username: raw.username,
    role,
    fullName: raw.username,
    establishment: "ผู้ใช้งานทั่วไป",
  };
}
