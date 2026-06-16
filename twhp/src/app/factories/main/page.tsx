"use client";

import React from "react";
import { useFactoryAuth } from "@/components/FactoryLayout";

export default function UserMainPage() {
  const { user, isLoading } = useFactoryAuth();

  if (isLoading || !user) return null;

  return (
    <div className="bg-brand p-8 rounded-3xl text-white">
      สวัสดี {user.fullName}
      <br />
      ท่านได้สมัครสมาชิกเรียบร้อยแล้ว
    </div>
  );
}
