"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedUser } from "@/lib/auth-utils";
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import QuestionForm from './QuestionForm';

interface ApiQuestion {
    id: number;
    category: string;
    questionText: string;
    standard: string;
    choice1: string;
    choice2: string;
    choice3?: string;
    choiceNA?: string | null;
}

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
    // queries will be fetched locally
}

type AuthResponse = {
    isLoggedIn: boolean;
    user: NormalizedUser;
};

export default function QuestionPageClient({ }: QuestionPageClientProps) {
    const router = useRouter();
    const [user, setUser] = useState<NormalizedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingData, setIsFetchingData] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [initialAnswers, setInitialAnswers] = useState<Record<string, number>>({});
    const [showInstructions, setShowInstructions] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/auth/authentication", { credentials: "include" });
                if (!res.ok) throw new Error(await res.text());
                const data = (await res.json()) as AuthResponse;
                
                if (!data?.isLoggedIn || !data.user) throw new Error("Unauthorized");
                if (data.user.role !== "Factory") {
                    router.push("/admins/dashboard");
                    return;
                }
                setUser(data.user);
            } catch (err) {
                console.error(err);
                router.push("/");
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // Fetch Questions
                const qRes = await fetch("/api/factories/assessments/questions", { credentials: "include" });
                const apiQuestions = (await qRes.json()) as ApiQuestion[];

                // Transform API questions to UI format
                const transformed: Question[] = apiQuestions.map(q => {
                    const noStr = q.id.toString();
                    
                    return {
                        "0": "ไม่มีการดำเนินการ",
                        "1": q.choice1,
                        "2": q.choice2,
                        "3": q.choice3 || "-",
                        type: q.category,
                        no: noStr,
                        question: q.questionText,
                        "N/A": q.choiceNA || "-"
                    };
                });
                setQuestions(transformed);

                // Fetch Existing Answers
                try {
                    const aRes = await fetch("/api/factories/assessments/answers", { credentials: "include" });
                    if (aRes.ok) {
                        const answersData = await aRes.json();
                        const ansMap: Record<string, number> = {};
                        if (Array.isArray(answersData)) {
                            answersData.forEach((a: any) => {
                                if (a.questionId !== undefined) {
                                    ansMap[a.questionId.toString()] = Number(a.score);
                                }
                            });
                        }
                        setInitialAnswers(ansMap);
                    }
                } catch (e) {
                    console.error("Failed to fetch initial answers:", e);
                }
            } catch (err) {
                // silenty handle or use a toast
            } finally {
                setIsFetchingData(false);
            }
        };

        fetchData();
    }, [user]);

    if (isLoading || (user && isFetchingData)) return <div className="p-10 text-center text-slate-500">Loading...</div>;
    if (!user) return null;

    // Group questions by type
    const groupedQuestions = questions.reduce((acc, question) => {
        if (!acc[question.type]) {
            acc[question.type] = [];
        }
        acc[question.type].push(question);
        return acc;
    }, {} as Record<string, Question[]>);

    // Sort categories (keys of groupedQuestions) by min question ID
    const sortedGroupedQuestions = Object.keys(groupedQuestions)
        .sort((a, b) => {
            const minA = Math.min(...groupedQuestions[a].map(q => parseInt(q.no) || 0));
            const minB = Math.min(...groupedQuestions[b].map(q => parseInt(q.no) || 0));
            return minA - minB;
        })
        .reduce((acc, key) => {
            // Sort questions within each category by numeric ID
            acc[key] = groupedQuestions[key].sort((q1, q2) => {
                const n1 = parseInt(q1.no) || 0;
                const n2 = parseInt(q2.no) || 0;
                return n1 - n2;
            });
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

                        <QuestionForm 
                            groupedQuestions={sortedGroupedQuestions} 
                            initialAnswers={initialAnswers}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
