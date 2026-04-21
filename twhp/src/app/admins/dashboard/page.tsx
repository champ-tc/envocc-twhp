"use client";

import React from "react";
import { useAdminAuth } from "@/components/AdminLayout";

export default function AdminDashboardPage() {
  const { user, isLoading } = useAdminAuth();

  if (isLoading || !user) return null;

  return (
    <div className="bg-white p-6 text-gray-800 rounded-lg shadow">
      ยินดีต้อนรับ {user.fullName}
    </div>
  );
}
