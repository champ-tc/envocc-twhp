"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFactoryAuth } from "@/components/FactoryLayout";
import QuestionForm from './QuestionForm';
import type { NormalizedUser } from "@/lib/auth-utils";

interface ApiQuestion {
    id: number;
    category: string;
    questionText: string;
    standard: any;
    choice1: string;
    choice2: string;
    choice3?: string;
    choiceNA?: string | null;
    special?: string;
}

interface Question {
    "0": string;
    "1": string;
    "2": string;
    "3": string;
    type: string;
    no: string;
    id: string; // Real backend ID
    question: string;
    "N/A": string;
    special?: string;
    isHidden?: boolean;
    standardCount?: number;
}

interface QuestionPageClientProps {
    // queries will be fetched locally
}

type AuthResponse = {
    isLoggedIn: boolean;
    user: NormalizedUser;
};

const SPECIAL_QUESTIONS = ["14", "21", "32", "37"];

export default function QuestionPageClient({ }: QuestionPageClientProps) {
    const { user, isLoading } = useFactoryAuth();
    const [isFetchingData, setIsFetchingData] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [fetchedData, setFetchedData] = useState<{ answers: Record<string, number>, files: Record<string, Record<number, { name: string, path: string }[]>> }>({ answers: {}, files: {} });
    const [showInstructions, setShowInstructions] = useState(true);

    const hasFetched = useRef(false);

    const fetchAnswers = useCallback(async () => {
        try {
            const aRes = await fetch("/api/factories/assessments/answers", { credentials: "include" });
            if (aRes.ok) {
                const answersData = await aRes.json();
                console.log("Answers Data:", answersData);
                const ansMap: Record<string, number> = {};
                const filesMap: Record<string, Record<number, { name: string, path: string }[]>> = {};
                const standardPassedIds: Record<string, number> = {}; // { qId: count }

                if (Array.isArray(answersData)) {
                    answersData.forEach((a: any) => {
                        const qId = a.questionId !== undefined ? a.questionId.toString() : "";
                        if (qId) {
                            const val = a.selectedChoice !== undefined ? a.selectedChoice : a.score;
                            if (val === "n/a") {
                                ansMap[qId] = -1;
                            } else {
                                ansMap[qId] = Number(val);
                            }

                            // Check for standard-passed data in the answer
                            if (Array.isArray(a.standard) && a.standard.length > 0) {
                                standardPassedIds[qId] = a.standard.length;
                            }

                            const qFiles: Record<number, { name: string, path: string }[]> = {};
                            
                            // Process standard files if present
                            if (Array.isArray(a.standard)) {
                                a.standard.forEach((s: any) => {
                                    if (s && typeof s === 'object' && s.fileUrl) {
                                        const targetLevel = SPECIAL_QUESTIONS.includes(qId) ? 0 : 3; // Standard usually counts as top level (3)
                                        if (!qFiles[targetLevel]) qFiles[targetLevel] = [];
                                        const fileName = s.fileName || s.fileUrl.split("/").pop() || "มาตรฐานเทียบเคียง";
                                        qFiles[targetLevel].push({ name: fileName, path: s.fileUrl });
                                    }
                                });
                            }

                            Object.entries(a).forEach(([key, value]) => {
                                if (key.startsWith("fileUrl") && value && typeof value === "string") {
                                    const sub = key.replace("fileUrl", "");
                                    const parts = sub.split("_");
                                    if (parts.length >= 1) {
                                        const levelString = parts[0];
                                        const level = parseInt(levelString);
                                        if (!isNaN(level)) {
                                            const targetLevel = SPECIAL_QUESTIONS.includes(qId) ? 0 : level;
                                            if (!qFiles[targetLevel]) qFiles[targetLevel] = [];
                                            const fileName = value.split("/").pop() || "เอกสารแนบ";
                                            qFiles[targetLevel].push({ name: fileName, path: value });
                                        }
                                    }
                                }
                            });
                            if (Object.keys(qFiles).length > 0) {
                                filesMap[qId] = qFiles;
                            }
                        }
                    });
                }
                setFetchedData({ answers: ansMap, files: filesMap });

                // Update questions state to reflect isHidden based on answer data
                if (Object.keys(standardPassedIds).length > 0) {
                    setQuestions(prev => prev.map(q => {
                        if (standardPassedIds[q.id] !== undefined) {
                            return { 
                                ...q, 
                                isHidden: true, 
                                standardCount: standardPassedIds[q.id] 
                            };
                        }
                        return q;
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch initial answers:", e);
        }
    }, []);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;

        const fetchData = async () => {
            try {
                // 1. Fetch Enrollment to see which standards are active
                const enrollRes = await fetch("/api/factories/enrolls", { credentials: "include", cache: "no-store" });
                let activeStandards: Set<string> = new Set();
                let enrollFiles: Record<string, string> = {}; // { standardKey: fileUrl }

                const possibleStandards = [
                    "standardHc", "standardSan", "standardSanPlus", "standardWellness", 
                    "standardSafety", "standardTis18001", "standardIso45001", "standardIso14001", 
                    "standardZero", "standard5S", "standardHas"
                ];

                if (enrollRes.ok) {
                    const enrollData = await enrollRes.json();
                    let enroll = enrollData?.enroll || (Array.isArray(enrollData) ? enrollData[0] : enrollData);
                    if (enroll && typeof enroll === 'object') {
                        const v = (c: string, s: string) => enroll[c] ?? enroll[s];
                        
                        possibleStandards.forEach(s => {
                            const snake = s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
                            const val = v(s, snake);
                            if (!!val) {
                                activeStandards.add(s);
                                // Also add short version (e.g., standardHc -> Hc)
                                activeStandards.add(s.replace(/^standard/, ""));
                                // Also add lowercase version
                                activeStandards.add(s.toLowerCase());
                                activeStandards.add(s.replace(/^standard/, "").toLowerCase());

                                // Capture file URL
                                const fileKey = `${s}Url`;
                                const fileSnake = `file_${s.replace(/^standard/, "").replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`).replace(/^_/, "")}_url`;
                                // Special case for fileStandardTis18001Url etc based on user's example
                                const fileKeyExact = `file${s.charAt(0).toUpperCase()}${s.slice(1)}Url`;
                                
                                const fileurl = v(fileKeyExact, fileSnake) || v(fileKey, "");
                                if (fileurl) {
                                    enrollFiles[s] = fileurl;
                                }
                            }
                        });
                    }
                }

                // 2. Fetch Questions
                const qRes = await fetch("/api/factories/assessments/questions", { credentials: "include" });
                const apiQuestions = (await qRes.json()) as ApiQuestion[];
                console.log("Questions API Response:", apiQuestions); // For debugging standard keys

                // Transform API questions to UI format
                const transformed: Question[] = (Array.isArray(apiQuestions) ? apiQuestions : [])
                    .map((q, index) => {
                        const noStr = q.id === -2147483648 ? (index + 1).toString() : q.id.toString();

                        // Check if any of this question's standards are active in enrollment
                        let enrollHidden = false;
                        let matchedStandardKey = "";
                        if (Array.isArray(q.standard)) {
                            q.standard.forEach((s: any) => {
                                const sStr = String(s);
                                if (activeStandards.has(sStr) || activeStandards.has(sStr.toLowerCase())) {
                                    enrollHidden = true;
                                    matchedStandardKey = sStr;
                                }
                            });
                        }

                        let starVal = "";
                        const s = q.standard;
                        const sp = q.special;

                        const getStars = (v: any): string => {
                            if (v === 1 || v === "1" || v === "*") return "*";
                            if (v === 2 || v === "2" || v === "**") return "**";
                            if (v === 3 || v === "3" || v === "***") return "***";
                            if (Array.isArray(v)) {
                                if (v.includes(1) || v.includes("1") || v.includes("*")) return "*";
                                if (v.includes(2) || v.includes("2") || v.includes("**")) return "**";
                                if (v.includes(3) || v.includes("3") || v.includes("***")) return "***";
                            }
                            return "";
                        };

                        starVal = getStars(s) || getStars(sp);

                        return {
                            "0": "ไม่มีการดำเนินการ",
                            "1": q.choice1,
                            "2": q.choice2,
                            "3": q.choice3 || "-",
                            type: q.category,
                            no: noStr,
                            id: noStr,
                            originalId: q.id,
                            question: q.questionText,
                            "N/A": q.choiceNA || "-",
                            special: starVal,
                            isHidden: enrollHidden,
                            standardCount: enrollHidden ? 1 : 0
                        };
                    });
                setQuestions(transformed);

                // 3. Fetch Answers
                await fetchAnswers();
            } catch (err) {
                console.error("Fetch Data Error:", err);
            } finally {
                setIsFetchingData(false);
            }
        };

        fetchData();
    }, [user, fetchAnswers]);

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
        <div className="max-w-5xl mx-auto">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-800">แบบประเมินตนเอง</h1>
                <p className="text-slate-600 mt-2">กรุณาประเมินตามความเป็นจริง เพื่อการพัฒนาสถานประกอบการปลอดโรค ปลอดภัย กายใจเป็นสุข</p>
            </div>
            <div className="mb-2 flex justify-end">
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
                initialAnswers={fetchedData.answers}
                initialFiles={fetchedData.files}
                refreshAnswers={fetchAnswers}
            />
        </div>
    );
}
