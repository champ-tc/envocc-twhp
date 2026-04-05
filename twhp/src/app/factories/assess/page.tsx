"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFactoryAuth } from "@/components/FactoryLayout";
import { FileText, ExternalLink, X, Download, Loader2 } from "lucide-react";
import type { NormalizedUser } from "@/lib/auth-utils";

type AuthResponse = { isLoggedIn: boolean; user: NormalizedUser };

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
type EmployeeState = Record<`employee${EmployeeKeys}${Sex}`, number>;

type StandardState = {
  standardHc: boolean;
  standardSan: boolean;
  standardSanPlus: boolean;
  standardWellness: boolean;
  standardSafety: boolean;
  standardTis18001: boolean;
  standardIso45001: boolean;
  standardIso14001: boolean;
  standardZero: boolean;
  standard5S: boolean;
  standardHas: boolean;
};

type FileState = {
  fileStandardHc: File | null;
  fileStandardSan: File | null;
  fileStandardSanPlus: File | null;
  fileStandardWellness: File | null;
  fileStandardSafety: File | null;
  fileStandardTis18001: File | null;
  fileStandardIso45001: File | null;
  fileStandardIso14001: File | null;
  fileStandardZero: File | null;
  fileStandard5S: File | null;
  fileStandardHas: File | null;
};

