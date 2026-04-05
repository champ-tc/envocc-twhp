"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Save, Upload, X, File as FileIcon, CheckSquare, Download, Loader2 } from 'lucide-react';

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
    refreshAnswers?: () => Promise<void>;
}


// Files: { [questionId]: { [level]: { [slotIndex]: File } } }
type FilesState = Record<string, Record<number, Record<number, File>>>;

const SPECIAL_QUESTIONS = ["14", "21", "32", "37"];

const CATEGORY_NAMES: Record<string, string> = {
    "Collaborate": "หมวด 1 การสนับสนุนขององค์กร การมีส่วนร่วมของผู้ปฏิบัติงาน การใส่ใจต่อสุขภาพและสิ่งแวดล้อมระหว่างองค์กรและชุมชน",
    "Disease": "หมวดที่ 2 ปลอดโรค",
    "Safety": "หมวดที่ 3 ปลอดภัย",
    "Mental": "หมวดที่ 4 กายใจเป็นสุข",
    "Outcome": "การวัดผลลัพธ์การดำเนินงาน"
};


export default function QuestionForm({ groupedQuestions, initialAnswers = {}, initialFiles = {}, refreshAnswers }: QuestionFormProps) {
    const router = useRouter();
    // Store answers as { questionNo: score }
    const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
    // Files: { [qNo]: { [level]: File[] } }
    const [files, setFiles] = useState<FilesState>({});
    // State to track ALL existing files (initial + newly saved) for UI display
    const [localExistingFiles, setLocalExistingFiles] = useState<Record<string, Record<number, { name: string, path: string }[]>>>(initialFiles || {});

    const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>(Object.keys(initialAnswers));
    const [deletedFileKeys, setDeletedFileKeys] = useState<Record<string, string[]>>({}); // { questionId: ["file_1_1", ...] }
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);

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
        setLocalExistingFiles(initialFiles || {});
    }, [initialFiles]);

    const [savingId, setSavingId] = useState<string | null>(null);
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

    const handleFileChange = (id: string, level: number, slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles(prev => ({
                ...prev,
                [id]: {
                    ...(prev[id] || {}),
                    [level]: {
                        ...(prev[id]?.[level] || {}),
                        [slotIndex]: file
                    }
                }
            }));

            // If it was in deleted keys, remove it (it's being replaced)
            const fieldKey = `file_${level}_${slotIndex + 1}`;
            setDeletedFileKeys(prev => ({
                ...prev,
                [id]: (prev[id] || []).filter(k => k !== fieldKey)
            }));

            if (savedQuestionIds.includes(id)) {
                setSavedQuestionIds(prev => prev.filter(item => item !== id));
            }
        }
        if (e.target) e.target.value = '';
    };

    const removeNewFile = (id: string, level: number, slotIndex: number) => {
        setFiles(prev => {
            const qFiles = { ...(prev[id] || {}) };
            const levelFiles = { ...(qFiles[level] || {}) };
            delete levelFiles[slotIndex];

            return {
                ...prev,
                [id]: {
                    ...qFiles,
                    [level]: levelFiles
                }
            };
        });
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
        const qDeleted = deletedFileKeys[id] || [];

        const hasFileInSlot = (level: number): boolean => {
            // Check all 5 possible slots (max)
            for (let i = 0; i < 5; i++) {
                const fieldKey = `file_${level}_${i + 1}`;
                if (qDeleted.includes(fieldKey)) continue; // Marked for deletion
                if (qFiles[level]?.[i]) return true; // Has new file
                if (qExisting[level]?.[i]) return true; // Has existing file
            }
            return false;
        };

        if (SPECIAL_QUESTIONS.includes(qNo)) {
            if (!hasFileInSlot(0)) return false;
        } else {
            for (let level = 1; level <= score; level++) {
                if (!hasFileInSlot(level)) return false;
            }
        }
        return true;
    };

    const handleViewFile = (fileName: string) => {
        if (!fileName) {
            alert("ไฟล์นี้เพิ่งถูกบันทึก กรุณารีเฟรชหน้าจอเพื่อรับลิงก์สำหรับเปิดดู");
            return;
        }
        setPreviewFileName(fileName);
    };

    const handleRemoveExistingFile = (questionId: string, level: number, index: number, fileName: string) => {
        if (!confirm("คุณต้องการลบไฟล์นี้ใช่หรือไม่? (การลบจะมีผลเมื่อคุณกดบันทึกข้อนี้)")) return;

        const fieldKey = `file_${level}_${index + 1}`;

        // 1. Add to deleted list
        setDeletedFileKeys(prev => ({
            ...prev,
            [questionId]: [...(prev[questionId] || []), fieldKey]
        }));

        // 2. Remove from UI display
        setLocalExistingFiles(prev => {
            const currentQFiles = { ...(prev[questionId] || {}) };
            if (currentQFiles[level]) {
                currentQFiles[level] = currentQFiles[level].filter((_, i) => i !== index);
            }
            return { ...prev, [questionId]: currentQFiles };
        });

        // 3. Mark as unsaved
        if (savedQuestionIds.includes(questionId)) {
            setSavedQuestionIds(prev => prev.filter(item => item !== questionId));
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
        const hasNewFiles = Object.values(qFilesForSave).some(slots => Object.keys(slots).length > 0);
        const qDeleted = deletedFileKeys[id] || [];

        // If it’s a PATCH and nothing changed, skip API call
        if (method === "PATCH" && !scoreChanged && !hasNewFiles && qDeleted.length === 0) {
            alert("บันทึกเรียบร้อย (ไม่มีการเปลี่ยนแปลง)");
            return;
        }

        try {
            setSavingId(id);
            const formData = new FormData();
            formData.append("questionId", id);

            // Only send score if it's POST (new) or if it CHANGED
            if (method === "POST" || scoreChanged) {
                formData.append("selectedChoice", score === -1 ? "n/a" : score.toString());
            }

            // Append files with keys: file_{level}_{index}
            Object.entries(qFilesForSave).forEach(([levelStr, slotsMap]) => {
                const level = parseInt(levelStr);
                const isSpecial = SPECIAL_QUESTIONS.includes(qNo);
                const effectiveLevel = (isSpecial && level === 0) ? score :
                    (level === 0) ? 1 : level;

                Object.entries(slotsMap).forEach(([slotIdx, file]) => {
                    formData.append(`file_${effectiveLevel}_${parseInt(slotIdx) + 1}`, file);
                });
            });

            // Append deleted file signals
            if (method === "PATCH") {
                qDeleted.forEach(key => {
                    formData.append(key, "");
                });
            }

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
            // 1. Mark as saved locally first
            if (!savedQuestionIds.includes(id)) {
                setSavedQuestionIds(prev => [...prev, id]);
            }

            // 2. Call Parent Refresh to get real file paths and updated state
            if (refreshAnswers) {
                await refreshAnswers();
            }

            // 3. Clear the NEW FILES and DELETED state for this question
            setFiles(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
            setDeletedFileKeys(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });

            // 4. Clear error
            setErrorIds(prev => prev.filter(item => item !== id));

            alert("บันทึกสำเร็จ");
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
        } finally {
            setSavingId(null);
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
            alert(`เกิดข้อผิดพลาดในการส่งข้อมูล: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-12 pb-32">
            {/* Premium Progress Bar */}
            <div className="sticky top-4 z-50 mb-10 mx-auto max-w-full sm:mx-0">
                <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-white/50 shadow-xl p-5 transition-all duration-300 hover:shadow-2xl hover:bg-white/90 group ring-1 ring-slate-900/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-emerald-200 shadow-xl group-hover:scale-105 transition-transform duration-500">
                                <CheckCircle size={24} className="animate-[pulse_2s_infinite]" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">ความคืบหน้าการประเมิน</h3>
                                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">บันทึกเรียบร้อยแล้ว {progress} จากทั้งหมด {totalQuestions} ข้อ</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-3 w-full sm:w-auto justify-end sm:justify-start">
                            <div className="text-right">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-emerald-600 tabular-nums tracking-tighter">{percentage}</span>
                                    <span className="text-sm font-bold text-emerald-500">%</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Complete</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 h-4 w-full bg-slate-100/50 rounded-full overflow-hidden p-1 border border-slate-200 shadow-inner">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out relative"
                            style={{ width: `${percentage}%` }}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-30 animate-[pulse_1.5s_infinite]" />
                        </div>
                    </div>
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
                                    const hasNewFiles = qFiles[0] && Object.keys(qFiles[0]).length > 0;
                                    const hasExistingFiles = qExistingFiles[0] && qExistingFiles[0].length > 0;

                                    if (!hasNewFiles && !hasExistingFiles) {
                                        missingLevels.push(0);
                                    }
                                } else {
                                    for (let i = 1; i <= currentScore; i++) {
                                        const hasNewFiles = qFiles[i] && Object.keys(qFiles[i]).length > 0;
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
                                                    onClick={() => handleScoreChange(q.id, score)}
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
                                        <div className="space-y-4 bg-slate-50 rounded-xl p-5 border-2 border-slate-100 mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                                    <Upload size={18} />
                                                    หลักฐานประกอบการพิจารณา
                                                </h4>
                                            </div>

                                            {Array.from({ length: isSpecial ? 1 : currentScore }, (_, i) => isSpecial ? 0 : i + 1).map((level) => (
                                                <div key={level} className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
                                                    <div className="text-xs font-bold uppercase text-blue-600 mb-2">
                                                        {isSpecial ? "ไฟล์หลักฐาน (รวม)" : `เกณฑ์ระดับ ${level} คะแนน`}
                                                    </div>
                                                    {!isSpecial && (
                                                        <p className="text-sm text-slate-700 leading-snug whitespace-pre-line mb-4">
                                                            {q[level.toString() as "1" | "2" | "3"] || "ไม่มีรายละเอียด"}
                                                        </p>
                                                    )}

                                                    <div className="grid grid-cols-1 gap-2">
                                                        {Array.from({ length: isSpecial ? 5 : 3 }).map((_, slotIdx) => {
                                                            const existing = qExistingFiles[level]?.[slotIdx];
                                                            const newVal = qFiles[level]?.[slotIdx];
                                                            const fieldKey = `file_${level}_${slotIdx + 1}`;
                                                            const isMarkedDeleted = (deletedFileKeys[q.id] || []).includes(fieldKey);

                                                            return (
                                                                <div key={slotIdx} className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg border border-dashed border-slate-200">
                                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded uppercase">Slot {slotIdx + 1}</span>
                                                                        {newVal ? (
                                                                            <span className="text-xs text-blue-600 font-medium truncate italic">ไฟล์ที่ {slotIdx + 1} (รอส่ง)</span>
                                                                        ) : (existing && !isMarkedDeleted) ? (
                                                                            <span className="text-xs text-emerald-700 font-medium truncate">ไฟล์เดิมที่ {slotIdx + 1}</span>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-400 italic">ว่าง</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-1">
                                                                        {(existing && !isMarkedDeleted && existing.path) && (
                                                                            <button onClick={() => handleViewFile(existing.path)} type="button" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded">
                                                                                <FileIcon size={14} />
                                                                            </button>
                                                                        )}
                                                                        {(newVal || (existing && !isMarkedDeleted)) ? (
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (newVal) removeNewFile(q.id, level, slotIdx);
                                                                                    else handleRemoveExistingFile(q.id, level, slotIdx, existing!.path);
                                                                                }}
                                                                                type="button"
                                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => fileInputRefs.current[`${q.id}_${level}_${slotIdx}`]?.click()}
                                                                                type="button"
                                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                                            >
                                                                                <Upload size={14} />
                                                                                <input
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    ref={el => { fileInputRefs.current[`${q.id}_${level}_${slotIdx}`] = el; }}
                                                                                    onChange={(e) => handleFileChange(q.id, level, slotIdx, e)}
                                                                                />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Per Question Save Button */}
                                    <div className="flex justify-end pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleSaveQuestion(q.id, q.no)}
                                            disabled={savingId === q.id}
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

            {previewFileName && (
                <FilePreviewModal
                    fileName={previewFileName}
                    onClose={() => setPreviewFileName(null)}
                />
            )}
        </div>
    );
}

// --- Preview Modal Component ---
function FilePreviewModal({ fileName, onClose }: { fileName: string; onClose: () => void }) {
    const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);
        setPresignedUrl(null);

        fetch(`/api/factories/files?fileName=${encodeURIComponent(fileName)}`)
            .then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const url = data.url || data.presignedUrl || data.presigned_url;
                if (typeof url !== "string" || !url.startsWith("http")) {
                    throw new Error("URL ไม่ถูกต้อง");
                }
                if (!cancelled) setPresignedUrl(url);
            })
            .catch((err) => {
                if (!cancelled) setError("ไม่สามารถโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = false; }; // Simplified cancel for React.useEffect
    }, [fileName]);

    const handleDownload = async () => {
        try {
            const res = await fetch(`/api/factories/files?fileName=${encodeURIComponent(fileName)}`);
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            const url = data.url || data.presignedUrl || data.presigned_url;
            if (typeof url === "string" && url.startsWith("http")) {
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.target = "_blank";
                a.click();
            }
        } catch {
            alert("ไม่สามารถดาวน์โหลดไฟล์ได้");
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col border border-gray-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 text-[#2E8B57] rounded-xl flex items-center justify-center">
                            <FileIcon size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">ตัวอย่างไฟล์</h3>
                            <p className="text-xs text-gray-500 font-medium">เอกสารหลักฐาน</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="p-2.5 text-gray-500 hover:text-[#2E8B57] hover:bg-green-50 rounded-xl transition-colors"
                            title="ดาวน์โหลดไฟล์"
                        >
                            <Download size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-100 relative min-h-0">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-20">
                            <Loader2 className="animate-spin text-[#2E8B57]" size={32} />
                            <p className="text-sm font-medium text-gray-600">กำลังโหลดเอกสาร...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-20">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                                <X size={32} />
                            </div>
                            <p className="text-sm font-medium text-gray-700">{error}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-[#2E8B57] text-white rounded-xl text-sm font-semibold hover:bg-[#257a4a] transition-colors"
                            >
                                ปิด
                            </button>
                        </div>
                    )}

                    {presignedUrl && (
                        <iframe
                            key={presignedUrl}
                            src={presignedUrl}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
