"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import type { NormalizedUser } from "@/lib/auth-utils";
import { isAdminRole } from "@/lib/role-redirect";

type AuthResponse = { isLoggedIn: boolean; user: NormalizedUser };

// ===== Factory =====
type Factory = {
  account_id: number;
  name_th?: string;
  name_en?: string;
  address_no?: string;
  soi?: string;
  road?: string;
  zipcode?: string;
  phone_number?: string;
  fax_number?: string;
  is_validate?: boolean;
  province_name_th?: string;
  district_name_th?: string;
  subdistrict_name_th?: string;
};

// ===== List of enrolled factories (from /admins/factories?validated=true&enrolled=true) =====
type EnrolledFactoryRow = {
  account_id: number;
  [k: string]: unknown;
};

// ===== Enroll Detail =====
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
type EmployeeField = `employee_${EmployeeKeys}_${Sex}`;
type EmployeeState = Partial<Record<EmployeeField, number>>;

type StandardState = Partial<{
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
}>;
type StandardField = keyof Required<StandardState>;

type SafetyOfficerState = Partial<{
  safety_officer_prefix: string;
  safety_officer_first_name: string;
  safety_officer_last_name: string;
  safety_officer_position: string;
  safety_officer_email: string;
  safety_officer_phone: string;
  safety_officer_lineID: string;
}>;
type OfficerField = keyof Required<SafetyOfficerState>;

type EnrollDetail = {
  account_id?: number;
  factory_id?: number;
  created_at?: string;
  updated_at?: string;
  year_thai?: string | number;
  status?: string;

  employee?: EmployeeState;
  standard?: StandardState;
  safety_officer?: SafetyOfficerState;

  // เผื่อ backend ส่งแบบ flattened
  [k: string]: unknown;
};

const EMP_ROWS: Array<{ code: EmployeeKeys; label: string }> = [
  { code: "th", label: "ไทย" },
  { code: "mm", label: "เมียนมาร์" },
  { code: "kh", label: "กัมพูชา" },
  { code: "la", label: "ลาว" },
  { code: "vn", label: "เวียดนาม" },
  { code: "cn", label: "จีน" },
  { code: "ph", label: "ฟิลิปปินส์" },
  { code: "jp", label: "ญี่ปุ่น" },
  { code: "in", label: "อินเดีย" },
  { code: "other", label: "อื่นๆ" },
];

const STD_ROWS: Array<{ k: StandardField; label: string }> = [
  { k: "standard_HC", label: "Healthy Canteen" },
  { k: "standard_SAN", label: "SAN" },
  { k: "standard_wellness", label: "Wellness" },
  { k: "standard_safety", label: "Safety" },
  { k: "standard_TIS18001", label: "TIS 18001" },
  { k: "standard_ISO45001", label: "ISO 45001" },
  { k: "standard_ISO14001", label: "ISO 14001" },
  { k: "standard_zero", label: "Zero Accident" },
  { k: "standard_5S", label: "5S" },
  { k: "standard_HAS", label: "HAS" },
];

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function isAbortError(e: unknown) {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (typeof e === "object" &&
      e !== null &&
      "name" in e &&
      (e as { name?: string }).name === "AbortError")
  );
}

function thAddress(f: Factory) {
  const parts = [
    f.address_no ? `เลขที่ ${f.address_no}` : "",
    f.soi ? `ซอย${f.soi}` : "",
    f.road ? `ถนน${f.road}` : "",
    f.subdistrict_name_th ? `ต.${f.subdistrict_name_th}` : "",
    f.district_name_th ? `อ.${f.district_name_th}` : "",
    f.province_name_th ? `จ.${f.province_name_th}` : "",
    f.zipcode ? f.zipcode : "",
  ].filter(Boolean);
  return parts.join(" ");
}

/* =========================
   ✅ NO any helpers
========================= */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getFromFlat(d: EnrollDetail, key: string): unknown {
  // ใช้ in เพื่อกัน runtime error และไม่ใช้ any
  return key in d ? (d as Record<string, unknown>)[key] : undefined;
}

function employeeKey(code: EmployeeKeys, sex: Sex): EmployeeField {
  return `employee_${code}_${sex}` as EmployeeField;
}

