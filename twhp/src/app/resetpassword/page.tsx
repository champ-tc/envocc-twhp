"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, ChevronLeft, CheckCircle2 } from "lucide-react";
import Image from "next/image";

function hasThaiChars(v: string): boolean {
  return /[\u0E00-\u0E7F]/.test(v);
}

function passwordChecks(pw: string) {
  const checks = [
    {
      key: "len",
      label: "ความยาว 12–20 ตัวอักษร",
      ok: pw.length >= 12 && pw.length <= 20,
    },
    { key: "noThai", label: "ห้ามมีภาษาไทย", ok: !hasThaiChars(pw) },
    { key: "upper", label: "มีตัวพิมพ์ใหญ่ (A-Z)", ok: /[A-Z]/.test(pw) },
    { key: "lower", label: "มีตัวพิมพ์เล็ก (a-z)", ok: /[a-z]/.test(pw) },
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
  if (hasThaiChars(el.value)) el.value = el.value.replace(/[\u0E00-\u0E7F]/g, "");
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const pwInfo = useMemo(() => passwordChecks(password), [password]);
  const pwMatchOk = useMemo(
    () =>
      password.length > 0 &&
      confirmPassword.length > 0 &&
      password === confirmPassword,
    [password, confirmPassword],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwInfo.allOk) {
      setError("รหัสผ่านยังไม่ผ่านเงื่อนไขทั้งหมด");
      return;
    }
    if (!pwMatchOk) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resetpassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setSuccess(true);
      } else {
        let errorMessage = data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ";
        const lowerMsg = errorMessage.toLowerCase();
        
        if (lowerMsg === "old password are not allowed" || lowerMsg.includes("old password")) {
          errorMessage = "รหัสผ่านใหม่ห้ามซ้ำกับรหัสผ่านเดิม";
        } else if (lowerMsg.includes("invalid token")) {
          errorMessage = "TOKEN หมดอายุ กรุณากดลืมรหัสผ่านใหม่";
          setTimeout(() => {
            router.push("/");
          }, 3000);
        }
        
        setError(errorMessage);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    "w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2E8B57] text-gray-800 placeholder-gray-400 bg-gray-50 focus:bg-white transition";
  const labelBase = "text-sm font-medium text-gray-700 ml-1 block mb-2";
  const toggleBtn =
    "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none";

  return (
    <div className="min-h-screen bg-[#F3F6F4] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#2E8B57] opacity-10 rounded-b-[50%] -translate-y-1/2" />

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-lg border border-gray-100 relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#2E8B57]" />

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-green-100 text-[#2E8B57] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">เปลี่ยนรหัสผ่านใหม่</h1>
          <p className="text-gray-500 text-sm mt-2">
            กรุณากำหนดรหัสผ่านใหม่ของคุณ
          </p>
        </div>

        {success ? (
          <div className="text-center relative z-10 space-y-6">
            <div className="flex justify-center text-green-500 mb-4">
              <CheckCircle2 size={64} />
            </div>
            <div className="bg-green-50 text-green-700 py-4 px-6 rounded-xl border border-green-100 text-sm leading-relaxed font-medium">
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-[#2E8B57] hover:bg-[#257a4a] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10 text-left">
            <div>
              <label className={labelBase}>รหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className={inputBase + " pr-12"}
                  value={password}
                  maxLength={20}
                  onChange={(e) => setPassword(e.target.value)}
                  onInput={stripThaiOnInput}
                  placeholder="ระบุรหัสผ่านใหม่"
                  required
                />
                <button type="button" className={toggleBtn} onClick={() => setShowPw((v) => !v)}>
                  <Image
                    src={showPw ? "/img/hide.png" : "/img/eye.png"}
                    alt="toggle password"
                    width={20}
                    height={20}
                    className="opacity-60 hover:opacity-100"
                  />
                </button>
              </div>
              <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1.5 shadow-inner">
                {pwInfo.checks.map((c) => (
                  <div
                    key={c.key}
                    className={`text-xs flex items-center gap-1.5 font-medium ${c.ok ? "text-emerald-600" : "text-gray-500"}`}
                  >
                    {c.ok ? "✓" : "•"} {c.label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={labelBase}>ยืนยันรหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showPw2 ? "text" : "password"}
                  className={inputBase + " pr-12"}
                  value={confirmPassword}
                  maxLength={20}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onInput={stripThaiOnInput}
                  placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                  required
                />
                <button type="button" className={toggleBtn} onClick={() => setShowPw2((v) => !v)}>
                  <Image
                    src={showPw2 ? "/img/hide.png" : "/img/eye.png"}
                    alt="toggle confirm password"
                    width={20}
                    height={20}
                    className="opacity-60 hover:opacity-100"
                  />
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${pwMatchOk ? "text-emerald-600" : "text-red-500"}`}>
                  {pwMatchOk ? "✓ รหัสผ่านตรงกัน" : "✗ รหัสผ่านไม่ตรงกัน"}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm py-3 px-4 rounded-xl flex items-center gap-2 border border-red-100">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !token || !password || !confirmPassword || !pwInfo.allOk || !pwMatchOk}
              className="w-full bg-[#2E8B57] hover:bg-[#257a4a] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                "เปลี่ยนรหัสผ่าน"
              )}
            </button>
          </form>
        )}

        {!success && (
          <div className="text-center pt-6 relative z-10">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center mx-auto gap-1 font-medium transition-colors"
            >
              <ChevronLeft size={16} /> กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F3F6F4] flex items-center justify-center"><Loader2 className="animate-spin text-[#2E8B57]" size={32} /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
