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
    id: string; // Original ID
    question: string;
    "N/A": string;
    special?: string;
    originalId?: number; // Added for debugging
}

interface QuestionFormProps {
    groupedQuestions: Record<string, Question[]>;
    initialAnswers?: Record<string, number>;
    initialFiles?: Record<string, Record<number, { name: string, path: string }[]>>;
}


type FilesState = Record<string, Record<number, File[]>>;

const SPECIAL_QUESTIONS = ["14", "21", "32", "37"];

const CATEGORY_NAMES: Record<string, string> = {
    "Collaborate": "หมวด 1 การสนับสนุนขององค์กร การมีส่วนร่วมของผู้ปฏิบัติงาน การใส่ใจต่อสุขภาพและสิ่งแวดล้อมระหว่างองค์กรและชุมชน",
    "Disease": "หมวดที่ 2 ปลอดโรค",
    "Safety": "หมวดที่ 3 ปลอดภัย",
    "Mental": "หมวดที่ 4 กายใจเป็นสุข",
    "Outcome": "การวัดผลลัพธ์การดำเนินงาน"
};


export default function QuestionForm({ groupedQuestions, initialAnswers = {}, initialFiles = {} }: QuestionFormProps) {
    const router = useRouter();
    // Store answers as { questionNo: score }
    const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
    // Files: { [qNo]: { [level]: File[] } }
    const [files, setFiles] = useState<FilesState>({});
    // State to track ALL existing files (initial + newly saved) for UI display
    const [localExistingFiles, setLocalExistingFiles] = useState<Record<string, Record<number, { name: string, path: string }[]>>>(initialFiles || {});

    const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>(Object.keys(initialAnswers));

    const hasInitialSyncRef = useRef(false);

    // Update state when initialAnswers or initialFiles changes
    React.useEffect(() => {
        if (initialAnswers && Object.keys(initialAnswers).length > 0) {
            setAnswers(prev => {
                // Check if we already have these keys to avoid redundant updates
                const alreadyHasKeys = Object.keys(initialAnswers).every(k => prev[k] !== undefined);
                if (alreadyHasKeys && Object.keys(prev).length >= Object.keys(initialAnswers).length) return prev;
                return { ...prev, ...initialAnswers };
            });
            setSavedQuestionIds(prev => {
                const newIds = Array.from(new Set([...prev, ...Object.keys(initialAnswers)]));
                if (newIds.length === prev.length) return prev;
                return newIds;
            });
        }
    }, [initialAnswers]);

    React.useEffect(() => {
        if (initialFiles && Object.keys(initialFiles).length > 0) {
            setLocalExistingFiles(prev => ({ ...prev, ...initialFiles }));
        }
    }, [initialFiles]);

    const [submitting, setSubmitting] = useState(false);
    const [errorIds, setErrorIds] = useState<string[]>([]);

    // Ref for file inputs: { [qNo_level]: input }
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Calculate total number of questions
    const totalQuestions = useMemo(() => {
        return Object.values(groupedQuestions).reduce((acc, items) => acc + items.length, 0);
    }, [groupedQuestions]);

    const progress = savedQuestionIds.length;
    const percentage = totalQuestions > 0 ? Math.round((progress / totalQuestions) * 100) : 0;

    const handleScoreChange = (id: string, score: number) => {
        setAnswers(prev => ({
            ...prev,
            [id]: score
        }));
        // Remove from saved if modified
        if (savedQuestionIds.includes(id)) {
            setSavedQuestionIds(prev => prev.filter(item => item !== id));
        }
        // Clear error for this question if it exists
        if (errorIds.includes(id)) {
            setErrorIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleFileChange = (id: string, level: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => {
                const existingForLevel = prev[id]?.[level] || [];
                // Special questions allow 5 files total (level 0), others 3 per level
                const q = Object.values(groupedQuestions).flat().find(item => item.id === id);
                const isSpecial = q ? SPECIAL_QUESTIONS.includes(q.no) : false;
                const maxFiles = isSpecial ? 5 : 3;

                const remainingQuota = maxFiles - existingForLevel.length;

                if (remainingQuota <= 0) return prev;

                const filesToAdd = newFiles.slice(0, remainingQuota);
                const updatedLevelFiles = [...existingForLevel, ...filesToAdd];

                return {
                    ...prev,
                    [id]: {
                        ...(prev[id] || {}),
                        [level]: updatedLevelFiles
                    }
                };
            });
            // Remove from saved if modified
            if (savedQuestionIds.includes(id)) {
                setSavedQuestionIds(prev => prev.filter(item => item !== id));
            }
        }
        // Reset input
        if (e.target) e.target.value = '';
    };

    const removeFile = (id: string, level: number, index: number) => {
        setFiles(prev => {
            const qFiles = prev[id] || {};
            const levelFiles = qFiles[level] || [];
            const updatedLevelFiles = levelFiles.filter((_, i) => i !== index);

            return {
                ...prev,
                [id]: {
                    ...qFiles,
                    [level]: updatedLevelFiles
                }
            };
        });
        // Remove from saved if modified
        if (savedQuestionIds.includes(id)) {
            setSavedQuestionIds(prev => prev.filter(item => item !== id));
        }
    };

    const validateQuestion = (id: string, qNo: string): boolean => {
        const score = answers[id];
        if (score === undefined) return false;
        if (score <= 0) return true; // 0 or -1 (N/A) -> Valid by default

        const qFiles = files[id] || {};
        const qExisting = localExistingFiles[id] || {};

        if (SPECIAL_QUESTIONS.includes(qNo)) {
            // Check unified Level 0 - sum of new and existing
            const hasFiles = (qFiles[0]?.length || 0) + (qExisting[0]?.length || 0) > 0;
            if (!hasFiles) return false;
        } else {
            // Check required levels 1..score
            for (let level = 1; level <= score; level++) {
                const hasLevelFiles = (qFiles[level]?.length || 0) + (qExisting[level]?.length || 0) > 0;
                if (!hasLevelFiles) {
                    return false; // Missing file for this required level
                }
            }
        }
        return true;
    };

    const handleViewFile = async (fileName: string) => {
        if (!fileName) {
            alert("ไฟล์นี้เพิ่งถูกบันทึก กรุณารีเฟรชหน้าจอเพื่อรับลิงก์สำหรับเปิดดู");
            return;
        }
        try {
            const res = await fetch(`/api/factories/files?fileName=${encodeURIComponent(fileName)}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to get file URL");
            const data = await res.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                throw new Error("No URL returned from server");
            }
        } catch (err: any) {
            console.error("View file error:", err);
            alert(`ไม่สามารถเปิดไฟล์ได้: ${err.message}`);
        }
    };

    const handleSaveQuestion = async (id: string, qNo: string) => {
        if (!validateQuestion(id, qNo)) {
            alert('กรุณาตอบคำถามและแนบไฟล์ให้ครบถ้วนทุกระดับคะแนนก่อนบันทึก');
            if (!errorIds.includes(id)) setErrorIds(prev => [...prev, id]);
            return;
        }

        const score = answers[id];
        const initialScore = initialAnswers[id];
        const qFilesForSave = files[id] || {};

        const isAlreadySaved = initialAnswers[id] !== undefined || savedQuestionIds.includes(id);
        const method = isAlreadySaved ? "PATCH" : "POST";

        // Detect Changes for PATCH optimizer
        const scoreChanged = score !== initialScore;
        const hasNewFiles = Object.values(qFilesForSave).some(arr => arr.length > 0);

        // If it’s a PATCH and nothing changed, skip API call
        if (method === "PATCH" && !scoreChanged && !hasNewFiles) {
            alert("บันทึกเรียบร้อย (ไม่มีการเปลี่ยนแปลง)");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("questionId", id);

            // Only send score if it's POST (new) or if it CHANGED
            if (method === "POST" || scoreChanged) {
                formData.append("selectedChoice", score === -1 ? "n/a" : score.toString());
            }

            // Append files with keys: file_{level}_{index}
            Object.entries(qFilesForSave).forEach(([levelStr, levelFiles]) => {
                const level = parseInt(levelStr);
                // For special questions (unified level 0), map to the SELECTION score (e.g., choice 3 -> file_3_1)
                const isSpecial = SPECIAL_QUESTIONS.includes(qNo);
                const effectiveLevel = (isSpecial && level === 0) ? score :
                    (level === 0) ? 1 : level;

                levelFiles.forEach((file, idx) => {
                    formData.append(`file_${effectiveLevel}_${idx + 1}`, file);
                });
            });

            const res = await fetch("/api/factories/assessments/answers", {
                method: method,
                body: formData,
                credentials: "include"
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(errorData.message || "Failed to save answer");
            }

            // --- Success Save ---

            // 1. Mark as saved
            if (!savedQuestionIds.includes(id)) {
                setSavedQuestionIds(prev => [...prev, id]);
            }

            // 2. Move NEW files to LOCAL EXISTING FILES for immediate UI persistence
            setLocalExistingFiles(prev => {
                const currentQFiles = { ...(prev[id] || {}) };
                Object.entries(qFilesForSave).forEach(([lStr, arr]) => {
                    const l = parseInt(lStr);
                    if (!currentQFiles[l]) currentQFiles[l] = [];
                    arr.forEach(file => {
                        currentQFiles[l].push({ name: file.name, path: "" });
                    });
                });
                return { ...prev, [id]: currentQFiles };
            });

            // 3. Clear the NEW FILES state for this question
            setFiles(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });

            // 4. Clear error
            setErrorIds(prev => prev.filter(item => item !== id));

            alert("บันทึกเบื้องต้นสำเร็จ");
        } catch (err: any) {
            console.error("Save error:", err);
            alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
        }
    };

    const handleFinalSubmit = async () => {
        // 1. Check if all questions are saved
        if (savedQuestionIds.length !== totalQuestions) {
            const missingCount = totalQuestions - savedQuestionIds.length;
            alert(`กรุณาบันทึกข้อมูลให้ครบทุกข้อก่อนส่ง (เหลือ ${missingCount} ข้อ)`);
            
            // Find first unsaved
            const allQuestionsFlat = Object.values(groupedQuestions).flat();
            const firstUnsavedId = allQuestionsFlat.find(q => !savedQuestionIds.includes(q.id))?.id;
            if (firstUnsavedId) {
                document.getElementById(`question-${firstUnsavedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        if (!confirm("เมื่อยืนยันการส่งแล้ว จะไม่สามารถแก้ไขข้อมูลได้อีก คุณแน่ใจหรือไม่ว่าต้องการส่งข้อมูล?")) {
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/factories/assessments/submission", {
                method: "POST",
                credentials: "include"
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Submission failed" }));
                throw new Error(errorData.details?.message || errorData.error || "Failed to submit assessment");
            }

            // Success
            alert('ประเมินเสร็จสิ้นแล้ว');
            
            // Cleanup local storage if used
            localStorage.removeItem('twhp_answers');
            localStorage.removeItem('twhp_grouped_questions');

            // Redirect to assessment list or dashboard
            router.push('/factories/assess');
        } catch (err: any) {
            console.error("Submission error:", err);
            alert(`เกิดข้อผิดพลาดในการส่งข้อมูล: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
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
                        <h2 className="text-lg md:text-xl font-bold text-emerald-900">
                            {CATEGORY_NAMES[type] || type}
                        </h2>
                    </div>

                    <div className="grid gap-8">
                        {items.map((q, index) => {
                            const currentScore = answers[q.id];
                            const qFiles = files[q.id] || {};
                            const qExistingFiles = localExistingFiles[q.id] || {};
                            const hasError = errorIds.includes(q.id);
                            const isSaved = savedQuestionIds.includes(q.id);

                            // Only needed if score > 0
                            const showUpload = currentScore !== undefined && currentScore > 0;
                            const isSpecial = SPECIAL_QUESTIONS.includes(q.no);

                            const missingLevels: number[] = [];
                            if (showUpload) {
                                if (isSpecial) {
                                    // Check unified level 0
                                    const hasNewFiles = qFiles[0] && qFiles[0].length > 0;
                                    const hasExistingFiles = qExistingFiles[0] && qExistingFiles[0].length > 0;

                                    if (!hasNewFiles && !hasExistingFiles) {
                                        missingLevels.push(0);
                                    }
                                } else {
                                    for (let i = 1; i <= currentScore; i++) {
                                        const hasNewFiles = qFiles[i] && qFiles[i].length > 0;
                                        const hasExistingFiles = qExistingFiles[i] && qExistingFiles[i].length > 0;

                                        if (!hasNewFiles && !hasExistingFiles) {
                                            missingLevels.push(i);
                                        }
                                    }
                                }
                            }
                            const isEvidenceMissing = missingLevels.length > 0;

                            return (
                                <div
                                    key={q.id}
                                    id={`question-${q.id}`}
                                    className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-300 bg-white shadow-sm
                    ${hasError ? 'border-red-400 ring-4 ring-red-50' : isSaved ? 'border-green-400 ring-4 ring-green-50' : 'border-slate-100 hover:border-slate-200'}
                  `}
                                >
                                    {/* Badge & Question */}
                                    <div className="flex gap-4 mb-6">
                                        <div className={`
                      flex-none flex items-center justify-center w-12 h-12 rounded-xl font-bold text-lg shadow-inner relative
                      ${hasError ? 'bg-red-100 text-red-600' : isSaved ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}
                    `}>
                                            {q.no}
                                            {q.special && q.special.trim() !== "" && q.special !== "-2147483648" ? (
                                                <span className="text-xs ml-0.5 align-top">{q.special}</span>
                                            ) : null}
                                            {isSaved && (
                                                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                                    <CheckCircle size={14} />
                                                </div>
                                            )}
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
                                        {q["N/A"] && q["N/A"] !== "-" && q["N/A"].trim() !== "" && (
                                            <div
                                                onClick={() => handleScoreChange(q.id, -1)}
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
                                                            <span className="text-sm font-semibold text-slate-700">แนบไฟล์หลักฐาน (รวมไม่เกิน 3 ไฟล์)</span>
                                                            <div className="flex-none">
                                                                {(qFiles[0] || []).length < 3 && (
                                                                    <button
                                                                        onClick={() => fileInputRefs.current[`${q.id}_0`]?.click()}
                                                                        className="text-xs bg-slate-50 border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                    >
                                                                        + เพิ่มไฟล์ ({(qFiles[0] || []).length}/3)
                                                                    </button>
                                                                )}
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    className="hidden"
                                                                    ref={el => { fileInputRefs.current[`${q.id}_0`] = el; }}
                                                                    onChange={(e) => handleFileChange(q.id, 0, e)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* File List for Special Question */}
                                                        <div className="space-y-1.5">
                                                            {/* Existing Files */}
                                                            {(qExistingFiles[0] || []).map((file, idx) => (
                                                                <div key={`existing-${idx}`} className="flex items-center justify-between bg-emerald-50 p-1.5 rounded border border-emerald-200 text-xs">
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <FileIcon size={12} className="text-emerald-500 flex-none" />
                                                                        <span className="truncate text-emerald-700 font-medium max-w-[150px] sm:max-w-xs">ไฟล์ {idx + 1}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleViewFile(file.path)}
                                                                        className="text-emerald-600 hover:text-emerald-800 px-2 py-0.5 rounded bg-white border border-emerald-200"
                                                                    >
                                                                        เปิดดู
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {/* New Files */}
                                                            {(qFiles[0] || []).map((file, idx) => (
                                                                <div key={`new-${idx}`} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <FileIcon size={12} className="text-blue-500 flex-none" />
                                                                        <span className="truncate text-slate-600 bg-transparent max-w-[150px] sm:max-w-xs">{file.name} (รอส่ง)</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => removeFile(q.id, 0, idx)}
                                                                        className="text-slate-400 hover:text-red-500 p-0.5"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {/* Empty Warning */}
                                                            {(qExistingFiles[0] || []).length === 0 && (qFiles[0] || []).length === 0 && (
                                                                <div className={`text-xs italic ${isEvidenceMissing ? 'text-red-500' : 'text-slate-400'}`}>
                                                                    * ยังไม่มีไฟล์แนบ (จำเป็น)
                                                                </div>
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
                                                                            onClick={() => fileInputRefs.current[`${q.id}_${level}`]?.click()}
                                                                            className="text-xs bg-slate-50 border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                                                        >
                                                                            + เพิ่มไฟล์ ({levelFiles.length}/3)
                                                                        </button>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        multiple
                                                                        className="hidden"
                                                                        ref={el => { fileInputRefs.current[`${q.id}_${level}`] = el; }}
                                                                        onChange={(e) => handleFileChange(q.id, level, e)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* File List for this Level */}
                                                            <div className="space-y-1.5">
                                                                {/* Existing Files */}
                                                                {(qExistingFiles[level] || []).map((file, idx) => (
                                                                    <div key={`existing-${level}-${idx}`} className="flex items-center justify-between bg-emerald-50 p-1.5 rounded border border-emerald-200 text-xs">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <FileIcon size={12} className="text-emerald-500 flex-none" />
                                                                            <span className="truncate text-emerald-700 font-medium max-w-[150px] sm:max-w-xs">ไฟล์ {idx + 1}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleViewFile(file.path)}
                                                                            className="text-emerald-600 hover:text-emerald-800 px-2 py-0.5 rounded bg-white border border-emerald-200"
                                                                        >
                                                                            เปิดดู
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                {/* New Files */}
                                                                {levelFiles.map((file, idx) => (
                                                                    <div key={`new-${level}-${idx}`} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <FileIcon size={12} className="text-blue-500 flex-none" />
                                                                            <span className="truncate text-slate-600 bg-transparent max-w-[150px] sm:max-w-xs">{file.name} (รอส่ง)</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => removeFile(q.id, level, idx)}
                                                                            className="text-slate-400 hover:text-red-500 p-0.5"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                {/* Empty Warning */}
                                                                {(qExistingFiles[level] || []).length === 0 && levelFiles.length === 0 && (
                                                                    <div className={`text-xs italic ${levelMissing ? 'text-red-500' : 'text-slate-400'}`}>
                                                                        * ยังไม่มีไฟล์แนบ (จำเป็น)
                                                                    </div>
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
                                            onClick={() => handleSaveQuestion(q.id, q.no)}
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
