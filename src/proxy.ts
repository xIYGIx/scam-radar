import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ذاكرة مؤقتة لمراقبة سرعة الطلبات (Rate Limiting)
const rateLimitMap = new Map<string, { count: number; firstRequestTime: number }>();

// الحد الأقصى: 15 فحصاً في الدقيقة
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 15;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. استخراج الـ IP وتوحيد صيغة اللوكال هوست في ويندوز
  const forwardedFor = request.headers.get("x-forwarded-for");
  let ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  if (ip === "::1") ip = "127.0.0.1";

  const deviceId = request.headers.get("x-device-id");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 2. تطبيق الحظر فقط على مسار الفحص المباشر (/api/analyze)
  if (pathname === "/api/analyze" && supabaseUrl && supabaseKey) {
    try {
      let banQueryUrl = `${supabaseUrl}/rest/v1/banned_ips?select=id,reason`;
      if (deviceId) {
        banQueryUrl += `&or=(ip_address.eq.${ip},device_id.eq.${deviceId})`;
      } else {
        banQueryUrl += `&ip_address.eq.${ip}`;
      }

      const checkBanRes = await fetch(banQueryUrl, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      });

      const bannedData = await checkBanRes.json();

      if (Array.isArray(bannedData) && bannedData.length > 0) {
        return new NextResponse(
          JSON.stringify({
            error: `تم حظر هذا الجهاز أو الـ IP من الفحص: ${bannedData[0].reason}`,
          }),
          { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    } catch {
      // تفادي إيقاف السيرفر في حال تعطل الاتصال اللحظي
    }

    // 3. مراقبة الاستنزاف التلقائي
    const trackingKey = deviceId ? `${ip}_${deviceId}` : ip;
    const now = Date.now();
    const rateData = rateLimitMap.get(trackingKey) || { count: 0, firstRequestTime: now };

    if (now - rateData.firstRequestTime > RATE_LIMIT_WINDOW) {
      rateData.count = 1;
      rateData.firstRequestTime = now;
    } else {
      rateData.count += 1;
    }

    rateLimitMap.set(trackingKey, rateData);

    if (rateData.count > MAX_REQUESTS) {
      fetch(`${supabaseUrl}/rest/v1/banned_ips`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({
          ip_address: ip,
          device_id: deviceId || null,
          reason: "حظر تلقائي: تجاوز 15 فحصاً بالدقيقة",
          is_automatic: true,
        }),
      }).catch(() => {});

      return new NextResponse(
        JSON.stringify({
          error: "تم تجاوز معدل الفحص المسموح به. تم حظر جهازك مؤقتاً لحماية الموارد.",
        }),
        { status: 429, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
  }

  return NextResponse.next();
}

// حصر المراقبة الصارم على مسار الفحص فقط دون لمس لوحة الإدارة
export const config = {
  matcher: ["/api/analyze"],
};