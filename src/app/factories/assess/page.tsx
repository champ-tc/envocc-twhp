"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import type { NormalizedUser } from "@/lib/auth-utils";

type AuthResponse = { isLoggedIn: boolean; user: NormalizedUser };

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

const STD_ROWS: Array<{ k: keyof StandardState; label: string }> = [
  { k: "standard_HC", label: "HC" },
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

const makeEmployeeInit = (): EmployeeState =>
  Object.fromEntries(
    EMP_ROWS.flatMap(({ code }) => [
      [`employee_${code}_m`, 0],
      [`employee_${code}_f`, 0],
    ]),
  ) as EmployeeState;

const EMP_INIT = makeEmployeeInit();

const STD_INIT: StandardState = {
  standard_HC: false,
  standard_SAN: false,
  standard_wellness: false,
  standard_safety: false,
  standard_TIS18001: false,
  standard_ISO45001: false,
  standard_ISO14001: false,
  standard_zero: false,
  standard_5S: false,
  standard_HAS: false,
};

const OFF_INIT: SafetyOfficerState = {
  safety_officer_prefix: "",
  safety_officer_first_name: "",
  safety_officer_last_name: "",
  safety_officer_position: "",
  safety_officer_email: "",
  safety_officer_phone: "",
  safety_officer_lineID: "",
};

const toInt = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

const emailOk = (email: string) =>
  !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const cleanPhone = (p: string) => p.replace(/[^\d+]/g, "").trim();

const hasAnyContact = (o: SafetyOfficerState) =>
  Boolean(
    o.safety_officer_email.trim() ||
    cleanPhone(o.safety_officer_phone) ||
    o.safety_officer_lineID.trim(),
  );

// ✅ ทำให้ข้อความขึ้นใน UI อ่านง่ายขึ้น (ไม่กระทบ logic)
const prettyEnrollInfo = (s: string) => {
  const t = s.trim();
  if (!t) return "";
  const m = t.toLowerCase();
  if (m.includes("already enroll"))
    return "ท่านลงสมัครโครงการในปีงบประมาณนี้แล้ว";
  return t;
};

export default function UserMainPage() {
  const router = useRouter();
  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [checkingEnroll, setCheckingEnroll] = useState(true);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [enrollInfo, setEnrollInfo] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [employee, setEmployee] = useState<EmployeeState>(EMP_INIT);
  const [standard, setStandard] = useState<StandardState>(STD_INIT);
  const [officer, setOfficer] = useState<SafetyOfficerState>(OFF_INIT);
  const [submitting, setSubmitting] = useState(false);

  // --- auth ---
  useEffect(() => {
    fetch("/api/auth/authentication", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as AuthResponse;
      })
      .then((d) => {
        if (!d?.isLoggedIn || !d.user) throw new Error("Unauthorized");
        if (d.user.role !== "Factory") return router.push("/admins/dashboard");
        setUser(d.user);
      })
      .catch(() => router.push("/"))
      .finally(() => setIsLoading(false));
  }, [router]);

  // ✅ --- check enroll status (ใหม่ตาม requirement) ---
  // เงื่อนไข:
  // - GET 200 + message === "no enrollment found" => สมัครได้ (alreadyEnrolled=false)
  // - GET 200 + message อื่น => สมัครไปแล้ว/ไม่ให้สมัคร (alreadyEnrolled=true)
  // - status อื่น => ปิดการสมัครไว้ก่อน (alreadyEnrolled=true) พร้อม note
  useEffect(() => {
    if (!user) return;

    const check = async () => {
      setCheckingEnroll(true);

      try {
        const res = await fetch("/api/factories/enroll", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const raw = await res.text();
        console.groupCollapsed("🔎 enroll GET");
        console.log({ status: res.status, ok: res.ok, raw });
        console.groupEnd();

        let data: { message?: string } | null = null;
        try {
          data = raw ? (JSON.parse(raw) as { message?: string }) : null;
        } catch {
          data = null;
        }

        const msg = String(data?.message ?? "").trim();

        if (res.status === 200) {
          if (msg === "no enrollment found") {
            setAlreadyEnrolled(false);
            setEnrollInfo("");
          } else {
            setAlreadyEnrolled(true);
            setEnrollInfo(msg ? `หมายเหตุ: ${msg}` : "");
            setOpen(false);
          }
          return;
        }

        // ❌ ไม่ใช่ 200: ปิดการสมัครไว้ก่อน เพื่อไม่ให้สถานะเพี้ยน
        setAlreadyEnrolled(true);
        setEnrollInfo(
          msg
            ? `หมายเหตุ: ${msg}`
            : `หมายเหตุ: ตรวจสอบสถานะไม่สำเร็จ (status ${res.status})`,
        );
        setOpen(false);
      } catch (e) {
        console.error("check enroll error:", e);
        setAlreadyEnrolled(true);
        setEnrollInfo("หมายเหตุ: ตรวจสอบสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        setOpen(false);
      } finally {
        setCheckingEnroll(false);
      }
    };

    check();
  }, [user]);

  const totals = useMemo(() => {
    let m = 0,
      f = 0;
    for (const { code } of EMP_ROWS) {
      m += employee[`employee_${code}_m`];
      f += employee[`employee_${code}_f`];
    }
    return { m, f, all: m + f };
  }, [employee]);

  const canSubmit = useMemo(() => {
    if (alreadyEnrolled) return false;

    const hasEmployee = totals.all > 0;

    const requiredName =
      officer.safety_officer_prefix.trim() &&
      officer.safety_officer_first_name.trim() &&
      officer.safety_officer_last_name.trim() &&
      officer.safety_officer_position.trim();

    const contactOk = hasAnyContact(officer);
    const emailValid = emailOk(officer.safety_officer_email);

    return Boolean(hasEmployee && requiredName && contactOk && emailValid);
  }, [alreadyEnrolled, totals.all, officer]);

  const reset = () => {
    setEmployee(EMP_INIT);
    setStandard(STD_INIT);
    setOfficer(OFF_INIT);
  };

  const submit = async () => {
    if (alreadyEnrolled) {
      window.alert("ท่านสมัครเข้าร่วมโครงการเรียบร้อยแล้ว");
      return;
    }

    if (totals.all <= 0)
      return window.alert("กรุณากรอกจำนวนพนักงานรวมให้มากกว่า 0");

    const requiredName =
      officer.safety_officer_prefix.trim() &&
      officer.safety_officer_first_name.trim() &&
      officer.safety_officer_last_name.trim() &&
      officer.safety_officer_position.trim();
    if (!requiredName)
      return window.alert(
        "กรุณากรอกข้อมูลผู้ติดต่อ (คำนำหน้า/ชื่อ/นามสกุล/ตำแหน่ง) ให้ครบ",
      );

    if (!hasAnyContact(officer))
      return window.alert(
        "กรุณากรอกช่องทางติดต่ออย่างน้อย 1 อย่าง (อีเมล หรือ โทรศัพท์ หรือ LINE ID)",
      );

    if (!emailOk(officer.safety_officer_email))
      return window.alert("รูปแบบอีเมลไม่ถูกต้อง");

    if (!window.confirm("ท่านต้องการยืนยันสมัครโครงการหรือไม่?")) return;

    try {
      setSubmitting(true);

      // ส่งแบบเดิมจากหน้า: employee/standard/safety_officer
      const res = await fetch("/api/factories/enroll", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee, standard, safety_officer: officer }),
      });

      if (res.ok) {
        window.alert("สมัครโครงการสำเร็จ ✅");
        setAlreadyEnrolled(true);
        setOpen(false);
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      const msg = data?.message ? prettyEnrollInfo(data.message) : "";
      window.alert(
        msg ? `สมัครโครงการไม่สำเร็จ ❌\n${msg}` : "สมัครโครงการไม่สำเร็จ ❌",
      );

      // ✅ หลัง submit ไม่ผ่าน ให้ re-check เพื่อ sync สถานะ (กันเคส backend บอก already enroll)
      setCheckingEnroll(true);
      try {
        const re = await fetch("/api/factories/enroll", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const raw = await re.text();
        let d: { message?: string } | null = null;
        try {
          d = raw ? (JSON.parse(raw) as { message?: string }) : null;
        } catch {
          d = null;
        }
        const m = String(d?.message ?? "").trim();
        if (re.status === 200 && m !== "no enrollment found") {
          setAlreadyEnrolled(true);
          setOpen(false);
          setEnrollInfo(m ? `หมายเหตุ: ${m}` : "");
        }
      } finally {
        setCheckingEnroll(false);
      }
    } catch (e) {
      console.error(e);
      window.alert("สมัครโครงการไม่สำเร็จ ❌ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-10 text-black">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-black">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F3F6F4]">
        <Navbar
          title="สมัครเข้าร่วมโครงการ"
          fullName={user.fullName}
          userRole={user.role}
          establishment={user.establishment}
          username={user.username}
        />

        <main className="flex-1 overflow-auto p-8">
          <div className="bg-[#2E8B57] p-8 rounded-3xl text-white shadow-sm">
            <div className="text-xl font-semibold">สวัสดี {user.fullName}</div>
            <div className="mt-2 opacity-95">
              กรุณาดำเนินการสมัครเข้าร่วมโครงการ
            </div>

            <div className="mt-6">
              {checkingEnroll ? (
                <div className="text-white/90">
                  กำลังตรวจสอบสถานะการสมัคร...
                </div>
              ) : alreadyEnrolled ? (
                <div className="rounded-2xl bg-white/95 p-4 text-black font-semibold">
                  ท่านลงสมัครโครงการเรียบร้อยแล้ว
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => setOpen(true)}
                    className="rounded-2xl bg-white px-5 py-3 text-black font-semibold shadow hover:bg-gray-100"
                  >
                    สมัครเข้าร่วมโครงการ
                  </button>
                  {enrollInfo ? (
                    <div className="text-sm text-white/90">
                      {prettyEnrollInfo(enrollInfo)}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {open && !alreadyEnrolled && (
            <div className="mt-8 space-y-6">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-black">
                      สรุปจำนวนพนักงาน
                    </div>
                    <div className="text-sm text-gray-700">
                      รวมทั้งหมดต้องมากกว่า 0 เพื่อส่งใบสมัคร
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Badge title="ชาย" value={totals.m} />
                    <Badge title="หญิง" value={totals.f} />
                    <div className="rounded-2xl bg-[#E9F7EF] px-4 py-3 border border-[#BFE6D1]">
                      <div className="text-xs text-black">รวม</div>
                      <div className="text-xl font-bold text-black">
                        {totals.all}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="1) จำนวนพนักงาน (แยกประเทศ/ชาย/หญิง)">
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
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
                        const mk = `employee_${code}_m` as const;
                        const fk = `employee_${code}_f` as const;
                        const m = employee[mk];
                        const f = employee[fk];
                        return (
                          <tr key={code} className="border-t border-gray-100">
                            <td className="px-4 py-3 text-sm text-black font-medium">
                              {label}
                            </td>
                            <td className="px-4 py-3">
                              <IntInput
                                value={m}
                                onChange={(n) =>
                                  setEmployee((s) => ({ ...s, [mk]: n }))
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <IntInput
                                value={f}
                                onChange={(n) =>
                                  setEmployee((s) => ({ ...s, [fk]: n }))
                                }
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-black">
                              {m + f}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm font-semibold text-black">
                          รวมทั้งหมด
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">
                          {totals.m}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">
                          {totals.f}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">
                          {totals.all}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-3 text-xs text-gray-700">
                  * กรอกเป็น “จำนวนเต็ม” เท่านั้น
                </div>
              </Card>

              <Card title="2) มาตรฐานความปลอดภัย (Standard)">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {STD_ROWS.map(({ k, label }) => (
                    <CheckItem
                      key={k}
                      label={label}
                      checked={standard[k]}
                      onChange={(v) => setStandard((s) => ({ ...s, [k]: v }))}
                    />
                  ))}
                </div>
              </Card>

              <Card title="3) ผู้ติดต่อ (กรอกช่องทางอย่างน้อย 1 อย่าง)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="คำนำหน้า*"
                    value={officer.safety_officer_prefix}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safety_officer_prefix: v }))
                    }
                  />
                  <TextField
                    label="ตำแหน่ง*"
                    value={officer.safety_officer_position}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safety_officer_position: v }))
                    }
                  />
                  <TextField
                    label="ชื่อ*"
                    value={officer.safety_officer_first_name}
                    onChange={(v) =>
                      setOfficer((s) => ({
                        ...s,
                        safety_officer_first_name: v,
                      }))
                    }
                  />
                  <TextField
                    label="นามสกุล*"
                    value={officer.safety_officer_last_name}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safety_officer_last_name: v }))
                    }
                  />

                  <TextField
                    label="อีเมล"
                    value={officer.safety_officer_email}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safety_officer_email: v }))
                    }
                    error={
                      officer.safety_officer_email.trim() &&
                      !emailOk(officer.safety_officer_email)
                        ? "รูปแบบอีเมลไม่ถูกต้อง"
                        : ""
                    }
                  />
                  <TextField
                    label="โทรศัพท์"
                    value={officer.safety_officer_phone}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safety_officer_phone: v }))
                    }
                  />
                  <TextField
                    label="LINE ID"
                    value={officer.safety_officer_lineID}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safety_officer_lineID: v }))
                    }
                  />

                  <div className="md:col-span-2 text-xs text-gray-700">
                    * ต้องมีช่องทางติดต่ออย่างน้อย 1 อย่าง (อีเมล หรือ โทรศัพท์
                    หรือ LINE ID)
                  </div>
                </div>
              </Card>

              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={reset}
                  className="rounded-2xl px-5 py-3 bg-white border border-gray-200 text-black font-semibold hover:bg-gray-50"
                  disabled={submitting}
                >
                  ล้างค่า
                </button>

                <button
                  onClick={submit}
                  disabled={submitting}
                  className={`rounded-2xl px-6 py-3 font-semibold text-white shadow-sm ${
                    submitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#2E8B57] hover:bg-[#277549]"
                  }`}
                >
                  {submitting ? "กำลังส่ง..." : "ส่งใบสมัคร"}
                </button>

                {!canSubmit && !submitting ? (
                  <div className="w-full text-right text-xs text-gray-700">
                    * กรอกข้อมูลให้ครบตามเงื่อนไขก่อนส่ง
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------- small UI components ------- */

function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
      {title ? (
        <div className="text-lg font-semibold text-black">{title}</div>
      ) : null}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </div>
  );
}

function Badge({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3">
      <div className="text-xs text-gray-700">{title}</div>
      <div className="text-xl font-bold text-black">{value}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-black">{label}</div>
      <input
        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-black outline-none focus:ring-2 focus:ring-[#2E8B57]/30 ${
          error ? "border-red-300" : "border-gray-200"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

function CheckItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 text-black">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[#2E8B57]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-medium text-black">{label}</span>
    </label>
  );
}

function IntInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-black outline-none focus:ring-2 focus:ring-[#2E8B57]/30"
      value={value}
      onChange={(e) => onChange(toInt(e.target.value))}
      onBlur={(e) => onChange(toInt(e.target.value))}
    />
  );
}
