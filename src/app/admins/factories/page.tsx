"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

type AuthUser = {
  id: number;
  role: string;
  username: string;
  fullName: string;
  establishment: string;
};

type AuthResponse = { isLoggedIn: boolean; user: AuthUser };
type Filter = "pending" | "approved";

type Factory = {
  account_id: number;
  factory_type: number;
  name_th: string;
  name_en: string;
  tsic_code: string;
  address_no: string;
  soi: string;
  road: string;
  zipcode: string;
  phone_number: string;
  fax_number: string;
  is_validate?: boolean;
  is_validated?: boolean;
  province_name_th?: string;
  district_name_th?: string;
  subdistrict_name_th?: string;
};

const ADMIN_ROLES = ["Provincial", "Evaluator", "DOED", "Provicial"] as const;

const approvedOf = (r: Factory) => Boolean(r.is_validated ?? r.is_validate);

function normalize(raw: unknown): Factory[] {
  if (Array.isArray(raw)) return raw as Factory[];
  if (raw && typeof raw === "object") {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data as Factory[];
  }
  return [];
}

export default function AdminFactoriesPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // ---------- auth ----------
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch("/api/auth/authentication", {
          credentials: "include",
          cache: "no-store",
        });

        if (!r.ok) throw new Error(await r.text());
        const d = (await r.json()) as AuthResponse;

        if (!d?.isLoggedIn || !d.user) throw new Error("Unauthorized");

        const isAdmin = (ADMIN_ROLES as readonly string[]).includes(
          d.user.role,
        );
        if (!isAdmin) {
          // ไม่ใช่ role ที่อนุญาตให้อนุมัติ
          router.replace("/admins/dashboard");
          return;
        }

        if (alive) setUser(d.user);
      } catch {
        router.replace("/");
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  // ---------- load list ----------
  async function loadList(next: Filter = filter) {
    setLoading(true);
    setError(null);

    try {
      const validated = next === "approved" ? "true" : "false";
      const res = await fetch(`/api/admins/factories?validated=${validated}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());
      setRows(normalize(await res.json()));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadList(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user]);

  // ---------- approve ----------
  async function approve(accountId: number) {
    const ok = window.confirm(
      "ยืนยันว่าต้องการอนุมัติสถานประกอบการนี้หรือไม่?",
    );
    if (!ok) return;

    setUpdating((p) => ({ ...p, [accountId]: true }));

    try {
      const res = await fetch(`/api/admins/factories/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          account_id: accountId,
          is_validate: "true", // ✅ backend ต้องการ boolean string
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      window.alert("อนุมัติสถานประกอบการเรียบร้อยแล้ว");
      setRows((prev) => prev.filter((r) => r.account_id !== accountId));
    } catch (e) {
      window.alert(
        e instanceof Error
          ? `อนุมัติไม่สำเร็จ\n${e.message}`
          : "อนุมัติไม่สำเร็จ",
      );
    } finally {
      setUpdating((p) => {
        const n = { ...p };
        delete n[accountId];
        return n;
      });
    }
  }

  if (isLoading) return <div className="p-10 text-black">Loading...</div>;
  if (!user) return null;

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-semibold border ${
      active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
    }`;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F3F6F4]">
        <Navbar
          title="อนุมัติสถานประกอบการ"
          fullName={user.fullName}
          userRole={user.role}
          establishment={user.establishment}
          username={user.username}
        />

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="bg-white rounded-2xl shadow border border-gray-200">
            <div className="p-5 md:p-6 border-b border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    รายการสถานประกอบการ
                  </div>
                  <div className="text-sm text-gray-700">
                    แสดงรายการ:{" "}
                    <span className="font-semibold">
                      {filter === "pending" ? "รออนุมัติ" : "อนุมัติแล้ว"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className={tabClass(filter === "pending")}
                    onClick={() => setFilter("pending")}
                    disabled={loading}
                    type="button"
                  >
                    รออนุมัติ
                  </button>
                  <button
                    className={tabClass(filter === "approved")}
                    onClick={() => setFilter("approved")}
                    disabled={loading}
                    type="button"
                  >
                    อนุมัติแล้ว
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold border bg-white text-gray-900 border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                    onClick={() => loadList(filter)}
                    disabled={loading}
                    type="button"
                  >
                    {loading ? "กำลังโหลด..." : "รีเฟรช"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="p-5 md:p-6">
              <div className="overflow-auto border border-gray-200 rounded-xl">
                <table className="min-w-[1000px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left border-b border-gray-200">
                        ชื่อสถานประกอบการ
                      </th>
                      <th className="px-4 py-3 text-left border-b border-gray-200">
                        ที่อยู่
                      </th>
                      <th className="px-4 py-3 text-left border-b border-gray-200">
                        ติดต่อ
                      </th>
                      <th className="px-4 py-3 text-left border-b border-gray-200">
                        สถานะ/การทำงาน
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white text-gray-900">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-gray-700">
                          กำลังโหลดข้อมูล...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-gray-700">
                          ไม่พบข้อมูล
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => {
                        const approved = approvedOf(r);
                        const showApproveBtn =
                          filter === "pending" && !approved;

                        return (
                          <tr key={r.account_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 border-b border-gray-200">
                              <div className="font-semibold text-gray-900">
                                {r.name_th || "-"}
                              </div>
                              <div className="text-xs text-gray-700">
                                {r.name_en || "-"} • TSIC {r.tsic_code || "-"} •
                                บัญชี {r.account_id}
                              </div>
                            </td>

                            <td className="px-4 py-3 border-b border-gray-200 text-xs text-gray-900">
                              {r.address_no || "-"} {r.soi ? `ซ.${r.soi}` : ""}{" "}
                              {r.road ? `ถ.${r.road}` : ""}
                              <div className="text-xs text-gray-700 mt-1">
                                ต.{r.subdistrict_name_th || "-"} อ.
                                {r.district_name_th || "-"} จ.
                                {r.province_name_th || "-"} {r.zipcode || ""}
                              </div>
                            </td>

                            <td className="px-4 py-3 border-b border-gray-200 text-xs">
                              <div className="text-gray-900">
                                โทร {r.phone_number || "-"}
                              </div>
                              <div className="text-gray-700">
                                แฟกซ์ {r.fax_number || "-"}
                              </div>
                            </td>

                            <td className="px-4 py-3 border-b border-gray-200">
                              {approved ? (
                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                  อนุมัติแล้ว
                                </span>
                              ) : (
                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                                  รออนุมัติ
                                </span>
                              )}

                              {showApproveBtn && (
                                <div className="mt-2">
                                  <button
                                    className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-60"
                                    disabled={!!updating[r.account_id]}
                                    onClick={() => approve(r.account_id)}
                                    type="button"
                                  >
                                    {updating[r.account_id]
                                      ? "กำลังบันทึก..."
                                      : "อนุมัติ"}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
