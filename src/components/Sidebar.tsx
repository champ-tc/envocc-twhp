"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ShieldCheck,
  Users,
  FileText,
  Activity,
  LogOut,
  Settings,
  BarChart,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
}

type IconType = React.ComponentType<{ size?: number }>;

export default function Sidebar({ userRole }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/");
    }
  };

  const MenuBtn = ({
    icon: Icon,
    label,
    path,
  }: {
    icon: IconType;
    label: string;
    path: string;
  }) => {
    const isActive = pathname === path; // หรือใช้ startsWith ตามข้อ 2
    return (
      <button
        onClick={() => router.push(path)}
        className={`w-full flex items-center p-3 rounded-xl transition-all ${isActive
          ? "bg-[#2E8B57]/10 text-[#2E8B57] font-bold"
          : "hover:bg-gray-50 text-gray-600"
          }`}
      >
        <Icon size={22} />
        <span className="ml-3">{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-64 bg-white text-gray-800 flex flex-col shadow-xl z-30 border-r border-gray-200 h-screen sticky top-0">
      <div className="h-24 flex flex-col items-center justify-center border-b border-gray-100 px-4 bg-[#2E8B57] text-white">
        <div className="flex items-center gap-2 font-bold text-xl">
          <ShieldCheck className="fill-current" /> TWHP
        </div>
        <span className="text-[10px] opacity-80 mt-1">
          ปลอดโรค ปลอดภัย กายใจเป็นสุข
        </span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2">
        {userRole === "Factory" && (
          <>
            <MenuBtn icon={Activity} label="หน้าแรก" path="/factories/main" />
            <MenuBtn
              icon={FileText}
              label="สมัครเข้าร่วมโครงการ"
              path="/factories/assess"
            />
            <MenuBtn
              icon={BarChart}
              label="สรุปผลการประเมิน"
              path="/factories/summary"
            />
          </>
        )}

        {["Provincial", "Evaluator", "ODPC"].includes(userRole) && (
          <>
            <MenuBtn
              icon={FileText}
              label="สปก. ที่สมัครโครงการ"
              path="/admins/assess"
            />
          </>
        )}

        {userRole === "DOED" && (
          <>
            <MenuBtn
              icon={FileText}
              label="อนุมัติสถานประกอบการ"
              path="/admins/factories"
            />
            <MenuBtn
              icon={FileText}
              label="สปก. ที่สมัครโครงการ"
              path="/admins/assess"
            />
            <p className="px-3 text-xs text-gray-400 uppercase">ผู้ดูแลระบบ</p>
            <MenuBtn icon={Users} label="จัดการสมาชิก" path="/admins/officer" />
            <MenuBtn icon={BarChart} label="ภาพรวม" path="/admins/dashboard" />
            <MenuBtn icon={Settings} label="ตั้งค่า" path="/admins/settings" />
          </>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center p-3 rounded-xl transition-all hover:bg-red-50 text-red-600"
        >
          <LogOut size={22} />
          <span className="ml-3">ออกจากระบบ</span>
        </button>
      </nav>
    </aside>
  );
}
