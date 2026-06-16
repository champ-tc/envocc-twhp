"use client";

import React, { useEffect, useState } from "react";
import { useFactoryAuth } from "../../../components/FactoryLayout";
import { AlertOctagon, Loader2 } from "lucide-react";

type SummaryScoreKey = "collaborate" | "disease" | "safety" | "mental" | "outcome";

type SummaryScoreStat = {
    scoredCount: number;
    maxScore: number;
    achievedScore: number;
    percentage: number;
};

type SummaryScoring = Record<SummaryScoreKey | "total", SummaryScoreStat>;

type SummaryData = {
    coverStatus: string;
    rows: Array<{
        id: string;
        name: string;
        totalItems: number;
        fullScore: number;
        obtainedScore: number;
        percentage: number;
    }>;
    totalItems: number;
    overallFullScore: number;
    overallObtained: number;
    overallPercentage: number;
};

const CATEGORIES: Array<{
    id: string;
    name: string;
    scoreKey: SummaryScoreKey;
}> = [
        { id: "1", name: "หมวดที่ 1 การสนับสนุนขององค์กรฯ", scoreKey: "collaborate" },
        { id: "2", name: "หมวดที่ 2 ปลอดโรค", scoreKey: "disease" },
        { id: "3", name: "หมวดที่ 3 ปลอดภัย", scoreKey: "safety" },
        { id: "4", name: "หมวดที่ 4 กายใจเป็นสุข", scoreKey: "mental" },
        { id: "5", name: "การวัดผลลัพธ์การดำเนินงาน", scoreKey: "outcome" },
    ];

const SCORE_KEYS: Array<SummaryScoreKey | "total"> = ["total", "collaborate", "disease", "safety", "mental", "outcome"];

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";

const isSummaryScoreStat = (value: unknown): value is SummaryScoreStat => {
    if (!isRecord(value)) return false;

    return (
        typeof value.scoredCount === "number" &&
        typeof value.maxScore === "number" &&
        typeof value.achievedScore === "number" &&
        typeof value.percentage === "number"
    );
};

const getScoringResponse = (value: unknown): SummaryScoring | null => {
    const payload = isRecord(value) && isRecord(value.data) ? value.data : value;
    if (!isRecord(payload) || !isRecord(payload.scoring)) return null;

    const scoring = payload.scoring;
    if (!SCORE_KEYS.every((key) => isSummaryScoreStat(scoring[key]))) return null;

    return scoring as SummaryScoring;
};

const getCoverStatus = (value: unknown) => {
    const payload = isRecord(value) && isRecord(value.data) ? value.data : value;
    if (!isRecord(payload) || typeof payload.coverStatus !== "string") return "";
    return payload.coverStatus;
};

const toSummaryData = (scoring: SummaryScoring, coverStatus: string): SummaryData => {
    const rows = CATEGORIES.map(({ id, name, scoreKey }) => {
        const score = scoring[scoreKey];

        return {
            id,
            name,
            totalItems: score.scoredCount,
            fullScore: score.maxScore,
            obtainedScore: score.achievedScore,
            percentage: score.percentage,
        };
    });

    return {
        coverStatus,
        rows,
        totalItems: rows.reduce((sum, row) => sum + row.totalItems, 0),
        overallFullScore: scoring.total.maxScore,
        overallObtained: scoring.total.achievedScore,
        overallPercentage: scoring.total.percentage,
    };
};

const getErrorMessage = (value: unknown) => {
    if (isRecord(value) && typeof value.message === "string") return value.message;
    return "ไม่สามารถดึงข้อมูลคะแนนได้";
};

