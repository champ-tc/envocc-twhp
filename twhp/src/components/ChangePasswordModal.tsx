"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

function hasThaiChars(v: string): boolean {
  return /[\u0E00-\u0E7F]/.test(v);
}

function passwordChecks(pw: string) {
  const checks = [
    { key: "len", label: "ความยาว 12–20 ตัวอักษร", ok: pw.length >= 12 && pw.length <= 20 },
    { key: "noThai", label: "ห้ามมีภาษาไทย", ok: !hasThaiChars(pw) },
    { key: "upper", label: "มีตัวพิมพ์ใหญ่ (A-Z)", ok: /[A-Z]/.test(pw) },
    { key: "lower", label: "มีตัวพิมพ์เล็ก (a-z)", ok: /[a-z]/.test(pw) },
    { key: "digit", label: "มีตัวเลข (0-9)", ok: /[0-9]/.test(pw) },
    { key: "spec", label: "มีอักษรพิเศษ (# / @ &) อย่างน้อย 1 ตัวอักษร", ok: /[#\/@&]/.test(pw) },
  ] as const;

  return { checks, allOk: checks.every((c) => c.ok) };
}

function stripThaiOnInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  if (hasThaiChars(el.value)) el.value = el.value.replace(/[\u0E00-\u0E7F]/g, "");
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function ChangePasswordModal({
  isOpen,
  userRole,
}: {
  isOpen: boolean;
  userRole: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const pwInfo = useMemo(() => passwordChecks(password), [password]);
  const pwMatchOk = Object.is(password, confirmPassword) && password.length > 0;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!isEmail(email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (!pwInfo.allOk) {
      setError("รหัสผ่านยังไม่ผ่านเงื่อนไขทั้งหมด");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const isProvincial = userRole === "Provincial" || userRole === "Provicial" || userRole === "ODPC";
      const isEvaluator = userRole === "Evaluator";

      let endpoint = "";
      if (isProvincial) {
        endpoint = "/api/auth/changePassword/provincial";
      } else if (isEvaluator) {
        endpoint = "/api/auth/changePassword/evaluator";
      } else {
        setError("ระบบยังไม่รองรับการเปลี่ยนรหัสผ่านสำหรับสิทธิ์ของคุณ");
        setLoading(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "เปลี่ยนข้อมูลไม่สำเร็จ";
        
        const lowerText = text.toLowerCase();
        if (lowerText.includes("email already") || lowerText.includes("email already exists")) {
          errorMsg = "อีเมลนี้มีผู้ใช้งานแล้วในระบบ";
        } else if (lowerText.includes("password already") || lowerText.includes("already change")) {
          errorMsg = "รหัสผ่านนี้ได้ถูกเปลี่ยนไปแล้ว";
        } else {
          try {
            const data = JSON.parse(text);
            if (data.message) errorMsg = data.message;
          } catch {
            if (text) errorMsg = text;
          }
        }
        throw new Error(errorMsg);
      }

      // 🧹 เคลียร์ Session เดิมทิ้งหลังจากเปลี่ยนรหัสผ่านสำเร็จ
      await fetch("/api/auth/logout", { method: "POST" });

      alert("ตั้งค่าสำเร็จ กรุณาเข้าสู่ระบบใหม่");
      router.push("/");
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-modal overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">ตั้งค่าข้อมูลเพื่อความปลอดภัย</h2>
        <p className="text-sm text-gray-600 mb-6">
          กรุณาเพิ่มอีเมลเพื่อใช้สำหรับการรีเซ็ตรหัสผ่าน และเปลี่ยนรหัสผ่านใหม่เพื่อความปลอดภัยในการเข้าสู่ระบบครั้งต่อไป
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              อีเมล
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              รหัสผ่านใหม่ (New Password)
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-brand outline-none"
                value={password}
                maxLength={20}
                onChange={(e) => setPassword(e.target.value)}
                onInput={stripThaiOnInput}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-50 text-gray-500"
                onClick={() => setShowPw((v) => !v)}
              >
                <Image
                  src={showPw ? "/img/hide.png" : "/img/eye.png"}
                  alt="toggle password"
                  width={20}
                  height={20}
                />
              </button>
            </div>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <div className="relative">
              <input
                type={showPw2 ? "text" : "password"}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-brand outline-none"
                value={confirmPassword}
                maxLength={20}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onInput={stripThaiOnInput}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-50 text-gray-500"
                onClick={() => setShowPw2((v) => !v)}
              >
                <Image
                  src={showPw2 ? "/img/hide.png" : "/img/eye.png"}
                  alt="toggle confirm password"
                  width={20}
                  height={20}
                />
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <div className={`mt-2 text-xs ${pwMatchOk ? "text-emerald-700" : "text-red-600"}`}>
                {pwMatchOk ? "✓ รหัสผ่านตรงกัน" : "✗ รหัสผ่านไม่ตรงกัน"}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white mt-6 py-2 rounded-lg font-bold hover:bg-brand-hover disabled:opacity-50 transition"
          >
            {loading ? "กำลังดำเนินการ..." : "บันทึกข้อมูลและรหัสผ่านใหม่"}
          </button>
        </form>
      </div>
    </div>
  );
}
