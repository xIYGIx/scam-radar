import { NextRequest, NextResponse, after } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    let clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    if (clientIp === "::1") clientIp = "127.0.0.1";
    const deviceId = req.headers.get("x-device-id") || null;

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const textInput = (formData.get("text") as string) || "";
    const lang = (formData.get("lang") as string) || "ar";
    const isEn = lang === "en";

    const userId = (formData.get("userId") as string) || null;
    const userEmail = (formData.get("userEmail") as string) || null;

    if (!file && !textInput.trim()) {
      return NextResponse.json(
        { error: isEn ? "Please provide an image or text to analyze" : "يرجى تقديم صورة أو إدخال رابط/نص للفحص" },
        { status: 400 }
      );
    }

    let detectedType: "url" | "text" | "image" = "text";
    let fileBuffer: ArrayBuffer | null = null;
    let fileType = "image/jpeg";
    let fileName = "upload.jpg";

    if (file) {
      detectedType = "image";
      fileType = file.type || "image/jpeg";
      fileName = file.name || "upload.jpg";
      fileBuffer = await file.arrayBuffer();
    } else if (
      textInput.trim().startsWith("http://") ||
      textInput.trim().startsWith("https://") ||
      textInput.trim().includes(".com") ||
      textInput.trim().includes(".ae") ||
      textInput.trim().includes(".net") ||
      textInput.trim().includes(".org")
    ) {
      detectedType = "url";
    }

    const analysisSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        verdict: {
          type: Type.STRING,
          enum: ["SCAM", "SAFE", "SUSPICIOUS"],
          description: "SAFE for official sites and famous global platforms. SCAM for phishing. SUSPICIOUS for unknown unverified links.",
        },
        riskScore: {
          type: Type.INTEGER,
          description: "Risk score from 0 to 100",
        },
        impersonatedEntity: {
          type: Type.STRING,
          description: isEn ? "Entity name in English" : "اسم الجهة بالعربية الفصحى (مثال: منصة Kick، يوتيوب، جهة حكومية)",
        },
        extractedUrl: {
          type: Type.STRING,
          description: "Extracted URL if found, else empty",
        },
        redFlags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: isEn ? "Points in English" : "مؤشرات الفحص بالعربية الفصحى السليمة",
        },
        actionAdvice: {
          type: Type.STRING,
          description: isEn ? "Action advice in English" : "توجيه وقائي بالعربية الفصحى السليمة",
        },
      },
      required: ["verdict", "riskScore", "impersonatedEntity", "redFlags", "actionAdvice"],
    };

    const systemPrompt = isEn
      ? `You are an elite cybersecurity analyst. 
MANDATORY RULES:
1. GLOBALLY KNOWN & OFFICIAL SITES ARE SAFE: Famous platforms (like kick.com, youtube.com, twitch.tv, amazon, etc.) and official government domains (.gov.ae, .gov) are 100% AUTHENTIC and SAFE (Risk: 0-5%). DO NOT mark a famous public platform as SUSPICIOUS just because it's not a government site.
2. NATIONAL INITIATIVES: Messages about official events without asking for bank cards are strictly SAFE.
3. SCAM DEFINITION: Mark SCAM (85-100%) ONLY for actual phishing, lookalike domains (e.g., k1ck-tv.top), fake banking alerts, or credential harvesting.
4. SUSPICIOUS: Use this only for unknown short-links or weird unknown domains with no context.`
      : `أنت خبير محقق أمن سيبراني فائق الدقة.
القواعد الملزمة الصارمة:
1. المواقع العالمية المعروفة والحكومية آمنة (SAFE): المنصات الترفيهية والتجارية العالمية الشهيرة (مثل Kick.com, YouTube, Twitch, Amazon) والنطاقات الحكومية (.gov.ae) هي مواقع موثوقة 100% وتصنف دائماً (SAFE بنسبة خطورة 0-5%). يُمنع تماماً تصنيف منصة معروفة كمشبوهة لمجرد أنها ليست جهة حكومية.
2. المبادرات الوطنية: المبادرات الرسمية التي لا تطلب أموالاً أو رمز OTP تصنف (SAFE).
3. الاحتيال الفعلي (SCAM): يقتصر على مواقع التصيد، الروابط المقلدة (مثل k1ck-tv.xyz)، وطلبات سرقة البيانات البنكية.
4. المحتوى المشبوه (SUSPICIOUS): يقتصر فقط على الروابط المختصرة المجهولة جداً التي لا يمكن التحقق منها.`;

    const parts: any[] = [{ text: systemPrompt }];

    if (textInput.trim()) {
      parts.push({ text: `Content to analyze:\n"""\n${textInput.trim()}\n"""` });
    }

    if (file && fileBuffer) {
      const base64Data = Buffer.from(fileBuffer).toString("base64");
      parts.push({
        inlineData: {
          mimeType: fileType,
          data: base64Data,
        },
      });
    }

    // تم إزالة thinkingConfig بالكامل لمنع الخطأ 400
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
        maxOutputTokens: 600,
      },
    });

    const result = JSON.parse(response.text || "{}");
    const verdictDb = result.verdict === "SUSPICIOUS" ? "warning" : (result.verdict?.toLowerCase() || "safe");
    const scoreDb = typeof result.riskScore === "number" ? result.riskScore : 0;

    after(async () => {
      try {
        let publicImageUrl: string | null = null;
        if (file && fileBuffer) {
          const fileExt = fileName.split(".").pop() || "jpg";
          const filePath = `scans/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from("avatars")
            .upload(filePath, fileBuffer, { contentType: fileType, upsert: true });

          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
            publicImageUrl = urlData.publicUrl;
          }
        }

        await Promise.all([
          supabase.from("scans").insert([
            {
              user_id: userId,
              type: detectedType,
              input: textInput.trim() || publicImageUrl || (file ? "صورة مرفوعة" : "فحص"),
              input_content: textInput.trim() || null,
              input_type: detectedType,
              image_url: publicImageUrl,
              verdict: verdictDb,
              score: scoreDb,
              client_ip: clientIp,
              device_id: deviceId,
            },
          ]),
          supabase.from("system_audit_logs").insert([
            {
              event_type: "SCAN_PERFORMED",
              details: `فحص (${detectedType}) - النتيجة: ${result.verdict} (${scoreDb}%)`,
              ip_address: clientIp,
              user_email: userEmail || "زائر (Guest)",
            },
          ]),
        ]);
      } catch (bgError) {
        console.error("Background task error:", bgError);
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: "فشل إتمام عملية الفحص" }, { status: 500 });
  }
}