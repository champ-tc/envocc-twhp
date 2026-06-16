"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import type { NormalizedUser } from "@/lib/auth-utils";

type AuthResponse = {
  isLoggedIn: boolean;
  user: NormalizedUser;
};

interface FactoryContextType {
  user: NormalizedUser | null;
  isLoading: boolean;
}

const FactoryContext = createContext<FactoryContextType>({
  user: null,
  isLoading: true,
});

export const useFactoryAuth = () => useContext(FactoryContext);

export default function FactoryLayout({ children }: { children: React.ReactNode }) {
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
        if (!data?.isLoggedIn || !data.user) {
          router.push("/");
          return;
        }

        // Check Role
        if (data.user.role !== "Factory") {
          router.push("/admins/dashboard");
          return;
        }

        setUser(data.user);
      })
      .catch(() => router.push("/"))
      .finally(() => setIsLoading(false));
  }, [router]);

  // Determine Navbar Title based on current path
  const [title, setTitle] = useState("Factory Dashboard");
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes("/factories/assess")) setTitle("สมัครเข้าร่วมโครงการ");
    else if (path.includes("/factories/question")) setTitle("แบบประเมินสถานประกอบการ");
    else if (path.includes("/factories/summary")) setTitle("สรุปผลการประเมิน");
    else setTitle("แดชบอร์ด");
  }, []);

  return (
    <FactoryContext.Provider value={{ user, isLoading }}>
      <div className="flex h-screen bg-gray-100 font-sans text-black">
        {user && <Sidebar userRole={user.role} />}
        
        <div className="flex-1 flex flex-col overflow-hidden bg-page-soft">
          {user && (
            <Navbar
              title={title}
              fullName={user.fullName}
              userRole={user.role}
            />
          )}

          <main className="flex-1 overflow-auto p-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              user && children
            )}
          </main>
        </div>
      </div>
    </FactoryContext.Provider>
  );
}
