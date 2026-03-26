"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Save, Upload, X, File as FileIcon, CheckSquare } from 'lucide-react';

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

interface QuestionFormProps {
    groupedQuestions: Record<string, Question[]>;
}


type FilesState = Record<string, Record<number, File[]>>;

const SPECIAL_QUESTIONS = ["14", "21", "32", "37"];


export default function QuestionForm({ groupedQuestions }: QuestionFormProps) {
    const router = useRouter();
    // Store answers as { questionNo: score }
    const [answers, setAnswers] = useState<Record<string, number>>({});
    // Files: { [qNo]: { [level]: File[] } }
    const [files, setFiles] = useState<FilesState>({});

    const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [errorIds, setErrorIds] = useState<string[]>([]);

    // Ref for file inputs: { [qNo_level]: input }
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Calculate total number of questions
    const totalQuestions = useMemo(() => {
        return Object.values(groupedQuestions).reduce((acc, items) => acc + items.length, 0);
    }, [groupedQuestions]);

    const progress = savedQuestionIds.length;
    const percentage = Math.round((progress / totalQuestions) * 100);

    const handleScoreChange = (questionNo: string, score: number) => {
        setAnswers(prev => ({
            ...prev,
            [questionNo]: score
        }));
        // Remove from saved if modified
        if (savedQuestionIds.includes(questionNo)) {
            setSavedQuestionIds(prev => prev.filter(id => id !== questionNo));
        }
        // Clear error for this question if it exists
        if (errorIds.includes(questionNo)) {
            setErrorIds(prev => prev.filter(id => id !== questionNo));
        }
    };

    const handleFileChange = (questionNo: string, level: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => {
                const existingForLevel = prev[questionNo]?.[level] || [];
                // Special questions allow 5 files total (level 0), others 3 per level
                const isSpecial = SPECIAL_QUESTIONS.includes(questionNo);
                const maxFiles = isSpecial ? 5 : 3;

                const remainingQuota = maxFiles - existingForLevel.length;

                if (remainingQuota <= 0) return prev;

                const filesToAdd = newFiles.slice(0, remainingQuota);
                const updatedLevelFiles = [...existingForLevel, ...filesToAdd];

                return {
                    ...prev,
                    [questionNo]: {
                        ...(prev[questionNo] || {}),
                        [level]: updatedLevelFiles
                    }
                };
            });
            // Remove from saved if modified
            if (savedQuestionIds.includes(questionNo)) {
                setSavedQuestionIds(prev => prev.filter(id => id !== questionNo));
            }
        }
        // Reset input
        if (e.target) e.target.value = '';
    };

    const removeFile = (questionNo: string, level: number, index: number) => {
        setFiles(prev => {
            const qFiles = prev[questionNo] || {};
            const levelFiles = qFiles[level] || [];
            const updatedLevelFiles = levelFiles.filter((_, i) => i !== index);

            return {
                ...prev,
                [questionNo]: {
                    ...qFiles,
                    [level]: updatedLevelFiles
                }
            };
        });
        // Remove from saved if modified
        if (savedQuestionIds.includes(questionNo)) {
            setSavedQuestionIds(prev => prev.filter(id => id !== questionNo));
        }
    };

    const validateQuestion = (qNo: string): boolean => {
        const score = answers[qNo];
        if (score === undefined) return false;
        if (score <= 0) return true; // 0 or -1 (N/A) -> Valid by default

        const qFiles = files[qNo] || {};

        if (SPECIAL_QUESTIONS.includes(qNo)) {
            // Check unified Level 0
            if (!qFiles[0] || qFiles[0].length === 0) {
                return false;
            }
        } else {
            // Check required levels
            for (let level = 1; level <= score; level++) {
                if (!qFiles[level] || qFiles[level].length === 0) {
                    return false; // Missing file for this required level
                }
            }
        }
        return true;
    };

    const handleSaveQuestion = (qNo: string) => {
        if (!validateQuestion(qNo)) {
            alert('กรุณาตอบคำถามและแนบไฟล์ให้ครบถ้วนทุกระดับคะแนนก่อนบันทึก');
            if (!errorIds.includes(qNo)) setErrorIds(prev => [...prev, qNo]);
            return;
        }

        // Success Save
        if (!savedQuestionIds.includes(qNo)) {
            setSavedQuestionIds(prev => [...prev, qNo]);
        }
        // Clear error
        setErrorIds(prev => prev.filter(id => id !== qNo));
    };

    const handleFinalSubmit = () => {
        setSubmitting(true);

        // 1. Check if all questions are saved
        if (savedQuestionIds.length !== totalQuestions) {
            const missingCount = totalQuestions - savedQuestionIds.length;
            alert(`กรุณาบันทึกข้อมูลให้ครบทุกข้อ (เหลือ ${missingCount} ข้อ)`);
            setSubmitting(false);

            // Find first unsaved
            const allQIds = Object.values(groupedQuestions).flatMap(g => g.map(q => q.no));
            const firstUnsaved = allQIds.find(id => !savedQuestionIds.includes(id));
            if (firstUnsaved) {
                document.getElementById(`question-${firstUnsaved}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Success
        setTimeout(() => {
            setSubmitting(false);

            // Save to localStorage
            localStorage.setItem('twhp_answers', JSON.stringify(answers));
            localStorage.setItem('twhp_grouped_questions', JSON.stringify(groupedQuestions));

            alert('ยืนยันการส่งข้อมูลสำเร็จ! (Mockup)');
            router.push('/factories/summary');
        }, 500);
    };

    return (
        <div className="space-y-12 pb-32">
            {/* Progress Bar */}
            <div className="sticky top-0 z-50 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 shadow-sm transition-all">
                <div className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
                    <span>ความคืบหน้าการบันทึกข้อมูล</span>
                    <span>{progress} / {totalQuestions} ({percentage}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-300 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {Object.entries(groupedQuestions).map(([type, items]) => (
                <section key={type} className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                        <h2 className="text-lg md:text-xl font-bold text-emerald-900">{type}</h2>
                    </div>

                    <div className="grid gap-8">
                        {items.map((q, index) => {
                            const currentScore = answers[q.no];
                            const qFiles = files[q.no] || {};
                            const hasError = errorIds.includes(q.no);
                            const isSaved = savedQuestionIds.includes(q.no);

                            // Only needed if score > 0
                            const showUpload = currentScore !== undefined && currentScore > 0;
                            const isSpecial = SPECIAL_QUESTIONS.includes(q.no);

                            const missingLevels: number[] = [];
                            if (showUpload) {
                                if (isSpecial) {
                                    // Check unified level 0
                                    if (!qFiles[0] || qFiles[0].length === 0) {
                                        // We can use 0 to indicate missing global evidence
                                        missingLevels.push(0);
                                    }
                                } else {
                                    for (let i = 1; i <= currentScore; i++) {
                                        if (!qFiles[i] || qFiles[i].length === 0) {
                                            missingLevels.push(i);
                                        }
                                    }
                                }
                            }
                            const isEvidenceMissing = missingLevels.length > 0;

                            return (
                                <div
                                    key={index}
                                    id={`question-${q.no}`}
                                    className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-300 bg-white shadow-sm
                    ${hasError ? 'border-red-400 ring-4 ring-red-50' : isSaved ? 'border-green-400 ring-4 ring-green-50' : 'border-slate-100 hover:border-slate-200'}
                  `}
                                >
                                    {/* Badge & Question */}
                                    <div className="flex gap-4 mb-6">
                                        <div className={`
                      flex-none flex items-center justify-center w-12 h-12 rounded-xl font-bold text-lg shadow-inner
                      ${hasError ? 'bg-red-100 text-red-600' : isSaved ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}
                    `}>
                                            {isSaved ? <CheckCircle size={24} /> : q.no}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-line">
                                                {q.question}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Selection Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        {[0, 1, 2, 3].map((score) => {
                                            const isSelected = currentScore === score;
                                            const scoreText = q[score.toString() as "0" | "1" | "2" | "3"];

                                            return (
                                                <div
                                                    key={score}
                                                    onClick={() => handleScoreChange(q.no, score)}
                                                    className={`
                            group cursor-pointer rounded-xl p-4 border-2 relative transition-all duration-200 flex flex-col
                            ${isSelected
                                                            ? 'border-blue-600 bg-blue-50/50 shadow-md transform scale-[1.02]'
                                                            : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'}
                          `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className={`
                               w-6 h-6 rounded-full border-2 flex items-center justify-center
                               ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-blue-400'}
                             `}>
                                                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md
                               ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}
                             `}>
                                                            {score} คะแนน
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm leading-snug flex-1 whitespace-pre-line ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>
                                                        {scoreText || "-"}
                                                    </p>
                                                </div>
                                            );
                                        })}

                                        {/* N/A Option */}
                                        {q["N/A"] !== "-" && (
                                            <div
                                                onClick={() => handleScoreChange(q.no, -1)}
                                                className={`
                                group cursor-pointer rounded-xl p-4 border-2 relative transition-all duration-200 flex flex-col md:col-span-2 lg:col-span-1
                                ${currentScore === -1
                                                        ? 'border-slate-500 bg-slate-100 shadow-md transform scale-[1.02]'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}
                            `}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`
                                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                                    ${currentScore === -1 ? 'border-slate-600 bg-slate-600' : 'border-slate-300 group-hover:border-slate-400'}
                                `}>
                                                        {currentScore === -1 && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                                    </div>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md
                                    ${currentScore === -1 ? 'bg-slate-300 text-slate-900' : 'bg-slate-100 text-slate-500'}
                                `}>
                                                        N/A
                                                    </span>
                                                </div>
                                                <p className={`text-sm leading-snug flex-1 whitespace-pre-line ${currentScore === -1 ? 'text-slate-900' : 'text-slate-600'}`}>
                                                    {q["N/A"]}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cumulative Upload Section */}
                                    {showUpload && (
                                        <div className={`space-y-4 bg-slate-50 rounded-xl p-5 border-2 ${isEvidenceMissing ? 'border-red-300 bg-red-50/50' : 'border-slate-100'} mb-6`}>

                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                                    <Upload size={18} />
                                                    หลักฐานประกอบการพิจารณา
                                                </h4>
                                            </div>

                                            {isSpecial ? (
                                                /* Special Questions: Unified Upload (Level 0) */
                                                <div className={`
                                                    p-4 rounded-lg bg-white border shadow-sm
                                                    ${isEvidenceMissing ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}
                                                `}>
                                                    <div className="space-y-3 mb-4">
                                                        {Array.from({ length: currentScore }, (_, i) => i + 1).map((level) => (
                                                            <div key={level}>
                                                                <div className="text-xs font-bold uppercase text-blue-600 mb-1">
                                                                    เกณฑ์ระดับ {level} คะแนน
                                                                </div>
                                                                <p className="text-sm text-slate-700 leading-snug whitespace-pre-line">
                                                                    {q[level.toString() as "1" | "2" | "3"] || "ไม่มีรายละเอียด"}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="border-t border-slate-100 pt-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-semibold text-slate-700">แนบไฟล์หลักฐาน (รวมไม่เกิน 5 ไฟล์)</span>
                                                            <div className="flex-none">
                                                                {(qFiles[0] || []).length < 5 && (
                                                                    <button
                                                                        onClick={() => fileInputRefs.current[`${q.no}_0`]?.click()}
                                                                        className="text-xs bg-slate-50 border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                    >
                                                                        + เพิ่มไฟล์ ({(qFiles[0] || []).length}/5)
                                                                    </button>
                                                                )}
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    className="hidden"
                                                                    ref={el => { fileInputRefs.current[`${q.no}_0`] = el; }}
                                                                    onChange={(e) => handleFileChange(q.no, 0, e)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* File List for Special Question */}
                                                        <div className="space-y-1.5">
                                                            {(qFiles[0] || []).length === 0 ? (
                                                                <div className={`text-xs italic ${isEvidenceMissing ? 'text-red-500' : 'text-slate-400'}`}>
                                                                    * ยังไม่มีไฟล์แนบ (จำเป็น)
                                                                </div>
                                                            ) : (
                                                                (qFiles[0] || []).map((file, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <FileIcon size={12} className="text-blue-500 flex-none" />
                                                                            <span className="truncate text-slate-600 bg-transparent max-w-[150px] sm:max-w-xs">{file.name}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => removeFile(q.no, 0, idx)}
                                                                            className="text-slate-400 hover:text-red-500 p-0.5"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Normal Questions: Per Level Upload */
                                                Array.from({ length: currentScore }, (_, i) => i + 1).map((level) => {
                                                    const levelFiles = qFiles[level] || [];
                                                    const levelMissing = missingLevels.includes(level);
                                                    const criteriaText = q[level.toString() as "1" | "2" | "3"];

                                                    return (
                                                        <div key={level} className={`
                                       p-4 rounded-lg bg-white border shadow-sm
                                       ${levelMissing ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}
                                   `}>
                                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-bold uppercase text-blue-600 mb-1">
                                                                        เกณฑ์ระดับ {level} คะแนน
                                                                    </div>
                                                                    <p className="text-sm text-slate-700 leading-snug whitespace-pre-line">
                                                                        {criteriaText || "ไม่มีรายละเอียด"}
                                                                    </p>
                                                                </div>

                                                                <div className="flex-none text-right">
                                                                    {levelFiles.length < 3 && (
                                                                        <button
                                                                            onClick={() => fileInputRefs.current[`${q.no}_${level}`]?.click()}
                                                                            className="text-xs bg-slate-50 border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                        >
                                                                            + เพิ่มไฟล์ ({levelFiles.length}/3)
                                                                        </button>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        multiple
                                                                        className="hidden"
                                                                        ref={el => { fileInputRefs.current[`${q.no}_${level}`] = el; }}
                                                                        onChange={(e) => handleFileChange(q.no, level, e)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* File List for this Level */}
                                                            <div className="space-y-1.5">
                                                                {levelFiles.length === 0 ? (
                                                                    <div className={`text-xs italic ${levelMissing ? 'text-red-500' : 'text-slate-400'}`}>
                                                                        * ยังไม่มีไฟล์แนบ (จำเป็น)
                                                                    </div>
                                                                ) : (
                                                                    levelFiles.map((file, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <FileIcon size={12} className="text-blue-500 flex-none" />
                                                                                <span className="truncate text-slate-600 bg-transparent max-w-[150px] sm:max-w-xs">{file.name}</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => removeFile(q.no, level, idx)}
                                                                                className="text-slate-400 hover:text-red-500 p-0.5"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {/* Per Question Save Button */}
                                    <div className="flex justify-end pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleSaveQuestion(q.no)}
                                            disabled={isSaved}
                                            className={`
                            flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all
                            ${isSaved
                                                    ? 'bg-green-100 text-green-700 cursor-default'
                                                    : 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg hover:shadow-xl'}
                        `}
                                        >
                                            {isSaved ? (
                                                <>
                                                    <CheckCircle size={18} /> บันทึกแล้ว
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={18} /> บันทึกข้อนี้
                                                </>
                                            )}
                                        </button>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="hidden sm:block text-slate-600 text-sm">
                        {progress === totalQuestions
                            ? <span className="text-green-600 font-bold flex items-center gap-2"><CheckCircle size={18} /> บันทึกครบทุกข้อแล้ว พร้อมส่งข้อมูล</span>
                            : <span className="text-orange-600 font-medium">รอการบันทึก... (เหลือ {totalQuestions - progress} ข้อ)</span>
                        }
                    </div>

                    <button
                        onClick={handleFinalSubmit}
                        disabled={submitting}
                        className={`
              flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95
              ${progress === totalQuestions
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-emerald-500/30 ring-2 ring-emerald-200'
                                : 'bg-slate-400 cursor-not-allowed'}
            `}
                    >
                        <CheckSquare size={20} />
                        {submitting ? 'กำลังส่งข้อมูล...' : 'ยืนยันการส่ง'}
                    </button>
                </div>
            </div>
        </div>
    );
}