type SafetyOfficerState = {
  safetyOfficerPrefix: string;
  safetyOfficerFirstName: string;
  safetyOfficerLastName: string;
  safetyOfficerPosition: string;
  safetyOfficerEmail: string;
  safetyOfficerPhone: string;
  safetyOfficerLineId: string;
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

const STD_ROWS: Array<{ k: keyof StandardState; fileK: keyof FileState; label: string }> = [
  { k: "standardHc", fileK: "fileStandardHc", label: "โรงอาหารปลอดภัยใส่ใจสุขภาพ (Healthy Canteen)" },
  { k: "standardSan", fileK: "fileStandardSan", label: "มาตรฐานสุขาภิบาลอาหาร : สถานที่จำหน่ายอาหาร (SAN)" },
  { k: "standardSanPlus", fileK: "fileStandardSanPlus", label: "มาตรฐานสุขาภิบาลอาหาร : สถานที่จำหน่ายอาหาร (SAN Plus)" },
  { k: "standardWellness", fileK: "fileStandardWellness", label: "สถานประกอบกิจการดีเด่นด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน" },
  { k: "standardSafety", fileK: "fileStandardSafety", label: "อุตสาหกรรมดีเด่น ประเภทการบริหารความปลอดภัย" },
  { k: "standardTis18001", fileK: "fileStandardTis18001", label: "TIS 18001" },
  { k: "standardIso45001", fileK: "fileStandardIso45001", label: "ISO 45001" },
  { k: "standardIso14001", fileK: "fileStandardIso14001", label: "ISO 14001" },
  { k: "standardZero", fileK: "fileStandardZero", label: "Zero Accident" },
  { k: "standard5S", fileK: "fileStandard5S", label: "รางวัล 5ส ประเทศไทย (Thailand 5S Award)" },
  { k: "standardHas", fileK: "fileStandardHas", label: "มาตรฐานส้วมสาธารณะระดับประเทศ (HAS)" },
];

const makeEmployeeInit = (): EmployeeState =>
  Object.fromEntries(
    EMP_ROWS.flatMap(({ code }) => [
      [`employee${code}M`, 0],
      [`employee${code}F`, 0],
    ]),
  ) as EmployeeState;

const EMP_INIT = makeEmployeeInit();

const STD_INIT: StandardState = {
  standardHc: false,
  standardSan: false,
  standardSanPlus: false,
  standardWellness: false,
  standardSafety: false,
  standardTis18001: false,
  standardIso45001: false,
  standardIso14001: false,
  standardZero: false,
  standard5S: false,
  standardHas: false,
};

const FILE_INIT: FileState = {
  fileStandardHc: null,
  fileStandardSan: null,
  fileStandardSanPlus: null,
  fileStandardWellness: null,
  fileStandardSafety: null,
  fileStandardTis18001: null,
  fileStandardIso45001: null,
  fileStandardIso14001: null,
  fileStandardZero: null,
  fileStandard5S: null,
  fileStandardHas: null,
};

const OFF_INIT: SafetyOfficerState = {
  safetyOfficerPrefix: "",
  safetyOfficerFirstName: "",
  safetyOfficerLastName: "",
  safetyOfficerPosition: "",
  safetyOfficerEmail: "",
  safetyOfficerPhone: "",
  safetyOfficerLineId: "",
};

const toInt = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

const emailOk = (email: string) =>
  !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const cleanPhone = (p: string) => p.replace(/[^\d+]/g, "").trim();

const phoneOk = (p: string) => {
  const c = cleanPhone(p);
  return c === "" || /^\d{10}$/.test(c);
};

const hasAnyContact = (o: SafetyOfficerState) =>
  Boolean(
    o.safetyOfficerEmail.trim() ||
    (cleanPhone(o.safetyOfficerPhone) && phoneOk(o.safetyOfficerPhone)) ||
    o.safetyOfficerLineId.trim(),
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
  const { user, isLoading } = useFactoryAuth();

  const [checkingEnroll, setCheckingEnroll] = useState(true);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [enrollInfo, setEnrollInfo] = useState<string>("");
  const [hasCover, setHasCover] = useState(false);
  const [coverStatus, setCoverStatus] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [employee, setEmployee] = useState<EmployeeState>(EMP_INIT);
  const [standard, setStandard] = useState<StandardState>(STD_INIT);
  const [files, setFiles] = useState<FileState>(FILE_INIT);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [officer, setOfficer] = useState<SafetyOfficerState>(OFF_INIT);
  const [submitting, setSubmitting] = useState(false);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<{
    employee: EmployeeState;
    standard: StandardState;
    officer: SafetyOfficerState;
  } | null>(null);

  const check = async () => {
    if (!user) return;
    setCheckingEnroll(true);
    try {
      const res = await fetch("/api/factories/enrolls", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
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

          // ✅ Robust Parsing: Handle array, nested enroll, or direct object
          let enroll = data?.enroll;
          if (!enroll && data) {
            if (Array.isArray(data)) {
              enroll = data[0];
            } else if (typeof data === "object" && !data.message) {
              enroll = data;
            }
          }

          if (enroll) {
            // Helper to get value from either camelCase or snake_case
            const v = (c: string, s: string) => enroll[c] ?? enroll[s];

            const fetchedEmployee: EmployeeState = {
              employeeThM: Number(v("employeeThM", "employee_th_m") ?? 0),
              employeeThF: Number(v("employeeThF", "employee_th_f") ?? 0),
              employeeMmM: Number(v("employeeMmM", "employee_mm_m") ?? 0),
              employeeMmF: Number(v("employeeMmF", "employee_mm_f") ?? 0),
              employeeKhM: Number(v("employeeKhM", "employee_kh_m") ?? 0),
              employeeKhF: Number(v("employeeKhF", "employee_kh_f") ?? 0),
              employeeLaM: Number(v("employeeLaM", "employee_la_m") ?? 0),
              employeeLaF: Number(v("employeeLaF", "employee_la_f") ?? 0),
              employeeVnM: Number(v("employeeVnM", "employee_vn_m") ?? 0),
              employeeVnF: Number(v("employeeVnF", "employee_vn_f") ?? 0),
              employeeCnM: Number(v("employeeCnM", "employee_cn_m") ?? 0),
              employeeCnF: Number(v("employeeCnF", "employee_cn_f") ?? 0),
              employeePhM: Number(v("employeePhM", "employee_ph_m") ?? 0),
              employeePhF: Number(v("employeePhF", "employee_ph_f") ?? 0),
              employeeJpM: Number(v("employeeJpM", "employee_jp_m") ?? 0),
              employeeJpF: Number(v("employeeJpF", "employee_jp_f") ?? 0),
              employeeInM: Number(v("employeeInM", "employee_in_m") ?? 0),
              employeeInF: Number(v("employeeInF", "employee_in_f") ?? 0),
              employeeOtherM: Number(v("employeeOtherM", "employee_other_m") ?? 0),
              employeeOtherF: Number(v("employeeOtherF", "employee_other_f") ?? 0),
            };

            const fetchedStandard: StandardState = {
              standardHc: !!v("standardHc", "standard_hc"),
              standardSan: !!v("standardSan", "standard_san"),
              standardSanPlus: !!v("standardSanPlus", "standard_san_plus"),
              standardWellness: !!v("standardWellness", "standard_wellness"),
              standardSafety: !!v("standardSafety", "standard_safety"),
              standardTis18001: !!v("standardTis18001", "standard_tis_18001"),
              standardIso45001: !!v("standardIso45001", "standard_iso_45001"),
              standardIso14001: !!v("standardIso14001", "standard_iso_14001"),
              standardZero: !!v("standardZero", "standard_zero"),
              standard5S: !!v("standard5S", "standard_5s"),
              standardHas: !!v("standardHas", "standard_has"),
            };

            const fetchedOfficer: SafetyOfficerState = {
              safetyOfficerPrefix: v("safetyOfficerPrefix", "safety_officer_prefix") || "",
              safetyOfficerFirstName: v("safetyOfficerFirstName", "safety_officer_first_name") || "",
              safetyOfficerLastName: v("safetyOfficerLastName", "safety_officer_last_name") || "",
              safetyOfficerPosition: v("safetyOfficerPosition", "safety_officer_position") || "",
              safetyOfficerEmail: v("safetyOfficerEmail", "safety_officer_email") || "",
              safetyOfficerPhone: v("safetyOfficerPhone", "safety_officer_phone") || "",
              safetyOfficerLineId: v("safetyOfficerLineId", "safety_officer_line_id") || "",
            };

            setEmployee(fetchedEmployee);
            setStandard(fetchedStandard);
            setOfficer(fetchedOfficer);
            setInitialData({
              employee: { ...fetchedEmployee },
              standard: { ...fetchedStandard },
              officer: { ...fetchedOfficer },
            });

            // ✅ Map File Names / URLs
            const names: Record<string, string> = {};
            STD_ROWS.forEach(({ k }) => {
              const camelName = `file${k.charAt(0).toUpperCase()}${k.slice(1)}`;
              const urlKeyCamel = `${camelName}Url`;
              const snakePart = k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
              const urlKeySnake = `file_${snakePart}_url`;
              const nameKeySnake = `file_${snakePart}`;

              names[k] = v(camelName, nameKeySnake) || v(urlKeyCamel, urlKeySnake) || "";
            });
            setFileNames(names);
          }

          try {
            const coverRes = await fetch("/api/factories/assessments/covers", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            });
            if (coverRes.status === 200) {
              const coverData = await coverRes.json();
              setHasCover(true);
              setCoverStatus(coverData?.status || "");
            } else {
              setHasCover(false);
              setCoverStatus("");
            }
          } catch (err) {
            setHasCover(false);
          }
        }
        return;
      }

      // Handle error status
      setAlreadyEnrolled(true);
      setEnrollInfo(`หมายเหตุ: ${msg || "ตรวจสอบสถานะไม่สำเร็จ"}`);
    } catch (e) {
      console.error("check enroll error:", e);
    } finally {
      setCheckingEnroll(false);
    }
  };

  useEffect(() => {
    check();
  }, [user]);

  const handleEditEnrollment = async () => {
    await check(); // Fresh fetch to ensure data is displayed
    setOpen(true);
  };

  const totals = useMemo(() => {
    let m = 0,
      f = 0;
    for (const { code } of EMP_ROWS) {
      m += employee[`employee${code}M` as keyof EmployeeState];
      f += employee[`employee${code}F` as keyof EmployeeState];
    }
    return { m, f, all: m + f };
  }, [employee]);

  const canSubmit = useMemo(() => {
    // if (alreadyEnrolled) return false; // Allowed to update

    const hasEmployee = totals.all > 0;

    const requiredName =
      officer.safetyOfficerPrefix.trim() &&
      officer.safetyOfficerFirstName.trim() &&
      officer.safetyOfficerLastName.trim() &&
      officer.safetyOfficerPosition.trim();

    const contactOk = hasAnyContact(officer);
    const emailValid = emailOk(officer.safetyOfficerEmail);
    const phoneValid = phoneOk(officer.safetyOfficerPhone);

    const standardsOk = STD_ROWS.every(({ k, fileK }) => {
      if (standard[k]) {
        // If editing, allow if either a new file is uploaded OR an old file exists
        return files[fileK] !== null || !!fileNames[k];
      }
      return true;
    });

    return Boolean(hasEmployee && requiredName && contactOk && emailValid && phoneValid && standardsOk);
  }, [alreadyEnrolled, totals.all, officer, standard, files, fileNames]);

  const reset = () => {
    setEmployee(EMP_INIT);
    setStandard(STD_INIT);
    setFiles(FILE_INIT);
    setOfficer(OFF_INIT);
  };

  const submit = async () => {
    if (totals.all <= 0)
      return window.alert("กรุณากรอกจำนวนพนักงานรวมให้มากกว่า 0");

    const requiredName =
      officer.safetyOfficerPrefix.trim() &&
      officer.safetyOfficerFirstName.trim() &&
      officer.safetyOfficerLastName.trim() &&
      officer.safetyOfficerPosition.trim();
    if (!requiredName)
      return window.alert(
        "กรุณากรอกข้อมูลผู้ติดต่อ (คำนำหน้า/ชื่อ/นามสกุล/ตำแหน่ง) ให้ครบ",
      );

    if (!hasAnyContact(officer))
      return window.alert(
        "กรุณากรอกช่องทางติดต่ออย่างน้อย 1 อย่าง (อีเมล หรือ โทรศัพท์ หรือ LINE ID)",
      );

    if (officer.safetyOfficerPhone.trim() && !phoneOk(officer.safetyOfficerPhone))
      return window.alert("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักเท่านั้น");

    const missingFile = STD_ROWS.find(({ k, fileK }) => standard[k] && !files[fileK] && !fileNames[k]);
    if (missingFile) {
      return window.alert(`กรุณาแนบไฟล์สำหรับ: ${missingFile.label}`);
    }

    let invalidType = false;
    let invalidSize = false;
    Object.values(files).forEach((v) => {
      if (v instanceof File) {
        if (v.type !== "application/pdf" && !v.name.toLowerCase().endsWith(".pdf")) invalidType = true;
        if (v.size > 10 * 1024 * 1024) invalidSize = true;
      }
    });

    if (invalidType)
      return window.alert("ไม่อนุญาตให้อัปโหลดไฟล์ที่ไม่ใช่ PDF กรุณาตรวจสอบไฟล์แนบอีกครั้ง");
    if (invalidSize)
      return window.alert("ขนาดไฟล์แนบแต่ละไฟล์ต้องไม่เกิน 10MB กรุณาตรวจสอบไฟล์แนบอีกครั้ง");

    if (!window.confirm("ท่านต้องการยืนยันสมัครโครงการหรือไม่?")) return;

    try {
      setSubmitting(true);

      const method = alreadyEnrolled ? "PATCH" : "POST";
      let requestBody: any;
      let contentType: string | undefined;

      if (method === "PATCH" && initialData) {
        // Compute diff
        const diff: any = {};
        let hasFile = false;

        Object.entries(employee).forEach(([k, v]) => {
          if (v !== initialData.employee[k as keyof EmployeeState]) diff[k] = v;
        });
        Object.entries(standard).forEach(([k, v]) => {
          if (v !== initialData.standard[k as keyof StandardState]) diff[k] = v;
        });
        Object.entries(officer).forEach(([k, v]) => {
          if (v !== initialData.officer[k as keyof SafetyOfficerState]) diff[k] = v;
        });

        Object.entries(files).forEach(([k, v]) => {
          if (v instanceof File) {
            diff[k] = v;
            hasFile = true;
          }
        });

        if (Object.keys(diff).length === 0) {
          window.alert("ไม่มีการเปลี่ยนแปลงข้อมูลที่ต้องบันทึก");
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        Object.entries(diff).forEach(([k, v]) => formData.append(k, v as any));
        requestBody = formData;
      } else {
        // Full POST or no initial data
        const formData = new FormData();
        Object.entries(employee).forEach(([k, v]) => formData.append(k, v as any));
        Object.entries(standard).forEach(([k, v]) => formData.append(k, v as any));
        Object.entries(officer).forEach(([k, v]) => formData.append(k, v as any));
        Object.entries(files).forEach(([k, v]) => {
          if (v instanceof File) formData.append(k, v);
        });
        requestBody = formData;
      }

      const res = await fetch("/api/factories/enrolls", {
        method: method,
        headers: contentType ? { "Content-Type": contentType } : undefined,
        credentials: "include",
        body: requestBody,
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

      setCheckingEnroll(true);
      try {
        const re = await fetch("/api/factories/enrolls", {
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

  const [isCreatingCover, setIsCreatingCover] = useState(false);

  const handleCreateCover = async () => {
    if (hasCover) {
      router.push("/factories/question");
      return;
    }

    if (!window.confirm("ท่านต้องการสร้างแบบประเมินใช่หรือไม่?")) return;

    try {
      setIsCreatingCover(true);

      const postRes = await fetch("/api/factories/assessments/covers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });

      if (postRes.status === 200) {
        window.alert("สร้างแบบประเมินสำเร็จ ✅");
        router.push("/factories/question");
      } else if (postRes.status === 400) {
        // หากส่งไปแล้วยังพบว่ามีอยู่แล้ว (อาจจะ race condition)
        window.alert("ท่านมีแบบประเมินสำหรับปีนี้อยู่แล้ว");
        router.push("/factories/question");
      } else if (postRes.status === 404) {
        window.alert("ไม่พบข้อมูลการลงทะเบียน (Enroll not found)");
      } else {
        const text = await postRes.text();
        window.alert(`เกิดข้อผิดพลาดในการสร้าง: ${postRes.status} ${text}`);
      }
    } catch (err) {
      console.error(err);
      window.alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsCreatingCover(false);
    }
  };

  if (isLoading) return <div className="p-10 text-black">Loading...</div>;
  if (!user) return null;

  return (
    <>
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
                <div className="rounded-2xl bg-white p-6 text-center text-black shadow-sm mt-4 border border-gray-100">
                  <div className="font-semibold mb-2 text-lg">ท่านลงสมัครโครงการเรียบร้อยแล้ว</div>
                  <div className="text-gray-600 text-sm mb-4">
                    {hasCover
                      ? "ท่านสามารถเข้าทำแบบประเมินได้เลย"
                      : "กรุณากดปุ่มด้านล่างเพื่อสร้างแบบประเมินสำหรับสถานประกอบการของท่าน"}
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {coverStatus === "in_review" ? (
                      <div className="bg-emerald-100 text-emerald-800 px-10 py-4 rounded-2xl font-bold border-2 border-emerald-200 flex items-center gap-2 text-lg shadow-sm">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                        ประเมินเรียบร้อยแล้ว
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleCreateCover}
                          disabled={isCreatingCover}
                          className="bg-[#2E8B57] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#246e45] transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                          {isCreatingCover ? "กำลังดำเนินการ..." : (hasCover ? "เข้าทำแบบประเมิน" : "กดเพื่อสร้างแบบประเมิน")}
                        </button>
                        <button
                          onClick={handleEditEnrollment}
                          className="text-[#2E8B57] border-2 border-[#2E8B57] px-8 py-3 rounded-2xl font-bold hover:bg-[#E9F7EF] transition-all active:scale-95"
                        >
                          แก้ไขข้อมูลการสมัคร
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-[#2E8B57] font-semibold flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-[#2E8B57] rounded-full animate-pulse" />
                      ด้านล่างมีแบบประเมินทั้งหมด 41 ข้อ
                    </p>
                  </div>
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

          {open && (
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
                        const mk = `employee${code}M` as keyof EmployeeState;
                        const fk = `employee${code}F` as keyof EmployeeState;
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
                  {STD_ROWS.map(({ k, fileK, label }) => (
                    <div key={k} className="flex flex-col gap-2 p-3 border border-gray-100 rounded-2xl bg-gray-50">
                      <CheckItem
                        label={label}
                        checked={standard[k]}
                        onChange={(v) => {
                          setStandard((s) => ({ ...s, [k]: v }));
                          if (!v) setFiles((f) => ({ ...f, [fileK]: null }));
                        }}
                      />
                      {standard[k] && (
                        <div className="mt-1">
                          <label className="text-xs text-gray-700 font-medium mb-1 block">แนบไฟล์ (PDF เท่านั้น, ขนาดไม่เกิน 10MB)</label>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="text-xs w-full bg-white border border-gray-200 rounded-xl p-2 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-[#E9F7EF] file:text-[#277549] hover:file:bg-[#D1EBDC] cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                                  alert("กรุณาแนบไฟล์ PDF เท่านั้น");
                                  e.target.value = "";
                                  setFiles((f) => ({ ...f, [fileK]: null }));
                                  return;
                                }
                                if (file.size > 10 * 1024 * 1024) {
                                  alert("ขนาดไฟล์ต้องไม่เกิน 10MB");
                                  e.target.value = "";
                                  setFiles((f) => ({ ...f, [fileK]: null }));
                                  return;
                                }
                              }
                              setFiles((f) => ({ ...f, [fileK]: file }));
                            }}
                          />
                        </div>
                      )}
                      {fileNames[k] && (
                        <div className="mt-2 pl-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFileName(fileNames[k]);
                            }}
                            className="text-xs text-[#2E8B57] font-semibold hover:underline flex items-center gap-1.5 bg-[#E9F7EF] w-fit px-3 py-1.5 rounded-xl border border-[#BFE6D1] cursor-pointer"
                          >
                            <FileText size={14} />
                            ดูไฟล์เดิมที่เคยอัปโหลด
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="3) ผู้ติดต่อ (กรอกช่องทางอย่างน้อย 1 อย่าง)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="คำนำหน้า*"
                    value={officer.safetyOfficerPrefix}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safetyOfficerPrefix: v }))
                    }
                  />
                  <TextField
                    label="ตำแหน่ง*"
                    value={officer.safetyOfficerPosition}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safetyOfficerPosition: v }))
                    }
                  />
                  <TextField
                    label="ชื่อ*"
                    value={officer.safetyOfficerFirstName}
                    onChange={(v) =>
                      setOfficer((s) => ({
                        ...s,
                        safetyOfficerFirstName: v,
                      }))
                    }
                  />
                  <TextField
                    label="นามสกุล*"
                    value={officer.safetyOfficerLastName}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safetyOfficerLastName: v }))
                    }
                  />

                  <TextField
                    label="อีเมล"
                    value={officer.safetyOfficerEmail}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safetyOfficerEmail: v }))
                    }
                    error={
                      officer.safetyOfficerEmail.trim() &&
                        !emailOk(officer.safetyOfficerEmail)
                        ? "รูปแบบอีเมลไม่ถูกต้อง"
                        : ""
                    }
                  />
                  <TextField
                    label="โทรศัพท์"
                    value={officer.safetyOfficerPhone}
                    onChange={(v) => {
                      const clean = v.replace(/[^\d]/g, "").slice(0, 10);
                      setOfficer((s) => ({ ...s, safetyOfficerPhone: clean }));
                    }}
                    error={
                      officer.safetyOfficerPhone.trim() &&
                        !phoneOk(officer.safetyOfficerPhone)
                        ? "ตัวเลข 10 หลักเท่านั้น"
                        : ""
                    }
                  />
                  <TextField
                    label="LINE ID"
                    value={officer.safetyOfficerLineId}
                    onChange={(v) =>
                      setOfficer((s) => ({ ...s, safetyOfficerLineId: v }))
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
                  className={`rounded-2xl px-6 py-3 font-semibold text-white shadow-sm ${submitting
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
      {previewFileName && (
        <FilePreviewModal
          fileName={previewFileName}
          onClose={() => setPreviewFileName(null)}
        />
      )}
    </>
  );
}

// --- Preview Modal Component ---
function FilePreviewModal({ fileName, onClose }: { fileName: string; onClose: () => void }) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setPresignedUrl(null);

    fetch(`/api/factories/files?fileName=${encodeURIComponent(fileName)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const url = data.url || data.presignedUrl || data.presigned_url;
        if (typeof url !== "string" || !url.startsWith("http")) {
          throw new Error("URL ไม่ถูกต้อง");
        }
        if (!cancelled) setPresignedUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError("ไม่สามารถโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [fileName]);

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/factories/files?fileName=${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const url = data.url || data.presignedUrl || data.presigned_url;
      if (typeof url === "string" && url.startsWith("http")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        a.click();
      }
    } catch {
      alert("ไม่สามารถดาวน์โหลดไฟล์ได้");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-[#2E8B57] rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">ตัวอย่างไฟล์</h3>
              <p className="text-xs text-gray-500 font-medium">เอกสารหลักฐาน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2.5 text-gray-500 hover:text-[#2E8B57] hover:bg-green-50 rounded-xl transition-colors"
              title="ดาวน์โหลดไฟล์"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-100 relative min-h-0">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-20">
              <Loader2 className="animate-spin text-[#2E8B57]" size={32} />
              <p className="text-sm font-medium text-gray-600">กำลังโหลดเอกสาร...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-20">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                <X size={32} />
              </div>
              <p className="text-sm font-medium text-gray-700">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#2E8B57] text-white rounded-xl text-sm font-semibold hover:bg-[#257a4a] transition-colors"
              >
                ปิด
              </button>
            </div>
          )}

          {presignedUrl && (
            <iframe
              key={presignedUrl}
              src={presignedUrl}
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          )}
        </div>
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
        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-black outline-none focus:ring-2 focus:ring-[#2E8B57]/30 ${error ? "border-red-300" : "border-gray-200"
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
