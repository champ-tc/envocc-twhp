"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Loader2, ChevronLeft } from "lucide-react";

export default function ForgetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgetpassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setSuccess(true);
      } else {
        let errorMessage = data?.message || "ส่งคำขอไม่สำเร็จ";
        if (errorMessage.toLowerCase() === "email not found") {
          errorMessage = "ไม่พบผู้ใช้งานนี้ในระบบ";
        }
        setError(errorMessage);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F4] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#2E8B57] opacity-10 rounded-b-[50%] -translate-y-1/2" />

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#2E8B57]" />
        <ShieldCheck className="absolute -bottom-10 -right-10 text-gray-50 opacity-10 w-48 h-48 rotate-12" />

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-green-100 text-[#2E8B57] rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ลืมรหัสผ่าน</h1>
          <p className="text-gray-500 text-sm mt-2">
            กรุณากรอกอีเมลที่ใช้ลงทะเบียนในระบบ
          </p>
        </div>

        {success ? (
          <div className="text-center relative z-10 space-y-6">
            <div className="bg-green-50 text-green-700 py-4 px-6 rounded-xl border border-green-100 text-sm leading-relaxed">
              ทำการส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบอีเมลของคุณ
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-[#2E8B57] hover:bg-[#257a4a] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">
                อีเมล
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-3 text-gray-800 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm py-2 px-4 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-[#2E8B57] hover:bg-[#257a4a] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> กำลังส่ง...
                </>
              ) : (
                "ส่งลิงก์รีเซ็ตรหัสผ่าน"
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
