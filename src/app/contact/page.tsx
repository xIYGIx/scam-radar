"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function ContactPage() {
  const { isAr } = useLanguage();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // مفتاح الربط التلقائي الخاص بك
    formData.append("access_key", "81de4e96-e7bc-4589-a204-53534e7b3510");
    formData.append("subject", "بلاغ جديد من منصة Scam Radar");
    formData.append("from_name", "Scam Radar Alert System");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });
      
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="py-12 px-4 max-w-2xl mx-auto w-full space-y-8 relative z-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">{isAr ? "الدعم الفني والبلاغات" : "Support & Reports"}</h1>
        <p className="text-slate-400 text-sm">
          {isAr ? "أرسل بلاغك أو استفسارك وسيقوم فريقنا بمراجعته والرد عليك فوراً" : "Submit your report or inquiry and our team will review it"}
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md">
        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{isAr ? "تم إرسال بلاغك بنجاح!" : "Report sent successfully!"}</h3>
              <p className="text-slate-400 text-sm">{isAr ? "شكراً لتواصلك، تم استلام رسالتك ووصلت إلى صندوق البريد لمراجعتها." : "Thank you for reaching out. We have received your message."}</p>
            </div>
            <button onClick={() => setStatus("idle")} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
              {isAr ? "إرسال بلاغ آخر" : "Send another report"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 ml-1">{isAr ? "الاسم" : "Name"}</label>
                <input type="text" name="name" required className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition" placeholder={isAr ? "اسمك الكريم" : "Your name"} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 ml-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
                <input type="email" name="email" required className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition" placeholder="example@mail.com" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 ml-1">{isAr ? "نوع البلاغ" : "Report Type"}</label>
              <select name="type" className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition appearance-none">
                <option value="scam_report">{isAr ? "الإبلاغ عن موقع/رقم احتيالي" : "Report a scam site/number"}</option>
                <option value="technical_issue">{isAr ? "مشكلة فنية في المنصة" : "Technical issue"}</option>
                <option value="suggestion">{isAr ? "اقتراح أو فكرة" : "Suggestion or Idea"}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 ml-1">{isAr ? "تفاصيل البلاغ" : "Report Details"}</label>
              <textarea name="message" required rows={4} className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition resize-none" placeholder={isAr ? "اكتب تفاصيل البلاغ أو المشكلة هنا..." : "Write the details of your report here..."}></textarea>
            </div>

            {status === "error" && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs mt-0.5">{isAr ? "حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى." : "An error occurred while sending. Please try again."}</p>
              </div>
            )}

            <button type="submit" disabled={status === "loading"} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
              {status === "loading" ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <><Send className="w-4 h-4" /> {isAr ? "إرسال البلاغ" : "Submit Report"}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}