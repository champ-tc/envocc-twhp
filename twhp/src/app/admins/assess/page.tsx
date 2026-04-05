"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/components/AdminLayout";

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
  | "Th"
  | "Mm"
  | "Kh"
  | "La"
  | "Vn"
  | "Cn"
  | "Ph"
  | "Jp"
  | "In"
  | "Other";
type Sex = "M" | "F";
type EmployeeField = `employee${EmployeeKeys}${Sex}`;
type EmployeeState = Partial<Record<EmployeeField, number>>;

type StandardState = Partial<{
  standardHc: boolean;
  standardSan: boolean;
  standardSanplus: boolean;
  standardWellness: boolean;
  standardSafety: boolean;
  standardTis18001: boolean;
  standardIso45001: boolean;
  standardIso14001: boolean;
  standardZero: boolean;
  standard5S: boolean;
  standardHas: boolean;
}>;
type StandardField = keyof Required<StandardState>;

type FileState = Partial<{
  fileStandardHc: string;
  fileStandardSan: string;
  fileStandardSanplus: string;
  fileStandardWellness: string;
  fileStandardSafety: string;
  fileStandardTis18001: string;
  fileStandardIso45001: string;
  fileStandardIso14001: string;
  fileStandardZero: string;
  fileStandard5S: string;
  fileStandardHas: string;
}>;
type FileField = keyof Required<FileState>;

type SafetyOfficerState = Partial<{
  safetyOfficerPrefix: string;
  safetyOfficerFirstName: string;
  safetyOfficerLastName: string;
  safetyOfficerPosition: string;
  safetyOfficerEmail: string;
  safetyOfficerPhone: string;
  safetyOfficerLineId: string;
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
  files?: FileState;
  safety_officer?: SafetyOfficerState;

  // เผื่อ backend ส่งแบบ flattened
  [k: string]: unknown;
};

const EMP_ROWS: Array<{ code: EmployeeKeys; label: string }> = [
  { code: "Th", label: "ไทย" },
  { code: "Mm", label: "เมียนมาร์" },
  { code: "Kh", label: "กัมพูชา" },
  { code: "La", label: "ลาว" },
  { code: "Vn", label: "เวียดนาม" },
  { code: "Cn", label: "จีน" },
  { code: "Ph", label: "ฟิลิปปินส์" },
  { code: "Jp", label: "ญี่ปุ่น" },
  { code: "In", label: "อินเดีย" },
  { code: "Other", label: "อื่นๆ" },
];

