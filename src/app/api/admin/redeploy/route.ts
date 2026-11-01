import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// التحقق الأمني: حصر الصلاحية ببريدك الشخصي فقط كمالك
const OWNER_EMAIL = "youssef.bumoza@gmail.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 1. حاجز أمني صارم: رفض أي طلب لا يصدر عن بريد المالك
    if (!email || email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "غير مصرح لك بتنفيذ هذا الإجراء." }, { status: 403 });
    }

    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!token || !projectId) {
      return NextResponse.json(
        { error: "إعدادات Vercel Token أو Project ID غير متوفرة." },
        { status: 500 }
      );
    }

    // 2. جلب أحدث نشر للإنتاج (Latest Deployment) لنسخ بيئة العمل
    const deploymentsRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const deploymentsData = await deploymentsRes.json();
    const latestDeployment = deploymentsData.deployments?.[0];

    if (!latestDeployment) {
      return NextResponse.json({ error: "لم يتم العثور على آخر Deployment لإعادة بنائه." }, { status: 404 });
    }

    // 3. إطلاق أمر إعادة البناء الفوري (Redeploy)
    const redeployRes = await fetch(
      `https://api.vercel.com/v13/deployments?projectId=${projectId}&forceNew=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: latestDeployment.name,
          deploymentId: latestDeployment.uid,
          target: "production",
        }),
      }
    );

    if (!redeployRes.ok) {
      const errDetail = await redeployRes.json();
      return NextResponse.json({ error: errDetail.error?.message || "فشل إطلاق إعادة التشغيل في Vercel" }, { status: 500 });
    }

    // 4. توثيق العملية فورياً في سجل الأحداث (Audit Logs)
    await supabase.from("system_audit_logs").insert([
      {
        event_type: "REDEPLOY",
        details: "تم تنفيذ إعادة تشغيل وبناء الموقع بضغطة زر من لوحة الإدارة.",
        user_email: email,
      },
    ]);

    return NextResponse.json({ success: true, message: "تم إطلاق عملية إعادة بناء وتشغيل الموقع بنجاح." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}