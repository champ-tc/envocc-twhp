import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    if (!API_BASE_URL) return jsonErr("Missing API_BASE_URL", 500);

    const { searchParams } = new URL(req.url);
    const validated = searchParams.get("validated");
    const enrolled = searchParams.get("enrolled");

    // fallback param for detail
    const factoryId =
      searchParams.get("factory_id") ||
      searchParams.get("factoryId") ||
      searchParams.get("id") ||
      searchParams.get("account_id"); // ✅ เผื่อระบบคุณใช้ชื่ออื่น

    const cookieHeader = req.headers.get("cookie") || "";

    // =========================================================
    // A) LIST: approved + enrolled
    // GET /api/admins/enrolls?validated=true&enrolled=true
    // -> backend: /admins/factories?validated=true&enrolled=true
    // =========================================================
    if (validated !== null || enrolled !== null) {
      if (validated !== "true" || enrolled !== "true") {
        return jsonErr("Only validated=true & enrolled=true is allowed", 400);
      }

      const targetUrl = `${API_BASE_URL}/admins/factories?validated=true&enrolled=true`;

      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { message: text || "Backend error" },
          { status: res.status },
        );
      }

      // รองรับกรณี backend ส่งเป็น JSON หรืออย่างอื่น
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { message: "Backend did not return JSON", raw: text },
          { status: 502 },
        );
      }

      const data = await res.json();
      return NextResponse.json(data, { status: 200 });
    }

    // =========================================================
    // B) DETAIL: enrolls by factory id
    // GET /api/admins/enrolls?factory_id=123
    // -> backend: /admins/enrolls?factory_id=123
    // =========================================================
    if (factoryId) {
      // ❗ถ้า backend ของคุณใช้ param ชื่ออื่น เช่น /admins/enrolls?id=xxx
      // ให้แก้ query string ตรงนี้
      const targetUrl = `${API_BASE_URL}/admins/enrolls?factory_id=${encodeURIComponent(
        factoryId,
      )}`;

      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { message: text || "Backend error" },
          { status: res.status },
        );
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { message: "Backend did not return JSON", raw: text },
          { status: 502 },
        );
      }

      const data = await res.json();

      let result = data;
      // ถ้า backend return เป็น array ให้ลอง filter หาตัวที่ id ตรง
      if (Array.isArray(data)) {
        // console.log(`[API] /admins/enrolls factory_id=${factoryId} got array length=${data.length}`);

        // Filter strictly by factory_id to avoid matching enrollment ID (pk)
        const found = data.find((item: any) =>
          String(item.factory_id) === String(factoryId) ||
          String(item.factoryId) === String(factoryId)
        );

        if (found) {
          result = found;
        } else if (data.length > 0) {
          console.warn(`[API] /admins/enrolls factory_id=${factoryId} not found in array, using first item`);
          result = data[0];
          console.log(`data:`, data);
          // console.log(`[API] First item IDs: id=${result.id}, factory_id=${result.factory_id}, account_id=${result.account_id}, factoryId=${result.factoryId}`);
        }
      } else {
        // Object returned, assume it is correct
      }

      return NextResponse.json(result, { status: 200 });
    }

    return jsonErr(
      "Missing query. Use either ?validated=true&enrolled=true OR ?factory_id=<id>",
      400,
    );
  } catch (error) {
    console.error("API /api/admins/enrolls error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
