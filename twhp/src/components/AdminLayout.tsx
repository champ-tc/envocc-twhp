"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ChangePasswordModal from "./ChangePasswordModal";
import type { NormalizedUser } from "@/lib/auth-utils";
import { isAdminRole } from "@/lib/role-redirect";

interface AdminContextType {
  user: NormalizedUser | null;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  isLoading: true,
});

export const useAdminAuth = () => useContext(AdminContext);

export default function AdminLayout({
  children,
  title = "ผู้ดูแลระบบ",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePwModal, setShowChangePwModal] = useState(false);

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

        const data = await res.json();
        if (!data?.isLoggedIn || !data.user) {
          router.replace("/");
          return;
        }

        if (!isAdminRole(data.user.role)) {
          router.replace("/factories/main");
          return;
        }

        if (alive) {
          setUser(data.user);
          if (data.user.change_pw === false) {
            setShowChangePwModal(true);
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AdminContext.Provider value={{ user, isLoading }}>
      <div className="flex h-screen bg-gray-100 font-sans text-black">
        <ChangePasswordModal isOpen={showChangePwModal} userRole={user.role} />
        <Sidebar userRole={user.role} />

        <div className="flex-1 flex flex-col overflow-hidden bg-page-soft">
          <Navbar
            title={title}
            fullName={user.fullName}
            userRole={user.role}
          />

          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
