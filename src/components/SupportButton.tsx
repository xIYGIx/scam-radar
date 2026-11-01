"use client";

import { useState } from "react";
import { Coffee, Heart, ExternalLink, X } from "lucide-react";
import { useLanguage } from "@/app/LanguageContext";

export default function SupportButton({ 
  variant = "floating" 
}: { 
  variant?: "floating" | "drawer" | "footer" 
}) {
  const { isAr } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // رابط صفحة الدعم الرسمية للمنصة عبر Ko-fi
  const donationUrl = "https://ko-fi.com/scamradar_ae"; 

  // 1. الزر العائم في الزاوية السفلية للكمبيوتر
  if (variant === "floating") {
    return (
      <>
        <div className="fixed bottom-6 start-6 z-40 hidden sm:block">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 border border-amber-500/40 text-amber-400 font-bold text-xs shadow-xl shadow-amber-500/10 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-amber-400"
          >
            <span className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:rotate-12 transition-transform">
              <Coffee className="w-4 h-4" />
            </span>
            <span className="text-white group-hover:text-amber-300 transition-colors">
              {isAr ? "ادعم استمرار المنصة" : "Support Scam Radar"}
            </span>
          </button>
        </div>

        {isOpen && <SupportModal isAr={isAr} onClose={() => setIsOpen(false)} donationUrl={donationUrl} />}
      </>
    );
  }

  // 2. زر القائمة الجانبية للهواتف (Mobile Drawer)
  if (variant === "drawer") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/25 text-amber-300 font-bold text-sm transition active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{isAr ? "ادعم استمرار المشروع" : "Support Project"}</p>
              <p className="text-[11px] text-amber-400/80 font-normal">{isAr ? "ساهم في تكاليف السيرفرات ☕" : "Help cover server costs"}</p>
            </div>
          </div>
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400/30" />
        </button>

        {isOpen && <SupportModal isAr={isAr} onClose={() => setIsOpen(false)} donationUrl={donationUrl} />}
      </>
    );
  }

  // 3. شكل الرابط في الفوتر
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 text-xs text-amber-400/90 hover:text-amber-300 font-semibold transition"
      >
        <Coffee className="w-3.5 h-3.5" />
        <span>{isAr ? "ادعم المنصة بكوب قهوة ☕" : "Buy us a coffee"}</span>
      </button>

      {isOpen && <SupportModal isAr={isAr} onClose={() => setIsOpen(false)} donationUrl={donationUrl} />}
    </>
  );
}

function SupportModal({ isAr, onClose, donationUrl }: { isAr: boolean; onClose: () => void; donationUrl: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl space-y-5 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Coffee className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-white">
            {isAr ? "ادعم استمرار رادار الاحتيال" : "Support Scam Radar"}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isAr 
              ? "المنصة مجانية 100% ومستقلة تماماً. مساهمتك الرمزية تغطي تكاليف الخوادم ومعالجة الذكاء الاصطناعي." 
              : "This tool is 100% free and independent. A small tip helps maintain AI servers and security engines."}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href={donationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Coffee className="w-4 h-4" />
            <span>{isAr ? "الانتقال لصفحة الدعم الآمنة" : "Proceed to Support Page"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            {isAr ? "ربما لاحقاً" : "Maybe later"}
          </button>
        </div>
      </div>
    </div>
  );
}