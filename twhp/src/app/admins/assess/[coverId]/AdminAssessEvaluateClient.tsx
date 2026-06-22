"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

type QuestionRow = {
  displayNo: number;
  apiQuestionId: number;
  category: string;
  questionText: string;
};

type AnswerRow = {
  questionId: number;
  selectedChoice: string;
  fileUrls: Array<{
    key: string;
    fileName: string;
    label: string;
  }>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function getNumber(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toQuestions(json: unknown): QuestionRow[] {
  if (!Array.isArray(json)) return [];

  return json.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const apiQuestionId = getNumber(item.id) ?? index + 1;

    return [{
      displayNo: index + 1,
      apiQuestionId,
      category: getString(item.category) || "-",
      questionText: getString(item.questionText) || getString(item.question_text) || "-",
    }];
  });
}

function toFileUrls(item: Record<string, unknown>) {
  return Object.entries(item).flatMap(([key, value]) => {
    if (!key.startsWith("fileUrl") || typeof value !== "string" || !value) return [];

    return [{
      key,
      fileName: value,
      label: value.split("/").pop() || key,
    }];
  });
}

function toAnswers(json: unknown): AnswerRow[] {
  if (!Array.isArray(json)) return [];

  return json.flatMap((item) => {
    if (!isRecord(item)) return [];
    const questionId = getNumber(item.questionId ?? item.question_id);
    if (questionId === null) return [];

    return [{
      questionId,
      selectedChoice: getString(item.selectedChoice) || getString(item.selected_choice) || "-",
      fileUrls: toFileUrls(item),
    }];
  });
}

function parseErrorMessage(raw: string, fallback: string) {
  try {
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (isRecord(data) && typeof data.message === "string") {
      if (data.message === "invalid evaluator") {
        return "บัญชีนี้ไม่มีสิทธิ์อ่านคำตอบรายข้อ: backend endpoint นี้อนุญาตเฉพาะผู้ประเมินเท่านั้น";
      }
      return data.message;
    }
  } catch {
    return raw || fallback;
  }
  return raw || fallback;
}

export default function AdminAssessEvaluateClient({ coverId }: { coverId: string }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Map<number, AnswerRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answerWarning, setAnswerWarning] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setAnswerWarning("");

        const [questionsRes, answersRes] = await Promise.all([
          fetch("/api/factories/assessments/questions", {
            credentials: "include",
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch(`/api/admins/covers/${encodeURIComponent(coverId)}/answers`, {
            credentials: "include",
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        const questionsRaw = await questionsRes.text();
        if (!questionsRes.ok) {
          throw new Error(parseErrorMessage(questionsRaw, `โหลดคำถามไม่สำเร็จ (${questionsRes.status})`));
        }
        const questionRows = toQuestions(questionsRaw ? JSON.parse(questionsRaw) : null);

        const answersRaw = await answersRes.text();
        const answerRows = answersRes.ok ? toAnswers(answersRaw ? JSON.parse(answersRaw) : null) : [];
        if (alive) {
          setQuestions(questionRows);
          setAnswersByQuestionId(new Map(answerRows.map((answer) => [answer.questionId, answer])));
          if (!answersRes.ok) {
            setAnswerWarning(parseErrorMessage(answersRaw, `โหลดคำตอบไม่สำเร็จ (${answersRes.status})`));
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (alive) setError(e instanceof Error ? e.message : "โหลดคำถามไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [coverId]);

  const grouped = useMemo(() => {
    return questions.reduce<Record<string, QuestionRow[]>>((acc, answer) => {
      if (!acc[answer.category]) acc[answer.category] = [];
      acc[answer.category].push(answer);
      return acc;
    }, {});
  }, [questions]);

  const openFile = async (fileName: string) => {
    try {
      const res = await fetch(`/api/admins/files?fileName=${encodeURIComponent(fileName)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      const url = data.url || data.presignedUrl || data.presigned_url;
      if (typeof url === "string" && url.startsWith("http")) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      throw new Error("URL ไม่ถูกต้อง");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "เปิดไฟล์ไม่สำเร็จ");
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-gray-200 shadow-sm text-black">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xl font-bold text-black">คำตอบแบบประเมินสถานประกอบการ</div>
            <div className="text-sm text-gray-600">Cover ID: {coverId}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {answerWarning && !error && (
        <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          โหลดคำถามได้แล้ว แต่ยังโหลดคำตอบ/ไฟล์ไม่ได้: {answerWarning}
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-sm text-gray-600">กำลังโหลดคำถาม...</div>
      ) : questions.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-600">ไม่พบคำถาม</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-table-xl text-left text-sm">
            <thead className="bg-gray-50 text-black">
              <tr>
                <th className="px-4 py-3 font-semibold">หมวด</th>
                <th className="px-4 py-3 font-semibold">ข้อ</th>
                <th className="px-4 py-3 font-semibold">คำถาม</th>
                <th className="px-4 py-3 font-semibold">คำตอบ</th>
                <th className="px-4 py-3 font-semibold">ไฟล์คำตอบ</th>
                <th className="px-4 py-3 font-semibold">ประเมินคะแนน</th>
                <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                <th className="px-4 py-3 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).flatMap(([category, items]) =>
                items.map((question, index) => {
                  const answer = answersByQuestionId.get(question.apiQuestionId);
                  return (
                    <tr key={`${category}-${question.apiQuestionId}`} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 font-medium text-black">{index === 0 ? category : ""}</td>
                      <td className="px-4 py-3 text-gray-800">{question.displayNo}</td>
                      <td className="px-4 py-3 text-gray-800">{question.questionText}</td>
                      <td className="px-4 py-3 text-gray-800">{answer?.selectedChoice || "-"}</td>
                      <td className="px-4 py-3">
                        {!answer || answer.fileUrls.length === 0 ? (
                          <span className="text-gray-500">-</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {answer.fileUrls.map((file) => (
                              <button
                                key={file.key}
                                type="button"
                                onClick={() => openFile(file.fileName)}
                                className="inline-flex items-center gap-1.5 text-left text-xs font-semibold text-brand hover:underline"
                              >
                                <ExternalLink size={12} />
                                {file.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">-</td>
                      <td className="px-4 py-3 text-gray-500">-</td>
                      <td className="px-4 py-3 text-gray-500">-</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
