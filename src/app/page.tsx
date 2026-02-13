"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const SLIDES = [
  { src: "/img/slide1.jpeg", alt: "slide1" },
  // { src: "/img/slide2.jpeg", alt: "slide2" },
  // { src: "/img/slide3.jpeg", alt: "slide3" },
];

export default function LoginPage() {
  const router = useRouter();

  // ===== Slider state =====
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // ===== Login state =====
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) router.push(data.redirectUrl || "/");
      else setError(data?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-2">
      <div className="relative w-full h-[260px] md:h-screen overflow-hidden bg-black">
        {SLIDES.map((s, i) => (
          <div
            key={s.src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === slideIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={s.src}
              alt={s.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center bg-[#F3F6F4] p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#2E8B57]" />
          <ShieldCheck className="absolute -bottom-10 -right-10 text-gray-50 opacity-10 w-48 h-48 rotate-12" />

          <div className="text-center mb-8 relative z-10">
            <div className="w-16 h-16 bg-green-100 text-[#2E8B57] rounded-full flex items-center justify-center mx-auto mb-4">
              <Image
                src="/img/logo_moph.png"
                alt="logo_moph"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h1>
            <p className="text-gray-500 text-sm mt-1">
              สถานประกอบการ ปลอดโรค ปลอดภัย กายใจเป็นสุข
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">
                ชื่อผู้ใช้งาน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-3 text-gray-800 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                  placeholder="ระบุชื่อผู้ใช้งาน"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-12 py-3 text-gray-800 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                  placeholder="ระบุรหัสผ่าน"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
              disabled={isLoading}
              className="w-full bg-[#2E8B57] hover:bg-[#257a4a] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> กำลังตรวจสอบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          <div className="text-center pt-3 relative z-10">
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-sm text-[#2E8B57] hover:underline font-medium"
            >
              ลงทะเบียนสถานประกอบการใหม่
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
