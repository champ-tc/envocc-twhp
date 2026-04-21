"use client";

import React from "react";

interface NavbarProps {
  title: string;
  fullName: string;
  userRole: string; // DOED | Factory | ...
}

export default function Navbar({
  title,
  fullName,
  userRole,
}: NavbarProps) {
  const displayName = fullName?.trim() || "-";

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          {/* ===== บรรทัดบน ===== */}
          <div className="font-bold text-gray-800">{displayName}</div>
        </div>

      </div>
    </header>
  );
}
