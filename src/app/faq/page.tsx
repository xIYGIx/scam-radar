"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function FAQPage() {
  const { isAr } = useLanguage();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = isAr ? [
    { q: "كيف يستطيع الرادار اكتشاف رسائل الاحتيال بدقة؟", a: "يعتمد الرادار على نماذج متقدمة لتحليل هندسة الروابط، ورصد أساليب التهديد أو التسرع المالي المصممة لخداع المستخدمين." },
    { q: "هل يتم تخزين صوري على خوادم خارجية؟", a: "إطلاقاً. تتم معالجة الصور لحظياً وتُحذف فوراً. أي سجل تحفظه يظل داخل حسابك الآمن." },
    { q: "ماذا أفعل إذا اكتشف الرادار أن الرسالة احتيال؟", a: "تجنب النقر على الرابط، لا تشارك رموز (OTP)، وقم بحظر الرقم فوراً." }
  ] : [
    { q: "How does the Radar detect scams accurately?", a: "It uses advanced models to analyze domain structures, psychological threats, and financial urgency designed to deceive users." },
    { q: "Are my photos stored on external servers?", a: "Absolutely not. Images are processed in real-time memory and deleted instantly. Your history is safely encrypted in your account." },
    { q: "What should I do if a message is flagged as a scam?", a: "Avoid clicking links, never share OTPs, and block the sender immediately." }
  ];

  return (
    <div className="py-12 px-4 max-w-2xl mx-auto w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mx-auto"><HelpCircle className="w-5 h-5" /></div>
        <h1 className="text-3xl font-black">{isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h1>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl transition">
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full p-4 flex items-center justify-between font-bold text-sm text-slate-200">
              <span className="text-start">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openIdx === i ? "rotate-180 text-blue-400" : ""}`} />
            </button>
            {openIdx === i && <div className="p-4 pt-0 text-xs sm:text-sm text-slate-400">{faq.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}