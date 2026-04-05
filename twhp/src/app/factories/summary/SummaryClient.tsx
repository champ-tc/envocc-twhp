"use client";

import React, { useEffect, useState } from "react";
import { useFactoryAuth } from "@/components/FactoryLayout";
import { CheckCircle, AlertTriangle, AlertOctagon } from "lucide-react";
import type { NormalizedUser } from "@/lib/auth-utils";

interface Question {
    type: string;
    no: string;
    question: string;
    "N/A": string;
}

interface SummaryClientProps {
    questions: Question[];
}

type AuthResponse = { isLoggedIn: boolean; user: NormalizedUser };

export default function SummaryClient({ questions }: SummaryClientProps) {
    const { user, isLoading } = useFactoryAuth();
    const [answers, setAnswers] = useState<Record<string, number>>({});

    // Load Data
    // Load Data
    useEffect(() => {
        const savedAnswers = localStorage.getItem('twhp_answers');
        if (savedAnswers) {
            try {
                setAnswers(JSON.parse(savedAnswers));
            } catch (e) {
                console.error("Failed to parse answers", e);
            }
        } else {
            // MOCKUP MODE: Generate 100% score for demo
            const mockAnswers: Record<string, number> = {};
            questions.forEach(q => {
                mockAnswers[q.no] = 3; // Force full score (100%)
            });
            setAnswers(mockAnswers);
        }
    }, []);

    if (isLoading) return <div className="p-10 text-center">Loading...</div>;
    if (!user) return null;

    // --- Calculation Logic ---

    // Group questions by category (Hardcoded based on JSON type or mapped)
    // Mapping based on "type" string in JSON
    const categories = [
        { id: '1', name: 'หมวดที่ 1 การสนับสนุนขององค์กรฯ', key: 'หมวด 1' },
        { id: '2', name: 'หมวดที่ 2 ปลอดโรค', key: 'หมวดที่ 2' },
        { id: '3', name: 'หมวดที่ 3 ปลอดภัย', key: 'หมวดที่ 3' },
        { id: '4', name: 'หมวดที่ 4 กายใจเป็นสุข', key: 'หมวดที่ 4' },
        { id: '5', name: 'การวัดผลลัพธ์การดำเนินงาน', key: 'การวัดผลลัพธ์' },
    ];

    const calculateCategory = (categoryKeyPart: string) => {
        // Find questions belonging to this category
        const categoryQuestions = questions.filter(q => q.type.includes(categoryKeyPart));

        let totalItems = 0;
        let fullScore = 0;
        let obtainedScore = 0;

        categoryQuestions.forEach(q => {
            const score = answers[q.no];
            // Logic:
            // If score is undefined (not answered) -> Treat as 0? Or skip? Assuming verified = answered.
            // If score is -1 (N/A) -> Exclude from Total Items & Full Score.

            if (score === -1) {
                // N/A: Do nothing
                return;
            }

            totalItems++;
            fullScore += 3; // Max score per question is 3
            obtainedScore += (score || 0);
        });

        const percentage = fullScore > 0 ? (obtainedScore / fullScore) * 100 : 0;

        return {
            totalItems,
            fullScore,
            obtainedScore,
            percentage
        };
    };

    const results = categories.map(cat => ({
        ...cat,
        stats: calculateCategory(cat.key)
    }));

    // Overall Calculation
    const overallFullScore = results.reduce((acc, curr) => acc + curr.stats.fullScore, 0);
    const overallObtained = results.reduce((acc, curr) => acc + curr.stats.obtainedScore, 0);
    const overallPercentage = overallFullScore > 0 ? (overallObtained / overallFullScore) * 100 : 0;

    // Evaluation Logic
    const getRating = (percentage: number) => {
        if (percentage >= 80) return { label: 'ผ่านเกณฑ์ระดับทอง', color: 'text-green-600', icon: CheckCircle };
        if (percentage >= 60) return { label: 'ผ่านเกณฑ์ระดับเงิน', color: 'text-yellow-600', icon: CheckCircle };
        return { label: 'ไม่ผ่านเกณฑ์', color: 'text-red-500', icon: AlertOctagon };
    };

    const getRowResult = (percentage: number) => {
        if (percentage >= 80) return "≥ 80% (ทอง)";
        if (percentage >= 60) return "> 60% (เงิน)";
        return "< 60% (ปรับปรุง)";
    };

    const overallRating = (() => {
        // Logic from Table: 
        // Silver: 80-89%
        // Gold: >= 90% AND Condition *, **
        // For simplified summary, we follow the percentage row first.

        if (overallPercentage >= 90) return { label: 'ระดับโล่ทอง', color: 'text-green-600 bg-green-50 border-green-200' };
        if (overallPercentage >= 80) return { label: 'ระดับโล่เงิน', color: 'text-slate-600 bg-slate-50 border-slate-200' };
        return { label: 'ไม่ผ่านเกณฑ์การรับรอง', color: 'text-red-600 bg-red-50 border-red-200' };
    })();

    if (isLoading) return <div className="p-10 text-center">Loading...</div>;
    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                สรุปผลการประเมินตนเองตามเกณฑ์สถานประกอบการปลอดโรค ปลอดภัย กายใจเป็นสุข
            </h1>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-orange-50 text-slate-800">
                                        <th className="p-4 border border-orange-200 text-left">หมวด</th>
                                        <th className="p-4 border border-orange-200 text-center">จำนวนข้อ<br />(ที่นำมาคิด)</th>
                                        <th className="p-4 border border-orange-200 text-center">คะแนนเต็ม</th>
                                        <th className="p-4 border border-orange-200 text-center">คะแนนที่ได้</th>
                                        <th className="p-4 border border-orange-200 text-center">ร้อยละ</th>
                                        <th className="p-4 border border-orange-200 text-center">ผลการประเมินเบื้องต้น</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((item, index) => {
                                        const isPassed = item.stats.percentage >= 60;
                                        return (
                                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 border border-slate-200 font-medium text-slate-700">{item.name}</td>
                                                <td className="p-4 border border-slate-200 text-center text-black">{item.stats.totalItems}</td>
                                                <td className="p-4 border border-slate-200 text-center text-black">{item.stats.fullScore}</td>
                                                <td className="p-4 border border-slate-200 text-center text-black font-bold">{item.stats.obtainedScore}</td>
                                                <td className="p-4 border border-slate-200 text-center text-black">{item.stats.percentage.toFixed(2)}%</td>
                                                <td className="p-4 border border-slate-200 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {getRowResult(item.stats.percentage)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Summary Row */}
                                    <tr className="bg-blue-50 font-bold text-slate-800">
                                        <td className="p-4 border border-blue-200 text-center">รวม</td>
                                        <td className="p-4 border border-blue-200 text-center">
                                            {results.reduce((a, b) => a + b.stats.totalItems, 0)}
                                        </td>
                                        <td className="p-4 border border-blue-200 text-center">{overallFullScore}</td>
                                        <td className="p-4 border border-blue-200 text-center text-blue-700 font-black">{overallObtained}</td>
                                        <td className="p-4 border border-blue-200 text-center text-black font-bold">{overallPercentage.toFixed(2)}%</td>
                                        <td className="p-4 border border-blue-200"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Overall Result Card */}
                        <div className={`mt-8 p-8 rounded-2xl border-2 text-center space-y-4 ${overallRating.color}`}>
                            <h2 className="text-xl font-semibold">สรุปผลการประเมินตนเองในภาพรวม</h2>
                            {/* <div className="text-4xl font-extrabold tracking-tight">
                                {overallRating.label}
                            </div> */}
                            <p className="opacity-80">
                                (คะแนน% {overallPercentage.toFixed(2)}%)
                            </p>
                            <div className="text-sm mt-4 p-4 bg-white/50 rounded-xl inline-block text-left text-slate-600">
                                <p><strong>หมายเหตุ:</strong></p>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                    <li>{"< 60%"} : ใบประกาศเกียรติคุณเข้าร่วมโครงการ</li>
                                    <li>60 - 79% : ใบประกาศเกียรติคุณระดับจังหวัด</li>
                                    <li>80 - 89% : รางวัลเชิดชูเกียรติและประกาศนียบัตระดับประเทศ ประเภท โล่เงิน</li>
                                    <li>{"≥ 90%"} : รางวัลเชิดชูเกียรติและประกาศนียบัตรระดับประเทศ ประเภท โล่ทอง หรือ โล่ทองต่อเนื่อง</li>
                                </ul>
                            </div>
                        </div>
        </div>
    );
}
