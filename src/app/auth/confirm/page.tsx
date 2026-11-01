"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "../../LanguageContext";
import { supabase } from "@/lib/supabase";

export default function ConfirmPage() {
  const { isAr } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التقاط جلسة الدخول وتأكيد تفعيلها فور فتح الرابط
    const verifySession = async () => {
      await supabase.auth.getSession();
      setLoading(false);
    };
    verifySession();
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 relative z-10">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 p-8 rounded-3xl backdrop-blur-md text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">
            {isAr ? "تم تأكيد حسابك بنجاح! 🎉" : "Account Confirmed! 🎉"}
          </h1>
          <p className="text-sm text-slate-400">
            {isAr 
              ? "تم التحقق من بريدك الإلكتروني وتنشيط حسابك بالكامل. يمكنك الآن بدء استخدام الفاحص فوراً." 
              : "Your email has been verified and your account is active. You can now use the scanner directly."}
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 text-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? "الانتقال إلى الفاحص والبدء الآن" : "Go to Scanner Now"}</span>
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </Link>
        </div>
      </div>
    </div>
  );
}