// รองรับทั้ง nested และ flattened
function getEmployeeValue(d: EnrollDetail | null, key: EmployeeField): number {
  if (!d) return 0;

  const nested: unknown =
    d.employee && isRecord(d.employee)
      ? (d.employee as Record<string, unknown>)[key]
      : undefined;

  const flat: unknown = getFromFlat(d, key);

  const v = nested ?? flat;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function getStandardValue(d: EnrollDetail | null, key: StandardField): boolean {
  if (!d) return false;

  const nested: unknown =
    d.standard && isRecord(d.standard)
      ? (d.standard as Record<string, unknown>)[key]
      : undefined;

  const flat: unknown = getFromFlat(d, String(key));
  const v = nested ?? flat;

  return v === true;
}

function getOfficerValue(d: EnrollDetail | null, key: OfficerField): string {
  if (!d) return "";

  const nested: unknown =
    d.safety_officer && isRecord(d.safety_officer)
      ? (d.safety_officer as Record<string, unknown>)[key]
      : undefined;

  const flat: unknown = getFromFlat(d, String(key));
  const v = nested ?? flat;

  return typeof v === "string" ? v : "";
}

function toEnrollDetail(json: unknown): EnrollDetail | null {
  // รองรับ object หรือ array[0]
  if (Array.isArray(json)) {
    const first = json[0];
    return isRecord(first) ? (first as EnrollDetail) : null;
  }
  return isRecord(json) ? (json as EnrollDetail) : null;
}

export default function AdminAssessPage() {
  const router = useRouter();

  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  const [factories, setFactories] = useState<Factory[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Factory | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<EnrollDetail | null>(null);

  // ===== AUTH (Admin only) =====
  useEffect(() => {
    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        setError("");
        setLoadingAuth(true);

        const res = await fetch("/api/auth/authentication", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });

        if (!res.ok) {
          router.replace("/");
          return;
        }

        const raw = await res.text();
        const data = parseJsonSafe<AuthResponse>(raw);

        if (!data?.isLoggedIn || !data.user) {
          router.replace("/");
          return;
        }

        if (!isAdminRole(data.user.role)) {
          router.replace("/Factories/main");
          return;
        }

        if (!alive) return;
        setUser(data.user);
      } catch (e) {
        if (isAbortError(e)) return;
        console.error("AUTH ERROR:", e);
        router.replace("/");
      } finally {
        if (alive) setLoadingAuth(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [router]);

  // ===== LOAD DATA: factories(validated=true) + enrolled(validated=true&enrolled=true) =====
  useEffect(() => {
    if (!user) return;

    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        setLoadingData(true);
        setError("");

        const fRes = await fetch("/api/admins/factories?validated=true", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });

        const fRaw = await fRes.text();
        const fData = parseJsonSafe<Factory[]>(fRaw);

        if (!fRes.ok || !Array.isArray(fData)) {
          const msg =
            parseJsonSafe<{ message?: string }>(fRaw)?.message ||
            fRaw ||
            `โหลดรายชื่อโรงงานไม่สำเร็จ (status ${fRes.status})`;
          throw new Error(msg);
        }

        const eRes = await fetch(
          "/api/admins/enrolls?validated=true&enrolled=true",
          {
            credentials: "include",
            cache: "no-store",
            signal: ac.signal,
          },
        );

        const eRaw = await eRes.text();
        const eData = parseJsonSafe<EnrolledFactoryRow[]>(eRaw);

        const enrolledSet = new Set<number>();
        if (eRes.ok && Array.isArray(eData)) {
          for (const row of eData) {
            if (typeof row?.account_id === "number")
              enrolledSet.add(row.account_id);
          }
        }

        if (!alive) return;
        setFactories(fData);
        setEnrolledIds(enrolledSet);
      } catch (e) {
        if (isAbortError(e)) return;
        console.error(e);
        if (!alive) return;
        setError(
          e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล",
        );
      } finally {
        if (alive) setLoadingData(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [user]);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = factories.map((f) => ({
      f,
      enrolled: enrolledIds.has(f.account_id),
    }));

    if (!kw) return list;

    return list.filter(({ f }) => {
      const name = (f.name_th || f.name_en || "").toLowerCase();
      const pv = (f.province_name_th || "").toLowerCase();
      const addr = thAddress(f).toLowerCase();
      return name.includes(kw) || pv.includes(kw) || addr.includes(kw);
    });
  }, [factories, enrolledIds, q]);

  const stats = useMemo(() => {
    const total = rows.length;
    const enrolled = rows.filter((x) => x.enrolled).length;
    return { total, enrolled, notEnrolled: total - enrolled };
  }, [rows]);

  // ===== fetch enroll detail when open modal =====
  useEffect(() => {
    if (!open || !selected) return;

    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        setDetailLoading(true);
        setDetailError("");
        setDetail(null);

        const res = await fetch(
          `/api/admins/enrolls?factory_id=${encodeURIComponent(
            String(selected.account_id),
          )}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: ac.signal,
          },
        );

        const raw = await res.text();
        const json = parseJsonSafe<unknown>(raw); // ✅ ไม่ใช้ any

        if (!res.ok) {
          const msg =
            isRecord(json) && typeof json.message === "string"
              ? json.message
              : raw || `โหลดข้อมูลการสมัครไม่สำเร็จ (status ${res.status})`;
          throw new Error(msg);
        }

        const detailObj = toEnrollDetail(json);
        if (!alive) return;
        setDetail(detailObj);
      } catch (e) {
        if (isAbortError(e)) return;
        console.error(e);
        if (!alive) return;
        setDetailError(
          e instanceof Error ? e.message : "โหลดข้อมูลการสมัครไม่สำเร็จ",
        );
      } finally {
        if (alive) setDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [open, selected]);

  const empTotals = useMemo(() => {
    let m = 0;
    let f = 0;
    for (const { code } of EMP_ROWS) {
      m += getEmployeeValue(detail, employeeKey(code, "m"));
      f += getEmployeeValue(detail, employeeKey(code, "f"));
    }
    return { m, f, all: m + f };
  }, [detail]);

  if (loadingAuth) return <div className="p-10 text-black">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-black">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F3F6F4]">
        <Navbar
          title="รายชื่อสถานประกอบการสมัครโครงการ"
          fullName={user.fullName}
          userRole={user.role}
          establishment={user.establishment}
          username={user.username}
        />

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-black">
                  รายชื่อสถานประกอบการสมัครโครงการ
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <StatPill title="ทั้งหมด" value={stats.total} />
                <StatPill
                  title="สมัครแล้ว"
                  value={stats.enrolled}
                  tone="green"
                />
                <StatPill title="ยังไม่สมัคร" value={stats.notEnrolled} />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3 items-center">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา: ชื่อสถานประกอบการ / จังหวัด / ที่อยู่"
                className="w-full md:w-[420px] rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#2E8B57]/30"
              />

              <button
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-white border border-gray-200 px-4 py-3 font-semibold hover:bg-gray-50"
                disabled={loadingData}
              >
                {loadingData ? "กำลังโหลด..." : "รีเฟรช"}
              </button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-[1050px] w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "ชื่อสถานประกอบการ",
                      "ที่อยู่",
                      "จังหวัด",
                      "สถานะสมัคร",
                      "จัดการ",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-sm font-semibold text-black"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-gray-600"
                      >
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-gray-600"
                      >
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ f, enrolled }) => (
                      <tr
                        key={f.account_id}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-black">
                          {f.name_th || f.name_en || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {thAddress(f) || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {f.province_name_th || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {enrolled ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-900">
                              สมัครแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-800">
                              ยังไม่สมัคร
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setSelected(f);
                              setOpen(true);
                            }}
                            className="rounded-xl bg-[#2E8B57] px-4 py-2 text-white text-sm font-semibold hover:bg-[#277549]"
                          >
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== Modal ===== */}
          {open && selected ? (
            <ModalShell
              title="รายละเอียดโรงงาน & ข้อมูลการสมัคร"
              onClose={() => {
                setOpen(false);
                setSelected(null);
                setDetail(null);
                setDetailError("");
                setDetailLoading(false);
              }}
            >
              <div className="space-y-5">
                <SectionTitle>ข้อมูลโรงงาน</SectionTitle>
                <div className="space-y-2">
                  <InfoRow
                    label="ชื่อโรงงาน"
                    value={selected.name_th || selected.name_en || "-"}
                  />
                  <InfoRow
                    label="จังหวัด"
                    value={selected.province_name_th || "-"}
                  />
                  <InfoRow label="ที่อยู่" value={thAddress(selected) || "-"} />
                  <InfoRow
                    label="โทรศัพท์"
                    value={selected.phone_number || "-"}
                  />
                  <InfoRow
                    label="validated"
                    value={String(selected.is_validate ?? false)}
                  />
                  <InfoRow
                    label="สถานะสมัคร"
                    value={
                      enrolledIds.has(selected.account_id)
                        ? "สมัครแล้ว"
                        : "ยังไม่สมัคร"
                    }
                  />
                </div>

                <div className="border-t border-gray-200 pt-5" />

                <SectionTitle>ข้อมูลการสมัคร</SectionTitle>

                {detailLoading ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                    กำลังโหลดข้อมูลการสมัคร...
                  </div>
                ) : detailError ? (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    {detailError}
                  </div>
                ) : !detail ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                    ไม่พบข้อมูลการสมัครของโรงงานนี้
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* employee */}
                    <div className="rounded-3xl bg-white border border-gray-200 p-5">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="text-base font-semibold text-black">
                          จำนวนพนักงาน (แยกประเทศ/ชาย/หญิง)
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <MiniPill title="ชาย" value={empTotals.m} />
                          <MiniPill title="หญิง" value={empTotals.f} />
                          <MiniPill
                            title="รวม"
                            value={empTotals.all}
                            emphasis
                          />
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
                        <table className="min-w-[700px] w-full bg-white">
                          <thead className="bg-gray-50">
                            <tr>
                              {["ประเทศ", "ชาย", "หญิง", "รวม"].map((h) => (
                                <th
                                  key={h}
                                  className="text-left px-4 py-3 text-sm font-semibold text-black"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {EMP_ROWS.map(({ code, label }) => {
                              const m = getEmployeeValue(
                                detail,
                                employeeKey(code, "m"),
                              );
                              const f = getEmployeeValue(
                                detail,
                                employeeKey(code, "f"),
                              );

                              return (
                                <tr
                                  key={code}
                                  className="border-t border-gray-100"
                                >
                                  <td className="px-4 py-3 text-sm font-medium text-black">
                                    {label}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-black">
                                    {m}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-black">
                                    {f}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-black">
                                    {m + f}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* standard */}
                    <div className="rounded-3xl bg-white border border-gray-200 p-5">
                      <div className="text-base font-semibold text-black">
                        มาตรฐานความปลอดภัย
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {STD_ROWS.map(({ k, label }) => {
                          const checked = getStandardValue(detail, k);
                          return (
                            <div
                              key={String(k)}
                              className={`rounded-2xl border px-4 py-3 flex items-center justify-between ${checked
                                ? "bg-green-50 border-green-200"
                                : "bg-gray-50 border-gray-200"
                                }`}
                            >
                              <div className="text-sm font-medium text-black">
                                {label}
                              </div>
                              <div
                                className={`text-xs font-semibold ${checked ? "text-green-900" : "text-gray-600"
                                  }`}
                              >
                                {checked ? "มี" : "ไม่มี"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* officer */}
                    <div className="rounded-3xl bg-white border border-gray-200 p-5">
                      <div className="text-base font-semibold text-black">
                        ผู้ประสานงาน
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow
                          label="ชื่อ-สกุล"
                          value={
                            `${getOfficerValue(detail, "safety_officer_prefix")} ${getOfficerValue(
                              detail,
                              "safety_officer_first_name",
                            )} ${getOfficerValue(detail, "safety_officer_last_name")}`.trim() ||
                            "-"
                          }
                        />
                        <InfoRow
                          label="ตำแหน่ง"
                          value={
                            getOfficerValue(
                              detail,
                              "safety_officer_position",
                            ) || "-"
                          }
                        />
                        <InfoRow
                          label="โทรศัพท์"
                          value={
                            getOfficerValue(detail, "safety_officer_phone") ||
                            "-"
                          }
                        />
                        <InfoRow
                          label="อีเมล"
                          value={
                            getOfficerValue(detail, "safety_officer_email") ||
                            "-"
                          }
                        />
                        <InfoRow
                          label="LINE ID"
                          value={
                            getOfficerValue(detail, "safety_officer_lineID") ||
                            "-"
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ModalShell>
          ) : null}
        </main>
      </div>
    </div>
  );
}

/* -------- UI small components -------- */

function StatPill({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone?: "green";
}) {
  const cls =
    tone === "green"
      ? "bg-green-50 border-green-200 text-green-900"
      : "bg-gray-50 border-gray-200 text-black";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${cls}`}>
      <div className="text-xs opacity-80">{title}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function MiniPill({
  title,
  value,
  emphasis,
}: {
  title: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 ${emphasis
        ? "bg-[#E9F7EF] border-[#BFE6D1]"
        : "bg-gray-50 border-gray-200"
        }`}
    >
      <div className="text-[11px] text-gray-700">{title}</div>
      <div className="text-base font-bold text-black">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-lg font-semibold text-black">{children}</div>;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="ปิดหน้าต่าง"
      />
      <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
        <div className="mx-auto w-full max-w-5xl rounded-3xl bg-[#F3F6F4] border border-gray-200 shadow-xl">
          <div className="flex items-start justify-between gap-4 p-5 md:p-6 border-b border-gray-200 bg-white rounded-t-3xl">
            <div>
              <div className="text-lg md:text-xl font-semibold text-black">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 text-sm text-gray-600">{subtitle}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-2xl bg-white border border-gray-200 px-4 py-2 text-black font-semibold hover:bg-gray-50"
              onClick={onClose}
            >
              ปิด
            </button>
          </div>
          <div className="p-5 md:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-2xl bg-gray-50 border border-gray-200 p-4">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="md:col-span-2 text-sm text-black">{value}</div>
    </div>
  );
}
