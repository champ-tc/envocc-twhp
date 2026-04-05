"use client";

import React, { useEffect, useState } from "react";
import { useAdminAuth } from "@/components/AdminLayout";

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

function normalize(raw: unknown): Factory[] {
  if (Array.isArray(raw)) return raw as Factory[];
  if (raw && typeof raw === "object") {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data as Factory[];
  }
  return [];
}

export default function EstablishmentListPage() {
  const { user, isLoading: isAuthLoading } = useAdminAuth();

  const [rows, setRows] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (user.provinceId) {
        params.append("provinceId", String(user.provinceId));
      }

      if (user.region) {
        params.append("region", String(user.region));
      }

      const role = String(user.role || "").toLowerCase();
      const evalLevel = String(user.eval_level || "").toLowerCase();

      let apiUrl = "/api/admins/factories-list/factories/enrolls";

      // level จังหวัด
      if (
        evalLevel === "provincial" ||
        evalLevel === "province" ||
        role === "provincial" ||
        role === "provicial"
      ) {
        apiUrl = "/api/admins/factories-list/provincialOfficers/enrolls";
      }
      // level evaluator
      else if (evalLevel === "evaluator" || role === "evaluator") {
        apiUrl = "/api/admins/factories-list/factories/enrolls";
      }

      const query = params.toString();
      const res = await fetch(query ? `${apiUrl}?${query}` : apiUrl, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

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
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isAuthLoading || !user) return null;

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 text-gray-900">
      <div className="p-5 md:p-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-gray-900">
              รายการสถานประกอบการทั้งหมด
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold border bg-white text-gray-900 border-gray-300 hover:bg-gray-50 disabled:opacity-60"
              onClick={() => loadList()}
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
              </tr>
            </thead>

            <tbody className="bg-white text-gray-900">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-700">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-700">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.account_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-b border-gray-200">
                      <div className="font-semibold text-gray-900">
                        {r.name_th || "-"}
                      </div>
                      <div className="text-xs text-gray-700">
                        {r.name_en || "-"} • TSIC {r.tsic_code || "-"} • บัญชี{" "}
                        {r.account_id}
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
                      <div className="text-gray-900">โทร {r.phone_number || "-"}</div>
                      <div className="text-gray-700">แฟกซ์ {r.fax_number || "-"}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}