const STD_ROWS: Array<{ k: StandardField; fileK: FileField; label: string }> = [
  { k: "standardHc", fileK: "fileStandardHc", label: "โรงอาหารปลอดภัยใส่ใจสุขภาพ (Healthy Canteen)" },
  { k: "standardSan", fileK: "fileStandardSan", label: "มาตรฐานสุขาภิบาลอาหาร : สถานที่จำหน่ายอาหาร (SAN)" },
  { k: "standardSanplus", fileK: "fileStandardSanplus", label: "มาตรฐานสุขาภิบาลอาหาร : สถานที่จำหน่ายอาหาร (SAN Plus)" },
  { k: "standardWellness", fileK: "fileStandardWellness", label: "สถานประกอบกิจการดีเด่นด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน" },
  { k: "standardSafety", fileK: "fileStandardSafety", label: "อุตสาหกรรมดีเด่น ประเภทการบริหารความปลอดภัย" },
  { k: "standardTis18001", fileK: "fileStandardTis18001", label: "TIS 18001" },
  { k: "standardIso45001", fileK: "fileStandardIso45001", label: "ISO 45001" },
  { k: "standardIso14001", fileK: "fileStandardIso14001", label: "ISO 14001" },
  { k: "standardZero", fileK: "fileStandardZero", label: "มาตรฐานส้วมสาธารณะระดับประเทศ (HAS)" },
  { k: "standard5S", fileK: "fileStandard5S", label: "รางวัล 5ส ประเทศไทย (Thailand 5S Award)" },
  { k: "standardHas", fileK: "fileStandardHas", label: "มาตรฐานส้วมสาธารณะ" },
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getFromFlat(d: EnrollDetail, key: string): unknown {
  return key in d ? (d as Record<string, unknown>)[key] : undefined;
}

function employeeKey(code: EmployeeKeys, sex: Sex): EmployeeField {
  return `employee${code}${sex}` as EmployeeField;
}

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

function getFileValue(d: EnrollDetail | null, key: FileField): string {
  if (!d) return "";
  const nested: unknown =
    d.files && isRecord(d.files)
      ? (d.files as Record<string, unknown>)[key]
      : undefined;
  const flat: unknown = getFromFlat(d, String(key));
  const v = nested ?? flat;
  return typeof v === "string" ? v : "";
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
  if (Array.isArray(json)) {
    const first = json[0];
    return isRecord(first) ? (first as EnrollDetail) : null;
  }
  return isRecord(json) ? (json as EnrollDetail) : null;
}

export default function AdminAssessPage() {
  const { user, isLoading: loadingAuth } = useAdminAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  const [factories, setFactories] = useState<Factory[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Factory | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<EnrollDetail | null>(null);

  // ===== LOAD DATA =====
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
          throw new Error(fRaw || `โหลดข้อมูลไม่สำเร็จ (${fRes.status})`);
        }

        const eRes = await fetch("/api/admins/enrolls?validated=true&enrolled=true", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const eRaw = await eRes.text();
        const eData = parseJsonSafe<EnrolledFactoryRow[]>(eRaw);

        const enrolledSet = new Set<number>();
        if (eRes.ok && Array.isArray(eData)) {
          for (const row of eData) {
            if (typeof row?.account_id === "number") enrolledSet.add(row.account_id);
          }
        }

        if (alive) {
          setFactories(fData);
          setEnrolledIds(enrolledSet);
        }
      } catch (e) {
        if (isAbortError(e)) return;
        if (alive) setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
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

  // ===== fetch enroll detail =====
  useEffect(() => {
    if (!open || !selected) return;
    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        setDetailLoading(true);
        setDetailError("");
        const res = await fetch(`/api/admins/enrolls?factory_id=${selected.account_id}`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const raw = await res.text();
        if (!res.ok) throw new Error(raw || "โหลดข้อมูลล้มเหลว");
        const json = parseJsonSafe<unknown>(raw);
        if (alive) setDetail(toEnrollDetail(json));
      } catch (e) {
        if (isAbortError(e)) return;
        if (alive) setDetailError(e instanceof Error ? e.message : "โหลดข้อมูลล้มเหลว");
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
    let m = 0, f = 0;
    for (const { code } of EMP_ROWS) {
      m += getEmployeeValue(detail, employeeKey(code, "M"));
      f += getEmployeeValue(detail, employeeKey(code, "F"));
    }
    return { m, f, all: m + f };
  }, [detail]);

  if (loadingAuth || !user) return null;

  return (
    <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm text-black">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="text-xl font-semibold text-black">
          รายชื่อสถานประกอบการสมัครโครงการ
        </div>
        <div className="flex flex-wrap gap-3">
          <StatPill title="ทั้งหมด" value={stats.total} />
          <StatPill title="สมัครแล้ว" value={stats.enrolled} tone="green" />
          <StatPill title="ยังไม่สมัคร" value={stats.notEnrolled} />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

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
              {["ชื่อสถานประกอบการ", "ที่อยู่", "จังหวัด", "สถานะสมัคร", "จัดการ"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-black">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-600">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-600">
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              rows.map(({ f, enrolled }) => (
                <tr key={f.account_id} className="border-t border-gray-100 hover:bg-gray-50">
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
                      onClick={() => { setSelected(f); setOpen(true); }}
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

      {open && selected && (
        <ModalShell title="รายละเอียดโรงงาน & ข้อมูลการสมัคร" onClose={() => { setOpen(false); setSelected(null); setDetail(null); }}>
          <div className="space-y-5">
            <SectionTitle>ข้อมูลโรงงาน</SectionTitle>
            <div className="space-y-2 text-sm">
              <InfoRow label="ชื่อโรงงาน" value={selected.name_th || selected.name_en || "-"} />
              <InfoRow label="จังหวัด" value={selected.province_name_th || "-"} />
              <InfoRow label="ที่อยู่" value={thAddress(selected) || "-"} />
              <InfoRow label="โทรศัพท์" value={selected.phone_number || "-"} />
              <InfoRow label="สถานะสมัคร" value={enrolledIds.has(selected.account_id) ? "สมัครแล้ว" : "ยังไม่สมัคร"} />
            </div>

            <div className="border-t border-gray-200 pt-5" />

            <SectionTitle>ข้อมูลการสมัคร</SectionTitle>
            {detailLoading ? (
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">กำลังโหลด...</div>
            ) : detailError ? (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{detailError}</div>
            ) : !detail ? (
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">ไม่พบข้อมูลการสมัคร</div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-3xl bg-white border border-gray-200 p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3 decoration-black">
                    <div className="text-base font-semibold text-black">จำนวนพนักงาน</div>
                    <div className="flex flex-wrap gap-2">
                      <MiniPill title="ชาย" value={empTotals.m} />
                      <MiniPill title="หญิง" value={empTotals.f} />
                      <MiniPill title="รวม" value={empTotals.all} emphasis />
                    </div>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[600px] w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>{["ประเทศ", "ชาย", "หญิง", "รวม"].map(h => <th key={h} className="text-left px-4 py-2">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {EMP_ROWS.map(({ code, label }) => {
                          const m = getEmployeeValue(detail, employeeKey(code, "M")), f = getEmployeeValue(detail, employeeKey(code, "F"));
                          return (
                            <tr key={code} className="border-t border-gray-100">
                              <td className="px-4 py-2 font-medium">{label}</td>
                              <td className="px-4 py-2">{m}</td>
                              <td className="px-4 py-2">{f}</td>
                              <td className="px-4 py-2 font-semibold">{m + f}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-gray-200 p-5">
                  <div className="text-base font-semibold text-black mb-4">มาตรฐานความปลอดภัย</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {STD_ROWS.map(({ k, fileK, label }) => {
                      const checked = getStandardValue(detail, k), fileUrl = getFileValue(detail, fileK);
                      return (
                        <div key={String(k)} className="flex flex-col gap-1">
                          <div className={`rounded-2xl border px-4 py-3 flex items-center justify-between ${checked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                            <div className="text-xs font-medium text-black">{label}</div>
                            <div className={`text-xs font-semibold ${checked ? "text-green-900" : "text-gray-600"}`}>{checked ? "มี" : "-"}</div>
                          </div>
                          {checked && fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#2E8B57] px-2 hover:underline">ดูไฟล์แนบ</a>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-gray-200 p-5">
                  <div className="text-base font-semibold text-black mb-4">ผู้ประสานงาน</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <InfoRow label="ชื่อ-นามสกุล" value={`${getOfficerValue(detail, "safetyOfficerPrefix")}${getOfficerValue(detail, "safetyOfficerFirstName")} ${getOfficerValue(detail, "safetyOfficerLastName")}`} />
                    <InfoRow label="ตำแหน่ง" value={getOfficerValue(detail, "safetyOfficerPosition")} />
                    <InfoRow label="อีเมล" value={getOfficerValue(detail, "safetyOfficerEmail")} />
                    <InfoRow label="โทรศัพท์" value={getOfficerValue(detail, "safetyOfficerPhone")} />
                    <InfoRow label="Line ID" value={getOfficerValue(detail, "safetyOfficerLineId")} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ===== Mini Components =====
function StatPill({ title, value, tone }: { title: string; value: number; tone?: "green" }) {
  return (
    <div className={`rounded-2xl border px-4 py-2 min-w-[100px] ${tone === "green" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
      <div className="text-xs text-gray-600">{title}</div>
      <div className={`text-lg font-bold ${tone === "green" ? "text-green-800" : "text-black"}`}>{value}</div>
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-3xl bg-[#F3F6F4] p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-6 top-6 h-10 w-10 rounded-full bg-white text-gray-500 shadow hover:bg-gray-50 flex items-center justify-center">✕</button>
        <div className="mb-6 text-xl font-bold text-black">{title}</div>
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-lg font-bold text-[#2E8B57]">{children}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-600 font-medium min-w-[100px]">{label}:</span>
      <span className="text-black">{value || "-"}</span>
    </div>
  );
}

function MiniPill({ title, value, emphasis }: { title: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${emphasis ? "bg-[#2E8B57] text-white" : "bg-gray-100 text-gray-700"}`}>{title}: {value}</div>
  );
}
