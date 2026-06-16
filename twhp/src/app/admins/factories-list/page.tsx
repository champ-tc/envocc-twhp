"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAdminAuth } from "@/components/AdminLayout";
import SearchableSelect from "@/components/SearchableSelect";

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

type ProvinceApi = { province_id: number; name_th: string };

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

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | "">("");

  // Load Provinces (for filtering)
  useEffect(() => {
    if (!user || user.role !== "DOED") return;
    (async () => {
      try {
        const res = await fetch("/api/location/provinces");
        if (res.ok) {
          const data = await res.json();
          setProvinces(data);
        }
      } catch (err) {
        console.error("Failed to load provinces", err);
      }
    })();
  }, [user]);

  async function loadList() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (user.provinceId) {
        params.append("provinceId", String(user.provinceId));
      } else if (selectedProvinceId) {
        params.append("provinceId", String(selectedProvinceId));
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
      const res = await fetch(query ? `${apiUrl}?${query}&validated=true` : `${apiUrl}?validated=true`, {
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
  }, [user, selectedProvinceId]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const kw = searchTerm.toLowerCase();
    return rows.filter((r) => {
      const name = (r.name_th || r.name_en || "").toLowerCase();
      const addr = `${r.address_no || ""} ${r.road || ""} ${r.subdistrict_name_th || ""} ${r.district_name_th || ""} ${r.province_name_th || ""}`.toLowerCase();
      const account = String(r.account_id);
      const tsic = r.tsic_code || "";
      return name.includes(kw) || addr.includes(kw) || account.includes(kw) || tsic.includes(kw);
    });
  }, [rows, searchTerm]);

  if (isAuthLoading || !user) return null;

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 text-gray-900">
      <div className="p-5 md:p-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold text-gray-900">
              จัดการสถานประกอบการ
            </div>
            <div className="text-sm text-gray-600">
              รายชื่อสถานประกอบการที่ได้รับการอนุมัติบัญชีแล้ว
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user.role === "DOED" && (
              <div className="w-64">
                <SearchableSelect
                  options={provinces.map((p) => ({ id: p.province_id, label: p.name_th }))}
                  value={selectedProvinceId}
                  placeholder="กรองตามจังหวัด (ทั้งหมด)"
                  onChange={(v) => setSelectedProvinceId(v === "" ? "" : Number(v))}
                />
              </div>
            )}
            
            <input
              type="text"
              placeholder="ค้นหา: ชื่อ / เลขบัญชี / ที่อยู่..."
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold border bg-white text-gray-900 border-gray-300 hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
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
          <table className="min-w-table-lg w-full text-sm">
            <thead className="bg-gray-50 text-gray-900">
              <tr>
                <th className="px-4 py-3 text-left border-b border-gray-200 w-1/3">
                  ชื่อสถานประกอบการ
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-200">
                  ที่อยู่
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-200">
                  ติดต่อ
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200">
                  สถานะบัญชี
                </th>
              </tr>
            </thead>

            <tbody className="bg-white text-gray-900">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    ไม่พบข้อมูลสถานประกอบการ
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.account_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 border-b border-gray-100">
                      <div className="font-bold text-gray-900">
                        {r.name_th || "-"}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {r.name_en || "-"}
                      </div>
                      <div className="mt-1 flex gap-2">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xxs font-semibold">
                          TSIC {r.tsic_code || "-"}
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xxs font-semibold">
                          ID {r.account_id}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 border-b border-gray-100 text-xs text-gray-800 leading-relaxed">
                      {r.address_no || "-"} {r.soi ? `ซ.${r.soi}` : ""}{" "}
                      {r.road ? `ถ.${r.road}` : ""}
                      <div className="text-gray-600">
                        ต.{r.subdistrict_name_th || "-"} อ.{r.district_name_th || "-"}
                      </div>
                      <div className="font-medium text-gray-900">
                        จ.{r.province_name_th || "-"} {r.zipcode || ""}
                      </div>
                    </td>

                    <td className="px-4 py-4 border-b border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-gray-500 w-8">โทร:</span>
                        <span className="text-gray-900 font-medium">{r.phone_number || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 w-8">แฟกซ์:</span>
                        <span className="text-gray-900 font-medium">{r.fax_number || "-"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 border-b border-gray-100 text-center">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        อนุมัติแล้ว
                      </span>
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