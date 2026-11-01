"use client";

import { Mail, User, ArrowUpRight } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function DirectContactPage() {
  const { isAr } = useLanguage();

  return (
    <div className="py-12 px-4 max-w-xl mx-auto w-full space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">{isAr ? "التواصل المباشر" : "Direct Contact"}</h1>
        <p className="text-slate-400 text-sm">{isAr ? "تواصل معي شخصياً للرد السريع عبر قنواتي المباشرة" : "Reach out to me personally for quick responses"}</p>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">{isAr ? "يوسف ال علي" : "Yousef Al Ali"}</h2>
            <p className="text-xs text-slate-400">{isAr ? "مطور ومؤسس المنصة" : "Platform Founder & Developer"}</p>
          </div>
        </div>

        <div className="space-y-3">
          <a href="mailto:xIYGIxBusiness@outlook.com" className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500 flex items-center justify-between group transition">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <div className="text-start">
                <p className="text-[10px] text-slate-400">{isAr ? "البريد الإلكتروني المباشر" : "Direct Email Address"}</p>
                <p className="text-xs font-mono font-semibold text-white">xIYGIxBusiness@outlook.com</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
          </a>
        </div>
      </div>
    </div>
  );
}