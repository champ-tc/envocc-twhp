"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ChevronLeft } from "lucide-react"; // เพิ่ม icon
import Image from "next/image";
import PDPAModal from "@/components/PDPAModal";

type ProvinceApi = { province_id: number; name_th: string };
type DistrictApi = { district_id: number; name_th: string };
type SubdistrictApi = { subdistrict_id: number; name_th: string };

type DataJson = {
  districts: Array<{ id: number; zip_code: number }>;
};

type FormState = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;

  factory_type: 0 | 1;

  name_th: string;
  name_en: string;
  tsic_code: string;

  address_no: string;
  soi: string;
  road: string;
  zipcode: string;

  phone_number: string;
  fax_number: string;

  province_id: number | "";
  district_id: number | "";
  subdistrict_id: number | "";
};

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function hasThaiChars(v: string): boolean {
  return /[\u0E00-\u0E7F]/.test(v);
}

function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

function passwordChecks(pw: string) {
  const checks = [
    {
      key: "len",
      label: "ความยาว 12–20 ตัวอักษร",
      ok: pw.length >= 12 && pw.length <= 20,
    },
    { key: "noThai", label: "ห้ามมีภาษาไทย", ok: !hasThaiChars(pw) },
    {
      key: "upper",
      label: "มีตัวพิมพ์ใหญ่ (A-Z)",
      ok: /[A-Z]/.test(pw),
    },
    {
      key: "lower",
      label: "มีตัวพิมพ์เล็ก (a-z)",
      ok: /[a-z]/.test(pw),
    },
    { key: "digit", label: "มีตัวเลข (0-9)", ok: /[0-9]/.test(pw) },
    {
      key: "spec",
      label: "มีอักษรพิเศษ (# / @ &) อย่างน้อย 1 ตัวอักษร",
      ok: /[*#\/@&]/.test(pw),
    },
  ] as const;

  return { checks, allOk: checks.every((c) => c.ok) };
}

function stripThaiOnInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  if (hasThaiChars(el.value))
    el.value = el.value.replace(/[\u0E00-\u0E7F]/g, "");
}

