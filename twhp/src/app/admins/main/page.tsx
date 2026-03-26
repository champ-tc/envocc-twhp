"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import type { NormalizedUser } from "@/lib/auth-utils";
import { isAdminRole } from "@/lib/role-redirect";

type AuthResponse = {
  isLoggedIn: boolean;
  user: NormalizedUser;
};

function isAbortError(e: unknown) {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (typeof e === "object" &&
      e !== null &&
      "name" in e &&
      (e as { name?: string }).name === "AbortError")
  );
}

export default function AdminMainPage() {
  const router = useRouter();
  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/authentication", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });

        if (!res.ok) {
          router.replace("/");
          return;
        }

        const data = (await res.json()) as AuthResponse;
        if (!data?.isLoggedIn || !data.user) {
          router.replace("/");
          return;
        }

        if (!isAdminRole(data.user.role)) {
          router.replace("/Factories/main");
          return;
        }

        // ✅ ผ่านทุกเงื่อนไข (เป็น Admin)
        if (alive) {
          setUser(data.user);
          if (data.user.change_pw === false) {
            setShowChangePwModal(true);
          }
        }
      } catch (e) {
        if (isAbortError(e)) {
          return;
        }

        router.replace("/");
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [router]);

  if (isLoading) return <div className="p-10">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-black">
      <ChangePasswordModal isOpen={showChangePwModal} userRole={user.role} />
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F3F6F4]">
        <Navbar
          title="หน้าแรกผู้ดูแลระบบ"
          fullName={user.fullName}
          userRole={user.role}
          establishment={user.establishment}
          username={user.username}
        />

        <main className="flex-1 overflow-auto p-8">
          <div className="bg-white p-6 text-gray-800 rounded-lg shadow">
            ยินดีต้อนรับ {user.fullName || user.username}
            <div className="mt-2 text-sm text-gray-600">
              บทบาท: <span className="font-semibold">{user.role}</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
