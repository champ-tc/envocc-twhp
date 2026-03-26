"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedUser } from "@/lib/auth-utils";
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import QuestionForm from './QuestionForm';

interface Question {
    "0": string;
    "1": string;
    "2": string;
    "3": string;
    type: string;
    no: string;
    question: string;
    "N/A": string;
}

interface QuestionPageClientProps {
    questions: Question[];
}

type AuthResponse = {
    isLoggedIn: boolean;
    user: NormalizedUser;
};

export default function QuestionPageClient({ questions }: QuestionPageClientProps) {
    const router = useRouter();
    const [user, setUser] = useState<NormalizedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showInstructions, setShowInstructions] = useState(true);

    useEffect(() => {
        fetch("/api/auth/authentication", { credentials: "include" })
            .then(async (res) => {
                if (!res.ok) throw new Error(await res.text());
                return (await res.json()) as AuthResponse;
            })
            .then((data) => {
                if (!data?.isLoggedIn || !data.user) throw new Error("Unauthorized");

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

    if (isLoading) return <div className="p-10 text-center text-slate-500">Loading...</div>;
    if (!user) return null;

    // Group questions by type
    const groupedQuestions = questions.reduce((acc, question) => {
        if (!acc[question.type]) {
            acc[question.type] = [];
        }
        acc[question.type].push(question);
        return acc;
    }, {} as Record<string, Question[]>);

    return (
        <div className="flex bg-slate-50 min-h-screen font-sans">
            {/* Sidebar */}
            <Sidebar userRole={user.role} />

            <div className="flex-1 flex flex-col">
                {/* Navbar */}
                <Navbar
                    title="แบบประเมินสถานประกอบการ"
                    fullName={user.fullName || user.username}
                    userRole={user.role}
                    establishment={user.establishment || "-"}
                />

                {/* Content */}
                <main className="p-8 flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">แบบประเมินตนเอง</h1>
                            <p className="text-slate-600 mt-2">กรุณาประเมินตามความเป็นจริง เพื่อการพัฒนาสถานประกอบการปลอดโรค ปลอดภัย กายใจเป็นสุข</p>
                        </div>
                        <div className="mb-6 flex justify-end">
                            <button
                                onClick={() => setShowInstructions(true)}
                                className="text-blue-600 hover:text-blue-800 underline text-sm font-medium flex items-center gap-1"
                            >
                                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">?</span>
                                อ่านคำชี้แจงและเกณฑ์การประเมิน
                            </button>
                        </div>

                        {showInstructions && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                                        <h3 className="text-xl font-bold text-slate-800">คำชี้แจง</h3>
                                        <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto text-slate-600 space-y-4 text-sm leading-relaxed">
                                        <p><span className="font-bold text-slate-800">1. การพิจารณาเกณฑ์การประเมิน</span> 1 คะแนน หรือ 2 คะแนน หรือ 3 คะแนน ให้พิจารณาการดำเนินงานตามลำดับขั้นบันได ยกเว้นหัวข้อที่มีสัญลักษณ์ *** หากไม่มีการดำเนินงานให้ประเมิน 0 คะแนน และระบุ NA หากไม่เกี่ยวข้องกับข้อเกณฑ์นั้น</p>
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <p className="font-bold text-slate-800 mb-2">2. สัญลักษณ์ที่ปรากฎในเกณฑ์</p>
                                            <ul className="space-y-3">
                                                <li className="flex gap-3">
                                                    <span className="flex-none font-black text-blue-600">*</span>
                                                    <span>หมายถึง หัวข้อที่สถานประกอบการต้องดำเนินการให้ได้ในระดับ 3 คะแนน เท่านั้น จึงจะมีสิทธิ์ได้รับการพิจารณารับรองระดับโล่ทอง ประกอบด้วย เกณฑ์ข้อที่ 6, 9 และ 25</span>
                                                </li>
                                                <li className="flex gap-3">
                                                    <span className="flex-none font-black text-blue-600">**</span>
                                                    <span>หมายถึง หัวข้อที่สถานประกอบการต้องดำเนินการให้ได้ในระดับ 3 คะแนน เท่านั้น จึงจะมีสิทธิ์ได้รับการพิจารณารับรองระดับโล่ทองต่อเนื่อง ประกอบด้วย เกณฑ์ข้อที่ 7, 38, 39, 40 และ 41</span>
                                                </li>
                                                <li className="flex gap-3">
                                                    <span className="flex-none font-black text-blue-600">***</span>
                                                    <span>หมายถึง หัวข้อที่สถานประกอบการไม่จำเป็นต้องดำเนินการตามลำดับขั้นบันได ประกอบด้วย เกณฑ์ข้อที่ 14, 21, 32 และ 37</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                        <button
                                            onClick={() => setShowInstructions(false)}
                                            className="px-6 py-2 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors"
                                        >
                                            รับทราบ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <QuestionForm groupedQuestions={groupedQuestions} />
                    </div>
                </main>
            </div>
        </div>
    );
}