export default function RegisterPage() {
  const router = useRouter();

  // --- PDPA State ---
  const [showPdpa, setShowPdpa] = useState(true); // เริ่มต้นมาแสดงทันที

  const [form, setForm] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    factory_type: 0,
    name_th: "",
    name_en: "",
    tsic_code: "",
    address_no: "",
    soi: "",
    road: "",
    zipcode: "",
    phone_number: "",
    fax_number: "",
    province_id: "",
    district_id: "",
    subdistrict_id: "",
  });

  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
  const [districts, setDistricts] = useState<DistrictApi[]>([]);
  const [subdistricts, setSubdistricts] = useState<SubdistrictApi[]>([]);
  const [zipMap, setZipMap] = useState<Map<number, string>>(new Map());

  const [loadingLoc, setLoadingLoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const pwInfo = useMemo(() => passwordChecks(form.password), [form.password]);
  const pwMatchOk = useMemo(
    () =>
      form.password.length > 0 &&
      form.confirmPassword.length > 0 &&
      form.password === form.confirmPassword,
    [form.password, form.confirmPassword],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key as string];
      return n;
    });
  }

  // load zipMap
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/data.json", { cache: "force-cache" });
        if (!res.ok) return;

        const json = (await res.json()) as DataJson;
        const m = new Map<number, string>();
        for (const d of json.districts ?? []) m.set(d.id, String(d.zip_code));
        setZipMap(m);
      } catch {
        setZipMap(new Map());
      }
    })();
  }, []);

  // load provinces
  useEffect(() => {
    (async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch("/api/locations/provinces", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as ProvinceApi[];
        setProvinces(Array.isArray(data) ? data : []);
      } catch {
        setProvinces([]);
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  // load districts
  useEffect(() => {
    (async () => {
      if (form.province_id === "") {
        setDistricts([]);
        setSubdistricts([]);
        setForm((p) => ({
          ...p,
          district_id: "",
          subdistrict_id: "",
          zipcode: "",
        }));
        return;
      }
      setLoadingLoc(true);
      try {
        const res = await fetch(
          `/api/locations/province/${form.province_id}/districts`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as DistrictApi[];
        setDistricts(Array.isArray(data) ? data : []);
        setSubdistricts([]);
        setForm((p) => ({
          ...p,
          district_id: "",
          subdistrict_id: "",
          zipcode: "",
        }));
      } catch {
        setDistricts([]);
      } finally {
        setLoadingLoc(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.province_id]);

  // load subdistricts
  useEffect(() => {
    (async () => {
      if (form.district_id === "") {
        setSubdistricts([]);
        setForm((p) => ({ ...p, subdistrict_id: "", zipcode: "" }));
        return;
      }
      setLoadingLoc(true);
      try {
        const res = await fetch(
          `/api/locations/district/${form.district_id}/subdistricts`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as SubdistrictApi[];
        setSubdistricts(Array.isArray(data) ? data : []);
        setForm((p) => ({ ...p, subdistrict_id: "", zipcode: "" }));
      } catch {
        setSubdistricts([]);
      } finally {
        setLoadingLoc(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.district_id]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const orgLabel =
      form.factory_type === 1 ? "วิสาหกิจชุมชน" : "สถานประกอบการ";

    const u = form.username.trim();
    if (form.factory_type === 0) {
      // สถานประกอบการ: 5, 13, 14
      if (!/^(\d{5}|\d{13}|\d{14})$/.test(u)) {
        e.username =
          "กรุณาระบุเลขทะเบียน 13, 14 หลัก หรือรหัสหน่วยบริการ 5 หลัก";
      }
    } else {
      // วิสาหกิจชุมชน: 12
      if (!/^\d{12}$/.test(u)) {
        e.username = "กรุณาระบุรหัสทะเบียนวิสาหกิจชุมชน 12 หลัก";
      }
    }

    if (!form.email.trim() || !isEmail(form.email))
      e.email = `กรุณากรอกอีเมล${orgLabel}ให้ถูกต้อง`;

    if (!form.password) e.password = "กรุณากรอกรหัสผ่าน";
    else if (!pwInfo.allOk) e.password = "รหัสผ่านยังไม่ผ่านเงื่อนไขทั้งหมด";

    if (!form.confirmPassword) e.confirmPassword = "กรุณายืนยันรหัสผ่าน";
    else if (form.confirmPassword.length > 20)
      e.confirmPassword = "รหัสผ่านห้ามเกิน 20 ตัวอักษร";
    else if (form.confirmPassword !== form.password)
      e.confirmPassword = "รหัสผ่านไม่ตรงกัน";

    if (!form.name_th.trim()) e.name_th = `กรุณากรอกชื่อ${orgLabel}ภาษาไทย`;
    if (!form.name_en.trim())
      e.name_en = `กรุณากรอกชื่อ${orgLabel}ภาษาอังกฤษ`;

    const tsic = form.tsic_code.trim();
    if (!/^\d{5}$/.test(tsic))
      e.tsic_code = "TSIC ต้องเป็นตัวเลข 5 หลักเท่านั้น";

    if (!form.address_no.trim()) e.address_no = "กรุณากรอกที่อยู่";
    if (!form.phone_number.trim()) e.phone_number = "กรุณากรอกเบอร์โทรศัพท์";

    if (form.province_id === "") e.province_id = "กรุณาเลือกจังหวัด";
    if (form.district_id === "") e.district_id = "กรุณาเลือกอำเภอ";
    if (form.subdistrict_id === "") e.subdistrict_id = "กรุณาเลือกตำบล";

    if (!form.zipcode.trim()) e.zipcode = "ไม่พบรหัสไปรษณีย์ของตำบลที่เลือก";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim(),
        factory_type: form.factory_type,
        name_th: form.name_th.trim(),
        name_en: form.name_en.trim(),
        tsic_code: form.tsic_code.trim(),
        address_no: form.address_no.trim(),
        soi: form.soi.trim(),
        road: form.road.trim(),
        zipcode: form.zipcode.trim(),
        phone_number: form.phone_number.trim(),
        fax_number: form.fax_number.trim(),
        subdistrict_id: Number(form.subdistrict_id),
      };

      const res = await fetch("/api/factories/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("ลงทะเบียนสำเร็จ");
      router.push("/");
    } catch (err) {
      alert("ลงทะเบียนไม่สำเร็จ");
      setSubmitError(err instanceof Error ? err.message : "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase =
    "w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#2E8B57] text-black placeholder-gray-400";
  const labelBase = "text-xs font-semibold text-gray-600 mb-1 block";
  const errorText = "mt-1 text-xs text-red-600";
  const toggleBtn =
    "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-50 border border-gray-200";

  const orgLabel = form.factory_type === 1 ? "วิสาหกิจชุมชน" : "สถานประกอบการ";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* --- PDPA MODAL --- */}
      <PDPAModal
        isOpen={showPdpa}
        onConfirm={() => setShowPdpa(false)}
      />

      {/* --- Main Registration Form --- */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 bg-[#2E8B57] p-4 text-white flex flex-col justify-between">
          <div>
            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4">ลงทะเบียนสถานประกอบการ</h2>
            <p className="text-green-100 leading-relaxed text-sm">
              ร่วมเป็นส่วนหนึ่งในโครงการ
            </p>
            <p className="text-green-100 leading-relaxed text-sm">
              สถานประกอบการ ปลอดโรค ปลอดภัย กายใจเป็นสุข
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="flex items-center text-sm font-semibold hover:text-green-200 transition mt-10"
            type="button"
          >
            <ChevronLeft size={16} className="mr-1" /> กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>

        <div className="w-full md:w-2/3 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            กรอกข้อมูลสมัครสมาชิก
          </h2>

          {submitError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {submitError}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className={labelBase}>ประเภทหน่วยงาน</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="factory_type"
                    className="accent-[#2E8B57]"
                    checked={form.factory_type === 0}
                    onChange={() => setField("factory_type", 0)}
                  />
                  สถานประกอบการ
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="factory_type"
                    className="accent-[#2E8B57]"
                    checked={form.factory_type === 1}
                    onChange={() => setField("factory_type", 1)}
                  />
                  วิสาหกิจชุมชน
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>
                  ชื่อผู้ใช้
                </label>
                <input
                  className={inputBase}
                  value={form.username}
                  maxLength={14}
                  onChange={(e) =>
                    setField("username", onlyDigits(e.target.value))
                  }
                />
                {errors.username && (
                  <div className={errorText}>{errors.username}</div>
                )}
              </div>

              <div>
                <label className={labelBase}>อีเมล{orgLabel}</label>
                <input
                  type="email"
                  className={inputBase}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
                {errors.email && (
                  <div className={errorText}>{errors.email}</div>
                )}
              </div>
              <div className="text-xs text-gray-500 md:col-span-2 space-y-1">
                {form.factory_type === 0 && (
                  <>
                    <p>
                      - สถานประกอบการ ขึ้นทะเบียนกับกรมโรงงานอุตสาหกรรม (DIW)
                      ระบุเลขทะเบียน 14 หลัก
                    </p>
                    <p>
                      - สถานประกอบการ ขึ้นทะเบียนกับกรมพัฒนาธุรกิจการค้า (DBD)
                      ระบุเลขทะเบียน 13 หลัก
                    </p>
                    <p>- โรงพยาบาล ระบุรหัสหน่วยบริการ 5 หลัก</p>
                  </>
                )}
                {form.factory_type === 1 && (
                  <p>
                    - ระบุรหัสทะเบียนวิสาหกิจชุมชน 12 หลัก (โดยไม่ต้องกรอก -
                    และ /)
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className={inputBase + " pr-14"}
                    value={form.password}
                    maxLength={20}
                    onChange={(e) => setField("password", e.target.value)}
                    onInput={stripThaiOnInput}
                    placeholder="รหัสผ่าน"
                  />
                  <button
                    type="button"
                    className={toggleBtn}
                    onClick={() => setShowPw((v) => !v)}
                  >
                    <Image
                      src={showPw ? "/img/hide.png" : "/img/eye.png"}
                      alt="toggle password"
                      width={18}
                      height={18}
                    />
                  </button>
                </div>
                {errors.password && (
                  <div className={errorText}>{errors.password}</div>
                )}

                <div className="mt-2 space-y-1">
                  {pwInfo.checks.map((c) => (
                    <div
                      key={c.key}
                      className={`text-xs ${c.ok ? "text-emerald-700" : "text-gray-500"}`}
                    >
                      {c.ok ? "✓" : "•"} {c.label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelBase}>ยืนยันรหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPw2 ? "text" : "password"}
                    className={inputBase + " pr-14"}
                    value={form.confirmPassword}
                    maxLength={20}
                    onChange={(e) =>
                      setField("confirmPassword", e.target.value)
                    }
                    onInput={stripThaiOnInput}
                  />
                  <button
                    type="button"
                    className={toggleBtn}
                    onClick={() => setShowPw2((v) => !v)}
                  >
                    <Image
                      src={showPw2 ? "/img/hide.png" : "/img/eye.png"}
                      alt="toggle confirm password"
                      width={18}
                      height={18}
                    />
                  </button>
                </div>

                {form.confirmPassword.length > 0 && (
                  <div
                    className={`mt-2 text-xs ${pwMatchOk ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {pwMatchOk ? "✓ รหัสผ่านตรงกัน" : "✗ รหัสผ่านไม่ตรงกัน"}
                  </div>
                )}
                {errors.confirmPassword && (
                  <div className={errorText}>{errors.confirmPassword}</div>
                )}
              </div>
            </div>

            <div>
              <label className={labelBase}>ชื่อ{orgLabel}ภาษาไทย</label>
              <input
                className={inputBase}
                value={form.name_th}
                onChange={(e) => setField("name_th", e.target.value)}
              />
              {errors.name_th && (
                <div className={errorText}>{errors.name_th}</div>
              )}
            </div>

            <div>
              <label className={labelBase}>ชื่อ{orgLabel}ภาษาอังกฤษ</label>
              <input
                className={inputBase}
                value={form.name_en}
                onChange={(e) => setField("name_en", e.target.value)}
              />
              {errors.name_en && (
                <div className={errorText}>{errors.name_en}</div>
              )}
            </div>

            <div>
              <label className={labelBase}>
                รหัสประเภทธุรกิจ (TSIC) 5 หลัก{""}
                <a
                  href="https://tsic.dbd.go.th/index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  ค้นหารหัสที่ลิงก์นี้
                </a>
              </label>

              <input
                className={inputBase}
                value={form.tsic_code}
                inputMode="numeric"
                maxLength={5}
                onChange={(e) =>
                  setField("tsic_code", onlyDigits(e.target.value))
                }
                placeholder="ตัวเลข 5 หลัก"
              />
              {errors.tsic_code && (
                <div className={errorText}>{errors.tsic_code}</div>
              )}
            </div>

            <div>
              <label className={labelBase}>ที่อยู่</label>
              <input
                className={inputBase}
                value={form.address_no}
                onChange={(e) => setField("address_no", e.target.value)}
              />
              {errors.address_no && (
                <div className={errorText}>{errors.address_no}</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>ซอย</label>
                <input
                  className={inputBase}
                  value={form.soi}
                  onChange={(e) => setField("soi", e.target.value)}
                />
              </div>
              <div>
                <label className={labelBase}>ถนน</label>
                <input
                  className={inputBase}
                  value={form.road}
                  onChange={(e) => setField("road", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelBase}>จังหวัด</label>
                <select
                  className={inputBase}
                  value={form.province_id}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : "";
                    setForm((p) => ({
                      ...p,
                      province_id: v,
                      district_id: "",
                      subdistrict_id: "",
                      zipcode: "",
                    }));
                  }}
                  disabled={loadingLoc}
                >
                  <option value="">
                    {loadingLoc ? "กำลังโหลด..." : "เลือกจังหวัด"}
                  </option>
                  {provinces.map((p) => (
                    <option key={p.province_id} value={p.province_id}>
                      {p.name_th}
                    </option>
                  ))}
                </select>
                {errors.province_id && (
                  <div className={errorText}>{errors.province_id}</div>
                )}
              </div>

              <div>
                <label className={labelBase}>อำเภอ</label>
                <select
                  className={inputBase}
                  value={form.district_id}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : "";
                    setForm((p) => ({
                      ...p,
                      district_id: v,
                      subdistrict_id: "",
                      zipcode: "",
                    }));
                  }}
                  disabled={loadingLoc || form.province_id === ""}
                >
                  <option value="">
                    {loadingLoc ? "กำลังโหลด..." : "เลือกอำเภอ"}
                  </option>
                  {districts.map((d) => (
                    <option key={d.district_id} value={d.district_id}>
                      {d.name_th}
                    </option>
                  ))}
                </select>
                {errors.district_id && (
                  <div className={errorText}>{errors.district_id}</div>
                )}
              </div>

              <div>
                <label className={labelBase}>ตำบล</label>
                <select
                  className={inputBase}
                  value={form.subdistrict_id}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : "";
                    setForm((p) => ({
                      ...p,
                      subdistrict_id: v,
                      zipcode: v !== "" ? (zipMap.get(v) ?? "") : "",
                    }));
                  }}
                  disabled={loadingLoc || form.district_id === ""}
                >
                  <option value="">
                    {loadingLoc ? "กำลังโหลด..." : "เลือกตำบล"}
                  </option>
                  {subdistricts.map((s) => (
                    <option key={s.subdistrict_id} value={s.subdistrict_id}>
                      {s.name_th}
                    </option>
                  ))}
                </select>
                {errors.subdistrict_id && (
                  <div className={errorText}>{errors.subdistrict_id}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelBase}>รหัสไปรษณีย์</label>
                <input
                  className={`${inputBase} bg-gray-100 cursor-not-allowed`}
                  value={form.zipcode}
                  readOnly
                  aria-readonly="true"
                />
                {errors.zipcode && (
                  <div className={errorText}>{errors.zipcode}</div>
                )}
              </div>

              <div>
                <label className={labelBase}>เบอร์โทรศัพท์</label>
                <input
                  className={inputBase}
                  value={form.phone_number}
                  onChange={(e) => setField("phone_number", e.target.value)}
                />
                {errors.phone_number && (
                  <div className={errorText}>{errors.phone_number}</div>
                )}
              </div>

              <div>
                <label className={labelBase}>แฟกซ์</label>
                <input
                  className={inputBase}
                  value={form.fax_number}
                  onChange={(e) => setField("fax_number", e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={submitting}
              className="w-full py-3 bg-[#2E8B57] hover:bg-[#257045] disabled:opacity-60 text-white rounded-xl font-bold shadow-md transition"
            >
              {submitting ? "กำลังส่ง..." : "ลงทะเบียน"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}