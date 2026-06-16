"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  ArrowLeft,
  RefreshCcw,
} from "lucide-react";
import Image from "next/image";

const SLIDES = [
  { src: "/img/slide1.jpeg", alt: "slide1" },
];

const toText = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OTPInput = ({ value, onChange, disabled }: OTPInputProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const newOtp = value.split("");
    newOtp[index] = val.slice(-1);
    const combined = newOtp.join("");
    onChange(combined);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d*$/.test(pastedData)) return;
    onChange(pastedData.padEnd(6, ""));
  };

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className="h-14 w-10 sm:w-12 text-center text-2xl font-black border border-slate-200 rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all bg-white text-slate-900 shadow-sm disabled:opacity-50"
        />
      ))}
    </div>
  );
};

export default function LoginPage() {
  const router = useRouter();

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [info, setInfo] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Timer for Resend OTP
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
    setInfo("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        if (data?.twoFactorRequired || data?.two_factor_required) {
          setTwoFactorRequired(true);
          setChallengeId(toText(data.challengeId ?? data.challenge_id ?? data.challengeid));
          setMaskedEmail(toText(data.emailMasked ?? data.email_masked ?? data.email));
          setInfo(data.message || "โปรดกรอก OTP ที่ส่งไปยังอีเมลของคุณ");
          setTimer(60);
          return;
        }
        router.push(data.redirectUrl || "/");
      } else {
        setError(data?.message || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) {
      setError("ไม่พบข้อมูล challenge OTP");
      return;
    }

    if (otpCode.length < 6) {
      setError("โปรดกรอกรหัส OTP ให้ครบ 6 หลัก");
      return;
    }

    setIsLoading(true);
    setError("");
    setInfo("");

    try {
      const otpCodeText = otpCode.trim();
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: String(challengeId),
          otpCode: otpCodeText,
        }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        router.push(data.redirectUrl || "/");
      } else {
        setError(data?.message || "ยืนยัน OTP ไม่สำเร็จ");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challengeId || timer > 0) return;

    setIsResending(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: String(challengeId) }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setInfo("ส่ง OTP ใหม่เรียบร้อยแล้ว โปรดตรวจสอบอีเมลของคุณ");
        setTimer(60);
      } else {
        setError(data?.message || "ไม่สามารถส่ง OTP ใหม่ได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsResending(false);
    }
  };

  const handleResetLogin = () => {
    setTwoFactorRequired(false);
    setChallengeId("");
    setMaskedEmail("");
    setOtpCode("");
    setInfo("");
    setError("");
    setTimer(0);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-900">
      {SLIDES.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          priority={index === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ${index === slideIndex ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      <div className="absolute inset-0 bg-slate-950/45" />
      <div className="absolute inset-0 login-overlay" />

      <section className="relative z-10 flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-14">
        <div className="login-content-grid mx-auto grid w-full max-w-7xl items-center gap-10">
          <div className="hidden max-w-2xl text-white lg:block">
            <h1 className="text-5xl font-black leading-tight xl:text-6xl">
              สถานประกอบการ <br /> ปลอดโรค ปลอดภัย <br /> กายใจเป็นสุข
            </h1>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
              <ShieldCheck size={18} />
              Total Worker Health Program
            </div>
          </div>

          <div className="mx-auto w-full max-w-login lg:mx-0">
            <div className="mb-6 flex items-center gap-4 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <Image
                  src="/img/logo_moph.png"
                  alt="logo_moph"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  {twoFactorRequired ? "ยืนยันตัวตน" : "เข้าสู่ระบบ"}
                </h1>
                <p className="text-sm text-slate-500">
                  สถานประกอบการ ปลอดโรค ปลอดภัย กายใจเป็นสุข
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-login-card border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <div className="hidden border-b border-slate-100 px-8 py-7 lg:flex lg:items-center lg:gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <Image
                    src="/img/logo_moph.png"
                    alt="logo_moph"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {twoFactorRequired ? "ยืนยันตัวตน" : "เข้าสู่ระบบ"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    สถานประกอบการ ปลอดโรค ปลอดภัย กายใจเป็นสุข
                  </p>
                </div>
              </div>

              <form
                onSubmit={twoFactorRequired ? handleVerifyOtp : handleLogin}
                className="space-y-6 px-6 py-7 sm:px-8 sm:py-8"
              >
                {!twoFactorRequired ? (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="username" className="text-sm font-bold text-slate-700">
                        ชื่อผู้ใช้งาน
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          required
                          autoComplete="username"
                          className="h-14 w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                          placeholder="ระบุชื่อผู้ใช้งาน"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-bold text-slate-700">
                        รหัสผ่าน
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          autoComplete="current-password"
                          className="h-14 w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-12 text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                          placeholder="ระบุรหัสผ่าน"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                          aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        >
                          {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => router.push("/forgetpassword")}
                        className="text-sm font-bold text-brand transition hover:text-brand-deep"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm">
                        <Mail size={22} />
                      </div>
                      <div className="text-sm text-slate-600">ระบบได้ส่งรหัส OTP ไปยังอีเมล</div>
                      <div className="mt-1 font-black text-brand">{maskedEmail || "(ไม่ทราบอีเมล)"}</div>
                      <div className="mt-2 text-xs text-slate-500">*หากไม่พบในกล่องขาเข้า โปรดตรวจสอบใน Junk/Spam</div>
                    </div>

                    <div className="space-y-3 text-center">
                      <label className="text-sm font-black uppercase tracking-wide text-slate-700">
                        กรอกรหัส OTP 6 หลัก
                      </label>
                      <OTPInput
                        value={otpCode}
                        onChange={(val) => {
                          setOtpCode(val);
                          setError("");
                          setInfo("");
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <span className="leading-6">{error}</span>
                  </div>
                )}

                {info && !error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                    <span className="leading-6">{info}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-brand-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-brand"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {twoFactorRequired ? "กำลังยืนยัน OTP..." : "กำลังตรวจสอบ..."}
                    </>
                  ) : (
                    twoFactorRequired ? "ยืนยันรหัส OTP" : "เข้าสู่ระบบ"
                  )}
                </button>

                {twoFactorRequired && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResending || isLoading || timer > 0}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isResending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                      {isResending ? "" : timer > 0 ? `ส่งใหม่ใน ${timer}s` : "ส่งรหัสใหม่"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetLogin}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowLeft size={14} />
                      กลับหน้าหลัก
                    </button>
                  </div>
                )}
              </form>

              {!twoFactorRequired && (
                <div className="border-t border-slate-100 px-8 py-5 text-center">
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="text-sm font-bold text-brand transition hover:text-brand-deep"
                  >
                    ลงทะเบียนสถานประกอบการใหม่
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