export default function SummaryPage() {
    const { user, isLoading: isAuthLoading } = useFactoryAuth();
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await fetch("/api/factories/summary");
                const data: unknown = await res.json();
                if (res.ok) {
                    const scoring = getScoringResponse(data);
                    if (!scoring) {
                        setError("รูปแบบข้อมูลคะแนนจากระบบไม่ถูกต้อง");
                        return;
                    }

                    setSummaryData(toSummaryData(scoring, getCoverStatus(data)));
                } else {
                    setError(getErrorMessage(data));
                }
            } catch {
                setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchSummary();
        }
    }, [user]);

    if (isAuthLoading || (user && isLoading)) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-brand" />
                <p className="text-slate-500 font-medium text-lg">กำลังประมวลผลคะแนน...</p>
            </div>
        );
    }

    if (!user) return null;

    if (error) {
        return (
            <div className="max-w-4xl mx-auto bg-red-50 border border-red-100 rounded-3xl p-10 text-center space-y-4">
                <AlertOctagon className="w-16 h-16 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold text-red-800">เกิดข้อผิดพลาด</h2>
                <p className="text-red-600">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 text-white px-6 py-2 rounded-xl hover:bg-red-700 transition shadow-lg"
                >
                    ลองใหม่อีกครั้ง
                </button>
            </div>
        );
    }

    if (!summaryData) return null;

    const { coverStatus, rows, totalItems, overallFullScore, overallObtained, overallPercentage } = summaryData;
    const isInReview = coverStatus === "in_review";

    const getRowResult = (percentage: number) => {
        if (percentage >= 80) return ">= 80% (ทอง)";
        if (percentage >= 60) return "> 60% (เงิน)";
        return "< 60% (ปรับปรุง)";
    };

    const overallRating = (() => {
        if (overallPercentage >= 90) return { color: "text-green-600 bg-green-50 border-green-200" };
        if (overallPercentage >= 80) return { color: "text-slate-600 bg-slate-50 border-slate-200" };
        return { color: "text-red-600 bg-red-50 border-red-200" };
    })();

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
                <div className="bg-brand px-6 py-7 sm:px-8 text-white">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-xl sm:text-2xl font-bold leading-relaxed">
                            สรุปผลการประเมินตนเองตามเกณฑ์สถานประกอบการปลอดโรค ปลอดภัย กายใจเป็นสุข
                        </h1>
                    </div>
                </div>

                <div className="p-5 sm:p-8 space-y-6">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-orange-50 text-slate-800">
                                        <th className="p-4 border-b border-orange-100 text-left min-w-summary-title">หมวด</th>
                                        <th className="p-4 border-b border-orange-100 text-center min-w-summary-medium">จำนวนข้อ<br />(ที่นำมาคิด)</th>
                                        <th className="p-4 border-b border-orange-100 text-center min-w-label">คะแนนเต็ม</th>
                                        <th className="p-4 border-b border-orange-100 text-center min-w-summary-medium">คะแนนที่ได้</th>
                                        <th className="p-4 border-b border-orange-100 text-center min-w-label">ร้อยละ</th>
                                        <th className="p-4 border-b border-orange-100 text-center min-w-summary-result">ผลการประเมินเบื้องต้น</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((item) => {
                                        const isPassed = item.percentage >= 60;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 border-b border-slate-100 font-semibold text-slate-700">{item.name}</td>
                                                <td className="p-4 border-b border-slate-100 text-center text-slate-900">{item.totalItems}</td>
                                                <td className="p-4 border-b border-slate-100 text-center text-slate-900">{item.fullScore}</td>
                                                <td className="p-4 border-b border-slate-100 text-center text-slate-900 font-bold">{item.obtainedScore}</td>
                                                <td className="p-4 border-b border-slate-100 text-center text-slate-900 font-semibold">{item.percentage.toFixed(2)}%</td>
                                                <td className="p-4 border-b border-slate-100 text-center">
                                                    <span className={`inline-flex min-w-24 justify-center px-3 py-1.5 rounded-full text-xs font-bold ${isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                        {isInReview ? "-" : getRowResult(item.percentage)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-blue-50 font-bold text-slate-800">
                                        <td className="p-4 text-center">รวม</td>
                                        <td className="p-4 text-center">{totalItems}</td>
                                        <td className="p-4 text-center">{overallFullScore}</td>
                                        <td className="p-4 text-center text-blue-700 font-black">{overallObtained}</td>
                                        <td className="p-4 text-center text-slate-900 font-black">{overallPercentage.toFixed(2)}%</td>
                                        <td className="p-4"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={`rounded-2xl border-2 p-6 sm:p-8 text-center space-y-4 ${overallRating.color}`}>
                        <h2 className="text-xl font-semibold">สรุปผลการประเมินตนเองในภาพรวม</h2>
                        <p className="opacity-80">
                            (คะแนนรวมร้อยละ {overallPercentage.toFixed(2)}%)
                        </p>
                        <div className="text-sm mt-4 p-4 bg-white/60 rounded-2xl inline-block text-left text-slate-600 border border-white">
                            <p><strong>หมายเหตุ:</strong></p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>{"< 60%"} : ใบประกาศเกียรติคุณเข้าร่วมโครงการ</li>
                                <li>60 - 79% : ใบประกาศเกียรติคุณระดับจังหวัด</li>
                                <li>80 - 89% : รางวัลเชิดชูเกียรติและประกาศนียบัตระดับประเทศ ประเภท โล่เงิน</li>
                                <li>{">= 90%"} : รางวัลเชิดชูเกียรติและประกาศนียบัตรระดับประเทศ ประเภท โล่ทอง หรือ โล่ทองต่อเนื่อง</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
