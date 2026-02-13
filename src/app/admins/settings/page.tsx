"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

type AuthUser = {
  id: number;
  role: string;
  username: string;
  fullName: string;
  establishment: string;
};

type AuthResponse = {
  isLoggedIn: boolean;
  user: AuthUser;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const adminRoles = ["Provincial", "Evaluator", "DOED", "Provicial"];

    fetch("/api/auth/authentication", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as AuthResponse;
      })
      .then((data) => {
        if (!data?.isLoggedIn || !data.user) {
          router.push("/");
          return;
        }

        if (!adminRoles.includes(data.user.role)) {
          router.push("/users/main");
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
          title="ตั้งค่า"
          fullName={user.fullName} // ✅ เป็น string แน่
          userRole={user.role}
          establishment={user.establishment} // ✅ เป็น string แน่
          username={user.username}
        />

        <main className="flex-1 overflow-auto p-8">
          <div className="bg-white p-6 text-gray-800 rounded-lg shadow">
            ยินดีต้อนรับ {user.fullName || user.username}
          </div>
        </main>
      </div>
    </div>
  );
}
