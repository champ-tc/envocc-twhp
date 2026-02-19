"use client";

import React from "react";

interface NavbarProps {
  title: string;
  fullName: string;
  userRole: string; // DOED | Factory | ...
  establishment: string;
  username?: string;
}

export default function Navbar({
  title,
  fullName,
  userRole,
  establishment,
  username,
}: NavbarProps) {
  const displayName = fullName?.trim() || username || "-";
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          {/* ===== บรรทัดบน ===== */}
          <div className="font-bold text-gray-800">{displayName}</div>

          {/* ===== บรรทัดล่าง (แสดงเฉพาะ DOED / เจ้าหน้าที่) ===== */}
          {userRole !== "Factory" && (
            <div className="text-xs text-[#2E8B57] uppercase">
              {establishment}
            </div>
          )}
        </div>

        <div className="w-10 h-10 rounded-full bg-[#2E8B57] flex items-center justify-center text-white font-bold shadow-md uppercase">
          {avatarChar}
        </div>
      </div>
    </header>
  );
}
