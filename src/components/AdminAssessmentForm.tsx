"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Save, CheckCircle, Trophy, ScrollText, Building2 } from 'lucide-react';
import type { AssessmentFactory } from '@/utils/admin-assess-data';

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

interface AdminAssessmentFormProps {
    questions: Question[];
    factory: AssessmentFactory;
}

// Group Questions by Type (Category)
const groupQuestions = (questions: Question[]) => {
    const grouped: Record<string, Question[]> = {};
    questions.forEach((q) => {
        if (!grouped[q.type]) grouped[q.type] = [];
        grouped[q.type].push(q);
    });
    return grouped;
};

// Define Department Permissions
const DEPT_PERMISSIONS = {
    HEALTH_CENTER: ["18", "19", "20", "27", "28", "29", "30"],
    MENTAL_HEALTH: ["31", "32", "33", "34", "35", "36", "37"],
};

type AuthUser = {
    id: number;
    role: string;
    username: string;
    fullName: string;
    establishment: string;
    level?: string; // Added level
};

interface AdminAssessmentFormProps {
    questions: Question[];
    factory: AssessmentFactory;
    user: AuthUser;
}

export default function AdminAssessmentForm({ questions, factory, user }: AdminAssessmentFormProps) {
    const router = useRouter();
    const grouped = useMemo(() => groupQuestions(questions), [questions]);

    // Mock State: User Self Assessment (Randomize for demo)
    const [userAnswers] = useState(() => {
        const answers: Record<string, number> = {};
        questions.forEach(q => {
            answers[q.no] = Math.floor(Math.random() * 3) + 1; // Random 1-3
        });
        return answers;
    });

    // State: Admin Scores
    const [adminScores, setAdminScores] = useState<Record<string, { health?: number; mental?: number; ddc?: number }>>(() => {
        const initial: Record<string, { health?: number; mental?: number; ddc?: number }> = {};
        questions.forEach(q => {
            initial[q.no] = {
                health: undefined,
                mental: undefined,
                ddc: userAnswers[q.no] // Default DDC to user answer
            };
        });
        return initial;
    });

    const [comments, setComments] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const handleScoreChange = (qNo: string, dept: 'health' | 'mental' | 'ddc', value: string) => {
        const score = value === '' ? undefined : Number(value);
        setAdminScores(prev => ({
            ...prev,
            [qNo]: {
                ...prev[qNo],
                [dept]: score
            }
        }));
    };

    // Modified Permission Logic based on User Role/Establishment
    const isAccessAllowed = (qNo: string, dept: 'health' | 'mental' | 'ddc') => {
        const role = user.role;
        const level = user.level?.toUpperCase(); // Ensure consistency
        const no = parseInt(qNo);

        if (dept === 'ddc') {
            // ODPC (Level or Role) OR DOED
            return role === 'ODPC' || role === 'DOED' || (role === 'Evaluator' && level === 'ODPC');
        }

        if (dept === 'mental') {
            // Evaluator from Mental Health
            if (role === 'Evaluator' && level === 'MENTAL') {
                return no >= 31 && no <= 37;
            }
            return false;
        }

        if (dept === 'health') {
            // Evaluator from DOH OR Provincial
            if ((role === 'Evaluator' && level === 'DOH') || role === 'Provincial') {
                return (no >= 18 && no <= 20) || (no >= 27 && no <= 30);
            }
            return false;
        }

        return false;
    };

    const isColumnVisible = (dept: 'health' | 'mental' | 'ddc') => {
        // Option: Hide columns entirely if not relevant?
        // Or show them read-only? 
        // For now, let's keep them visible but disable inputs.
        return true;
    }

    // Calculate Totals
    const calculateResult = (dept: 'health' | 'mental' | 'ddc') => {
        let totalMax = 0;
        let totalGot = 0;

        questions.forEach(q => {
            // For calculation, we include relevant items regardless of who is viewing, 
            // but we might want to only count what is "set".
            // However, the standard calculation logic should probably use fixed ranges.

            let relevant = false;
            // Use fixed definition for calculation ranges
            if (dept === 'ddc') relevant = true;
            else if (dept === 'mental') relevant = (parseInt(q.no) >= 31 && parseInt(q.no) <= 37);
            else if (dept === 'health') relevant = ((parseInt(q.no) >= 18 && parseInt(q.no) <= 20) || (parseInt(q.no) >= 27 && parseInt(q.no) <= 30));

            if (relevant) {
                totalMax += 3; // Max score per question
                const sc = adminScores[q.no]?.[dept] ?? 0;
                totalGot += sc;
            }
        });

        if (totalMax === 0) return 0;
        return Math.round((totalGot / totalMax) * 100);
    };

    const shieldResult = (percentage: number) => {
        if (percentage >= 90) return { text: "โล่ทอง (Gold)", color: "text-yellow-600 bg-yellow-50" };
        if (percentage >= 80) return { text: "โล่เงิน (Silver)", color: "text-slate-600 bg-slate-50" };
        if (percentage >= 60) return { text: "ใบประกาศฯ จังหวัด", color: "text-blue-600 bg-blue-50" };
        return { text: "ใบประกาศฯ เข้าร่วม", color: "text-slate-500 bg-slate-50" };
    };

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            alert("บันทึกผลการประเมินสำเร็จ (Mockup)");
            router.push('/admins/assess');
        }, 800);
    };

    const renderScoreSelect = (q: Question, dept: 'health' | 'mental' | 'ddc') => {
        const allowed = isAccessAllowed(q.no, dept);
        const score = adminScores[q.no]?.[dept];

        if (!allowed) {
            // Render text if not allowed to edit, or nothing?
            // If it has a score, show it?
            if (score !== undefined) return <div className="text-center font-semibold text-slate-500">{score}</div>;
            return <div className="text-center text-slate-300">-</div>;
        }

        return (
            <select
                value={score ?? ''}
                onChange={(e) => handleScoreChange(q.no, dept, e.target.value)}
                className={`w-full text-sm p-1.5 rounded border outline-none focus:ring-2 focus:ring-blue-500/20
                    ${dept === 'ddc' ? 'border-blue-200 text-blue-700 font-semibold bg-blue-50/20' : 'border-slate-200 text-slate-700'}
                `}
            >
                <option value="">-</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
            </select>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="w-full px-6">
                    <div className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 size={24} className="text-blue-600" />
                                    {factory.name}
                                </h1>
                                <p className="text-sm text-slate-500">{factory.province} • สถานะ: {factory.status}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-xs text-slate-500">DDC Project Score</div>
                                <div className="text-2xl font-bold text-blue-600">{calculateResult('ddc')}%</div>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-all"
                            >
                                <Save size={18} />
                                {saving ? 'บันทึก...' : 'บันทึกผล'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-6 py-8 space-y-8">
                {/* Score Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['health', 'mental', 'ddc'].map((dept) => {
                        const score = calculateResult(dept as any);
                        const shield = shieldResult(score);
                        const title = dept === 'health' ? 'ศูนย์อนามัย (ข้อ 18-20, 27-30)' : dept === 'mental' ? 'ศูนย์สุขภาพจิต (หมวด 4)' : 'สคร. (41 ข้อ)';

                        return (
                            <div key={dept} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <div className="text-sm font-semibold text-slate-500 mb-2">{title}</div>
                                <div className="flex items-end justify-between">
                                    <div className="text-3xl font-bold text-slate-800">{score}%</div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${shield.color}`}>
                                        {shield.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Table View */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-sm font-bold">
                                    <th className="p-4 w-16 text-center">ข้อ</th>
                                    <th className="p-4 min-w-[300px]">หัวข้อ</th>
                                    <th className="p-4 w-[250px]">ประเมินตนเอง</th>
                                    <th className="p-4 w-32 text-center bg-orange-50/50 text-orange-800 border-l border-slate-200">ศูนย์อนามัย</th>
                                    <th className="p-4 w-32 text-center bg-purple-50/50 text-purple-800 border-l border-slate-200">ศูนย์สุขภาพจิต</th>
                                    <th className="p-4 w-32 text-center bg-blue-50/50 text-blue-800 border-l border-slate-200">สคร.</th>
                                    <th className="p-4 w-48 text-left bg-slate-50 text-slate-700 border-l border-slate-200">ข้อคิดเห็นของผู้ประเมิน</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Object.entries(grouped).map(([category, items]) => (
                                    <React.Fragment key={category}>
                                        <tr className="bg-slate-50/80">
                                            <td colSpan={7} className="p-3 text-sm font-bold text-slate-700 border-t border-slate-200">
                                                {category}
                                            </td>
                                        </tr>
                                        {items.map((q) => (
                                            <tr key={q.no} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-center align-top font-bold text-slate-500">
                                                    {q.no}
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="text-sm font-semibold text-slate-800 mb-1">{q.question}</div>
                                                    {/* <div className="text-xs text-slate-500 line-clamp-2 hover:line-clamp-none transition-all cursor-help" title={q["3"] ?? q["1"]}>
                                                        เกณฑ์ 3 คะแนน: {q["3"] || "-"}
                                                    </div> */}
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                                                                {userAnswers[q.no]} คะแนน
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <a
                                                                href="/data/TEST.pdf"
                                                                target="_blank"
                                                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-100"
                                                            >
                                                                <ScrollText size={12} />
                                                                หลักฐาน 1
                                                            </a>
                                                            {userAnswers[q.no] > 1 && (
                                                                <a
                                                                    href="/data/TEST.pdf"
                                                                    target="_blank"
                                                                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-100"
                                                                >
                                                                    <ScrollText size={12} />
                                                                    หลักฐาน 2
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-center border-l border-slate-100 bg-orange-50/10">
                                                    {renderScoreSelect(q, 'health')}
                                                </td>
                                                <td className="p-4 align-top text-center border-l border-slate-100 bg-purple-50/10">
                                                    {renderScoreSelect(q, 'mental')}
                                                </td>
                                                <td className="p-4 align-top text-center border-l border-slate-100 bg-blue-50/10">
                                                    {renderScoreSelect(q, 'ddc')}
                                                </td>
                                                <td className="p-4 align-top border-l border-slate-100">
                                                    <textarea
                                                        value={comments[q.no] || ''}
                                                        onChange={(e) => setComments({ ...comments, [q.no]: e.target.value })}
                                                        placeholder="ระบุหมายเหตุ..."
                                                        disabled={!(isAccessAllowed(q.no, 'health') || isAccessAllowed(q.no, 'mental') || isAccessAllowed(q.no, 'ddc'))}
                                                        className={`w-full text-sm p-2 rounded border border-slate-200 min-h-[80px] focus:ring-2 focus:ring-blue-500/20 outline-none resize-y ${!(isAccessAllowed(q.no, 'health') || isAccessAllowed(q.no, 'mental') || isAccessAllowed(q.no, 'ddc'))
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            : 'bg-white'
                                                            }`}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
