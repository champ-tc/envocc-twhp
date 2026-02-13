"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import AdminAssessmentForm from "@/components/AdminAssessmentForm";
import type { AssessmentFactory } from "@/utils/admin-assess-data";

interface Question {
    type: string;
    no: string;
    question: string;
    "0": string;
    "1": string;
    "2": string;
    "3": string;
    "N/A": string;
}

interface AdminAssessDetailClientProps {
    factory: AssessmentFactory | undefined; // Allow undefined
    questions: Question[];
    factoryId: string;
}

type AuthUser = {
    id: number;
    role: string;
    username: string;
    fullName: string;
    establishment: string;
    level?: string;
};

type AuthResponse = { isLoggedIn: boolean; user: AuthUser };


export default function AdminAssessDetailClient({ factory, questions, factoryId }: AdminAssessDetailClientProps) {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const r = await fetch("/api/auth/authentication", {
                    credentials: "include",
                    cache: "no-store",
                });

                if (!r.ok) throw new Error(await r.text());
                const d = (await r.json()) as AuthResponse;

                if (!d?.isLoggedIn || !d.user) throw new Error("Unauthorized");

                if (alive) setUser(d.user);
            } catch {
                router.replace("/");
            } finally {
                if (alive) setIsLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [router]);

    if (isLoading) return <div className="p-10 text-black">Loading...</div>;
    if (!user) return null;

    if (!factory) {
        return (
            <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
                <Sidebar userRole={user.role} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                        title="ระบบประเมินสถานประกอบการปลอดโรค ปลอดภัย กายใจเป็นสุข"
                        fullName={user.fullName}
                        userRole={user.role}
                        establishment={user.establishment}
                        username={user.username}
                    />

                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-slate-800">ไม่พบข้อมูลสถานประกอบการ</h1>
                            <p className="text-slate-500">ID: {factoryId}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar userRole={user.role} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar
                    title="ประเมินสถานประกอบการ"
                    fullName={user.fullName}
                    userRole={user.role}
                    establishment={user.establishment}
                    username={user.username}
                />

                <main className="flex-1 overflow-auto">
                    <AdminAssessmentForm questions={questions} factory={factory} user={user} />
                </main>
            </div>
        </div>
    );
}
