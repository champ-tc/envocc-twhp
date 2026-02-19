"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import type { NormalizedUser } from "@/lib/auth-utils";

type AuthResponse = {
  isLoggedIn: boolean;
  user: NormalizedUser;
};

export default function UserMainPage() {
  const router = useRouter();
  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/authentication", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as AuthResponse;
      })
      .then((data) => {
        if (!data?.isLoggedIn || !data.user) throw new Error("Unauthorized");

        // ✅ หน้านี้เป็นของ Factory: ถ้าไม่ใช่ Factory ให้ดีดไปฝั่ง admin
        if (data.user.role !== "Factory") {
          router.push("/admins/dashboard");
          return;
        }

        setUser(data.user);
      })
      .catch(() => router.push("/"))
      .finally(() => setIsLoading(false));
  }, [router]);

  if (isLoading) return <div className="p-10">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F3F6F4]">
        <Navbar
          title="User Dashboard"
          fullName={user.fullName}
          userRole={user.role}
          establishment={user.establishment}
          username={user.username}
        />

        <main className="flex-1 overflow-auto p-8">
          <div className="bg-[#2E8B57] p-8 rounded-3xl text-white">
            สวัสดี {user.fullName}
            <br />
            ท่านได้สมัครสมาชิกเรียบร้อยแล้ว
          </div>
        </main>
      </div>
    </div>
  );
}
