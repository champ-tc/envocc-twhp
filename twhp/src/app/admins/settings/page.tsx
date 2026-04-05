"use client";

import React from "react";
import { useAdminAuth } from "@/components/AdminLayout";

export default function AdminSettingsPage() {
  const { user, isLoading } = useAdminAuth();

  if (isLoading || !user) return null;

  return (
    <div className="bg-white p-6 text-gray-800 rounded-lg shadow">
      หน้าตั้งค่า (Coming Soon)
      <div className="mt-2 text-sm text-gray-600">
        ยินดีต้อนรับ {user.fullName || user.username}
      </div>
    </div>
  );
}
