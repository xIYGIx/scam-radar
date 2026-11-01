"use client";

import { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, 
  UploadCloud, 
  Share2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Link2, 
  Image as ImageIcon,
  History 
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "./LanguageContext";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

interface AnalysisResult {
  verdict: "SCAM" | "SAFE" | "SUSPICIOUS";
  riskScore: number;
  impersonatedEntity: string;
  extractedUrl?: string;
  redFlags: string[];
  actionAdvice: string;
  timestamp?: string;
}

// دالة ضغط الصور محلياً في المتصفح قبل الإرسال (تخفض الحجم من 8MB إلى ~150KB لتسريع الفحص)
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.size < 250 * 1024) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1080;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".jpg"),
                {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }
              );
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function Home() {
  const { isAr } = useLanguage();
  const [tab, setTab] = useState<"image" | "text">("image");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (tab !== "image") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleImageSelect(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [tab]);

  const handleImageSelect = (file: File) => {
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const saveToLocalHistory = (item: AnalysisResult) => {
    try {
      const record = { ...item, timestamp: new Date().toLocaleString(isAr ? "ar-AE" : "en-US") };
      const generalKey = "scam_radar_history";
      const existing = JSON.parse(localStorage.getItem(generalKey) || "[]");
      localStorage.setItem(generalKey, JSON.stringify([record, ...existing.slice(0, 19)]));
    } catch (e) {
      console.error("Error saving scan to local storage:", e);
    }
  };

  const handleAnalyze = async () => {
    if (tab === "image" && !image) return;
    if (tab === "text" && !textContent.trim()) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append("lang", isAr ? "ar" : "en");

      if (session?.user) {
        formData.append("userId", session.user.id);
        formData.append("userEmail", session.user.email || "");
      }

      if (tab === "image" && image) {
        // ضغط الصورة فوراً لتقليص حجمها وسرعة رفعها ومعالجتها
        const optimizedImage = await compressImage(image);
        formData.append("image", optimizedImage);
      } else if (tab === "text") {
        formData.append("text", textContent);
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "x-device-id": getDeviceId(),
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        saveToLocalHistory(data);
      } else {
        alert(data.error || (isAr ? "تعذر إتمام الفحص" : "Analysis failed"));
      }
    } catch {
      alert(isAr ? "فشل الاتصال بالخادم" : "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setImage(null);
    setPreview(null);
    setTextContent("");
    setResult(null);
  };

  const handleShare = () => {
    if (!result) return;
    const text = isAr 
      ? `🚨 رادار كشف الاحتيال:\nالموضوع: ${result.impersonatedEntity}\nالتقييم: ${result.verdict}\nنسبة الخطورة: ${result.riskScore}%\nالنصيحة: ${result.actionAdvice}`
      : `🚨 Scam Radar Alert:\nSubject: ${result.impersonatedEntity}\nVerdict: ${result.verdict}\nRisk Score: ${result.riskScore}%\nAdvice: ${result.actionAdvice}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="py-8 sm:py-14 px-4 max-w-xl mx-auto w-full space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          {isAr ? "رادار كشف الاحتيال" : "AI Scam Detector"}
        </h1>
        <p className="text-slate-400 text-sm">
          {isAr ? "ارفع لقطة شاشة أو اكتب الرابط واعرف حقيقته في لحظات" : "Upload a screenshot or paste a link to verify instantly"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          onClick={() => { setTab("image"); setResult(null); }}
          className={`py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
            tab === "image" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ImageIcon className="w-4 h-4" /> {isAr ? "فحص صورة" : "Scan Image"}
        </button>
        <button
          onClick={() => { setTab("text"); setResult(null); }}
          className={`py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
            tab === "text" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Link2 className="w-4 h-4" /> {isAr ? "فحص رابط / نص" : "Scan Link / Text"}
        </button>
      </div>

      {tab === "image" && (
        <div>
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  handleImageSelect(file);
                }
              }}
              className={`border-2 border-dashed ${
                isDragging 
                  ? "border-blue-500 bg-blue-500/10 scale-[1.01]" 
                  : "border-slate-800 hover:border-slate-600 bg-slate-900/60"
              } rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
                isDragging ? "bg-blue-600 text-white scale-110" : "bg-slate-800 text-slate-400"
              }`}>
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-slate-200 text-sm">
                  {isDragging 
                    ? (isAr ? "أفلت الصورة هنا لرفعها فوراً!" : "Drop image here to upload!") 
                    : (isAr ? "اضغط لرفع لقطة الشاشة أو اسحبها هنا" : "Click or drag screenshot here")}
                </p>
                <p className="text-xs text-slate-500">{isAr ? "يدعم السحب والإفلات واللصق المباشر (Ctrl + V)" : "Supports drag & drop and pasting (Ctrl + V)"}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex justify-center max-h-72">
                <img src={preview} alt="Upload" className="object-contain w-full h-full" />
                <button
                  onClick={resetAll}
                  className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur p-2 rounded-full hover:bg-slate-800 transition"
                  title="Change"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "text" && (
        <div className="space-y-3">
          <textarea
            rows={4}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder={isAr ? "الصق الرابط أو نص الرسالة هنا..." : "Paste suspicious link or message text here..."}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
          />
        </div>
      )}

      {((tab === "image" && preview) || (tab === "text" && textContent.trim())) && !result && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 text-white"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" /> {isAr ? "جاري الفحص بمحرك الذكاء الاصطناعي..." : "Analyzing with AI engine..."}
            </>
          ) : (
            isAr ? "افحص المحتوى الآن" : "Verify Content Now"
          )}
        </button>
      )}

      {result && (
        <div
          className={`rounded-2xl p-6 border transition-all ${
            result.verdict === "SCAM"
              ? "bg-red-950/20 border-red-500/40 text-red-200"
              : result.verdict === "SUSPICIOUS"
              ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
              : "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
            <div className="flex items-center gap-3">
              {result.verdict === "SCAM" && <XCircle className="w-8 h-8 text-red-500" />}
              {result.verdict === "SUSPICIOUS" && <AlertTriangle className="w-8 h-8 text-amber-500" />}
              {result.verdict === "SAFE" && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              <div>
                <h2 className="text-lg font-bold">
                  {result.verdict === "SCAM" && (isAr ? "احتيال مؤكد ❌" : "Confirmed Scam ❌")}
                  {result.verdict === "SUSPICIOUS" && (isAr ? "محتوى مشبوه ⚠️" : "Suspicious Content ⚠️")}
                  {result.verdict === "SAFE" && (isAr ? "رسمي وآمن ✅" : "Safe & Authentic ✅")}
                </h2>
                <p className="text-xs text-slate-400">{isAr ? "الجهة:" : "Entity:"} {result.impersonatedEntity}</p>
              </div>
            </div>
            <div className="font-mono text-xs px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
              {isAr ? `خطر: ${result.riskScore}%` : `Risk: ${result.riskScore}%`}
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isAr ? "مؤشرات الفحص:" : "Analysis Red Flags:"}</h3>
            <ul className="space-y-2">
              {result.redFlags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-blue-400 font-bold">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 text-slate-200 text-sm mb-5">
            <span className="font-bold text-white block mb-1">{isAr ? "ماذا تفعل الآن؟" : "Recommended Action:"}</span>
            {result.actionAdvice}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Share2 className="w-4 h-4" />
              {copied ? (isAr ? "تم النسخ!" : "Copied!") : (isAr ? "تنبيه الأهل" : "Share Alert")}
            </button>
            <button
              onClick={resetAll}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold border border-slate-800 transition"
            >
              {isAr ? "فحص جديد" : "New Scan"}
            </button>
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <Link href="/history" className="text-xs text-slate-400 hover:text-blue-400 inline-flex items-center gap-1.5 transition">
          <History className="w-3.5 h-3.5" />
          {isAr ? "مراجعة الفحوصات السابقة المحفوظة في خزينتك" : "View your encrypted scan history"}
        </Link>
      </div>
    </div>
  );
}