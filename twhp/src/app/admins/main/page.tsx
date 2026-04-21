"use client";

import React from "react";
import { useAdminAuth } from "@/components/AdminLayout";

export default function AdminMainPage() {
  const { user, isLoading } = useAdminAuth();

  if (isLoading) return null; // Handled by Layout
  if (!user) return null;

  return (
    <div className="bg-white p-6 text-gray-800 rounded-lg shadow">
      ยินดีต้อนรับ {user.fullName}
      <div className="mt-2 text-sm text-gray-600">
        บทบาท: <span className="font-semibold">{user.role}</span>
      </div>
    </div>
  );
}
