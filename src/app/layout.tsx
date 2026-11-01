"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, Accessibility, ZoomIn, ZoomOut, Mail, History, HelpCircle, 
  X, Volume2, VolumeX, Languages, Eye, User, LogIn, MessageCircle, 
  Sparkles, Clock, Crown, Menu, FileText
} from "lucide-react";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { supabase } from "@/lib/supabase";
import SupportButton from "@/components/SupportButton";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { lang, setLang, isAr } = useLanguage();
  const [fontSize, setFontSize] = useState(100);
  const [colorMode, setColorMode] = useState<"default" | "high-contrast" | "red-green" | "blue-yellow" | "grayscale">("default");
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [showA11yMenu, setShowA11yMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // إعدادات الصوت 
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  
  // جلسة المستخدم السحابية
  const [userSession, setUserSession] = useState<{ name: string; email: string } | null>(null);

  // إعداد الخلفية المتحركة
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // حساب المالك
  const OWNER_EMAIL = "youssef.bumoza@gmail.com";
  const isOwner = userSession?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
  }, [fontSize]);

  useEffect(() => {
    // التحقق الفوري من جلسة Supabase الحقيقية
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email || "";
        const name = session.user.user_metadata?.full_name || email.split("@")[0];
        setUserSession({ name, email });
      } else {
        setUserSession(null);
      }
    };

    checkUser();

    // الاستماع الفوري لأي تسجيل دخول أو خروج في المتصفح
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || "";
        const name = session.user.user_metadata?.full_name || email.split("@")[0];
        setUserSession({ name, email });
      } else {
        setUserSession(null);
      }
    });

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => subscription.unsubscribe();
  }, []);

  // محرك القراءة الصوتية الذكي
  const handleReadText = () => {
    if (!("speechSynthesis" in window)) {
      alert(isAr ? "متصفحك لا يدعم القراءة الصوتية" : "Speech synthesis not supported");
      return;
    }
    
    window.speechSynthesis.cancel();
    
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    } 

    const selectedText = window.getSelection()?.toString().trim();
    
    if (!selectedText) {
      alert(isAr ? "يرجى تحديد (تظليل) النص الذي تريد قراءته أولاً." : "Please highlight the text you want to read first.");
      return;
    }

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(selectedText);
      const isTextArabic = /[\u0600-\u06FF]/.test(selectedText);
      
      utterance.lang = isTextArabic ? "ar" : "en-US";
      utterance.rate = speechRate;

      let voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      
      if (!voice || !voice.lang.startsWith(isTextArabic ? "ar" : "en")) {
        const matchingVoices = availableVoices.filter(v => v.lang.startsWith(isTextArabic ? "ar" : "en"));
        if (matchingVoices.length > 0) {
          voice = matchingVoices.find(v => v.lang.includes("AE") || v.lang.includes("SA")) || matchingVoices[0];
        }
      }
      
      if (voice) {
        utterance.voice = voice;
      } else if (isTextArabic) {
        alert(isAr ? "تنبيه: جهازك أو متصفحك لا يحتوي حالياً على حزمة صوتية ناطقة بالعربية. يرجى إضافتها من إعدادات اللغة في نظام التشغيل (Windows/Mac)." : "Arabic voice pack is missing on your device.");
        setIsSpeaking(false);
        return;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error("Speech Synthesis Error:", e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const getColorFilterClass = () => {
    switch (colorMode) {
      case "high-contrast": return "contrast-200 bg-black text-yellow-300";
      case "red-green": return "hue-rotate-180 saturate-150";
      case "blue-yellow": return "hue-rotate-90";
      case "grayscale": return "grayscale";
      default: return "bg-slate-950 text-slate-100";
    }
  };

  return (
    <html lang={lang} dir={isAr ? "rtl" : "ltr"} suppressHydrationWarning>
      <body 
        suppressHydrationWarning
        style={{
          letterSpacing: dyslexicFont ? "0.14em" : "normal",
          wordSpacing: dyslexicFont ? "0.22em" : "normal",
          lineHeight: dyslexicFont ? "2.2" : "normal"
        }}
        className={`min-h-screen flex flex-col transition-all duration-150 ${getColorFilterClass()} relative z-0`}
      >
        {animationsEnabled && colorMode === "default" && (
          <div className="fixed inset-0 z-[-1] pointer-events-none bg-slate-950 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)'
              }}
            ></div>
            <div 
              className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-spin opacity-40"
              style={{
                background: 'conic-gradient(from 90deg at 50% 50%, transparent 0%, rgba(37,99,235,0.05) 50%, rgba(6,182,212,0.15) 100%)',
                animationDuration: '10s'
              }}
            ></div>
          </div>
        )}

        <header className="sticky top-0 z-40 backdrop-blur-md border-b border-slate-800/80 bg-slate-950/80 px-3 sm:px-4">
          <div className="max-w-6xl mx-auto h-16 flex items-center justify-between gap-2">
            
            {/* اللوجو وزر فتح القائمة الجانبية للشاشات الصغيرة */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 md:hidden hover:border-slate-500 transition"
                aria-label="Toggle Navigation Menu"
              >
                {showMobileMenu ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5 text-blue-400" />}
              </button>

              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-base tracking-tight text-white hidden sm:inline">
                  {isAr ? "رادار الاحتيال" : "Scam Radar"}
                </span>
              </Link>
            </div>

            {/* روابط التنقل في الشاشات العادية والكمبيوتر */}
            <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-slate-300">
              <Link href="/" className="hover:text-blue-400 transition">{isAr ? "الفاحص" : "Scanner"}</Link>
              <Link href="/history" className="hover:text-blue-400 transition flex items-center gap-1.5">
                <History className="w-4 h-4" /> {isAr ? "السجل" : "History"}
              </Link>
              <Link href="/faq" className="hover:text-blue-400 transition flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> {isAr ? "الأسئلة الشائعة" : "FAQ"}
              </Link>
              <Link href="/contact" className="hover:text-blue-400 transition flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> {isAr ? "الدعم الفني" : "Support"}
              </Link>
              <Link href="/direct" className="hover:text-blue-400 transition flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" /> {isAr ? "تواصل مباشر" : "Direct Contact"}
              </Link>
            </nav>

            {/* الأزرار العلوية */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* زر لوحة تحكم المالك */}
              {isOwner && (
                <Link
                  href="/admin"
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition shadow"
                  title={isAr ? "لوحة الإدارة" : "Dashboard"}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">{isAr ? "لوحة الإدارة" : "Dashboard"}</span>
                </Link>
              )}

              {/* زر الملف الشخصي وتسجيل الدخول الذكي */}
              <Link 
                href="/history" 
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow ${
                  isOwner 
                    ? "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border border-amber-400/40" 
                    : userSession 
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700" 
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {userSession ? (
                  <>
                    {isOwner ? <Crown className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> : <User className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="max-w-[70px] sm:max-w-[110px] truncate">{userSession.name}</span>
                    {isOwner && (
                      <span className="hidden sm:inline bg-amber-950/80 text-amber-300 text-[10px] px-1.5 py-0.2 rounded border border-amber-500/40 font-black">
                        {isAr ? "المالك" : "Owner"}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isAr ? "دخول" : "Sign In"}</span>
                  </>
                )}
              </Link>

              <button
                onClick={handleReadText}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center transition ${isSpeaking ? "bg-red-600 border-red-500 text-white" : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"}`}
                title={isAr ? "تحديد النص وقراءته" : "Read selected text"}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                onClick={() => setLang(isAr ? "en" : "ar")}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-semibold flex items-center gap-1 transition text-slate-200"
              >
                <Languages className="w-3.5 h-3.5 text-blue-400" />
                <span>{isAr ? "EN" : "عربي"}</span>
              </button>

              {/* زر إمكانية الوصول */}
              <button
                onClick={() => setShowA11yMenu(!showA11yMenu)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-400 text-xs font-semibold flex items-center gap-1.5 transition text-white"
                title={isAr ? "إمكانية الوصول" : "Accessibility"}
              >
                <Accessibility className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="hidden sm:inline">{isAr ? "إمكانية الوصول" : "Accessibility"}</span>
              </button>
            </div>
          </div>

          {/* القائمة المنسدلة للهواتف */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-slate-800 py-3 px-2 space-y-1.5 bg-slate-950/95 backdrop-blur animate-in fade-in slide-in-from-top-2">
              <Link 
                href="/" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-slate-200 transition"
              >
                <ShieldAlert className="w-5 h-5 text-blue-400" />
                <span>{isAr ? "الفاحص" : "Scanner"}</span>
              </Link>

              <Link 
                href="/history" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-slate-200 transition"
              >
                <History className="w-5 h-5 text-cyan-400" />
                <span>{isAr ? "سجل الفحوصات" : "Scan History"}</span>
              </Link>

              <Link 
                href="/faq" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-slate-200 transition"
              >
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>{isAr ? "الأسئلة الشائعة" : "FAQ"}</span>
              </Link>

              <Link 
                href="/contact" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-slate-200 transition"
              >
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>{isAr ? "الدعم الفني" : "Support"}</span>
              </Link>

              <Link 
                href="/direct" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-emerald-300 transition"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <span>{isAr ? "تواصل مباشر" : "Direct Contact"}</span>
              </Link>

              {/* رابط الشروط والأحكام في قائمة الهاتف */}
              <Link 
                href="/terms" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-slate-300 transition"
              >
                <FileText className="w-5 h-5 text-slate-400" />
                <span>{isAr ? "الشروط والأحكام والخصوصية" : "Terms & Privacy Policy"}</span>
              </Link>

              {/* زر دعم المنصة داخل قائمة الهاتف */}
              <div className="pt-1">
                <SupportButton variant="drawer" />
              </div>

              {/* خيار إمكانية الوصول داخل قائمة الهاتف */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowA11yMenu(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-slate-200 transition text-start"
              >
                <Accessibility className="w-5 h-5 text-blue-400" />
                <span>{isAr ? "إمكانية الوصول والتخصيص" : "Accessibility & Tools"}</span>
              </button>

              {isOwner && (
                <Link 
                  href="/admin" 
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm font-bold text-amber-300 transition"
                >
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>{isAr ? "لوحة الإدارة (المالك)" : "Owner Dashboard"}</span>
                </Link>
              )}
            </div>
          )}
        </header>

        {showA11yMenu && (
          <div className={`fixed bottom-6 ${isAr ? "left-6" : "right-6"} z-50 bg-slate-900/95 border border-slate-700 p-5 rounded-2xl shadow-2xl max-w-sm w-full text-start backdrop-blur space-y-5 max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sm flex items-center gap-2 text-white">
                <Accessibility className="w-4 h-4 text-blue-400" /> {isAr ? "إمكانية الوصول والتخصيص" : "Accessibility & Tools"}
              </span>
              <button onClick={() => setShowA11yMenu(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 block">{isAr ? `حجم الخط (${fontSize}%):` : `Font Size (${fontSize}%):`}</label>
              <div className="flex gap-2">
                <button onClick={() => setFontSize(p => Math.min(p + 15, 160))} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 text-white"><ZoomIn className="w-3.5 h-3.5" /> {isAr ? "تكبير" : "Bigger"}</button>
                <button onClick={() => setFontSize(p => Math.max(p - 15, 75))} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 text-white"><ZoomOut className="w-3.5 h-3.5" /> {isAr ? "تصغير" : "Smaller"}</button>
                <button onClick={() => setFontSize(100)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300">{isAr ? "إعادة" : "Reset"}</button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button onClick={() => setAnimationsEnabled(!animationsEnabled)} className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-between ${animationsEnabled ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {isAr ? "الخلفية السيبرانية (الرادار)" : "Cyber Radar Background"}</span>
                <span>{animationsEnabled ? "✓" : ""}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button onClick={() => setDyslexicFont(!dyslexicFont)} className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-between ${dyslexicFont ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                <span>{isAr ? "خط متباعد للقراءة السهلة" : "Dyslexia-friendly Font"}</span><span>{dyslexicFont ? "✓" : ""}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <label className="text-xs text-slate-400 block font-semibold text-blue-400">{isAr ? "إعدادات القراءة الصوتية:" : "Text-to-Speech Settings:"}</label>
              <p className="text-[10px] text-emerald-400 mb-2">{isAr ? "💡 ظلل أي نص في الصفحة ثم اضغط زر السماعة فوق." : "💡 Highlight any text on the page then click the speaker icon above."}</p>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{isAr ? `سرعة الصوت: ${speechRate}x` : `Voice Speed: ${speechRate}x`}</label>
                <input type="range" min="0.5" max="2" step="0.1" value={speechRate} onChange={(e) => setSpeechRate(parseFloat(e.target.value))} className="w-full accent-blue-500" />
              </div>
              <select value={selectedVoiceURI} onChange={(e) => setSelectedVoiceURI(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none">
                <option value="">{isAr ? "الصوت الافتراضي التلقائي" : "Default Auto Voice"}</option>
                {availableVoices.filter(v => v.lang.startsWith(isAr ? "ar" : "en")).map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-blue-400" /> {isAr ? "أنظمة عمى الألوان والتباين:" : "Color Blindness / Contrast:"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "default", ar: "طبيعي", en: "Default" },
                  { id: "high-contrast", ar: "تباين عالي", en: "High Contrast" },
                  { id: "red-green", ar: "أحمر/أخضر", en: "Red/Green Safe" },
                  { id: "blue-yellow", ar: "أزرق/أصفر", en: "Blue/Yellow Safe" },
                  { id: "grayscale", ar: "تدرج رمادي", en: "Grayscale" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setColorMode(mode.id as any)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border ${colorMode === mode.id ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
                  >
                    {isAr ? mode.ar : mode.en}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-800/60 bg-slate-950/80 backdrop-blur py-8 px-4 mt-12 text-center text-xs space-y-3">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {isAr 
                ? "آخر تحديث للمنصة: 1 نوفمبر 2026 - بتوقيت الإمارات (GMT+4)" 
                : "Last Platform Update: November 1, 2026 (UAE Time GMT+4)"}
            </span>
          </div>

          {/* رابط الشروط والأحكام وسياسة الخصوصية فقط */}
          <div className="flex items-center justify-center text-slate-400 pt-1 pb-1">
            <Link 
              href="/terms" 
              className="text-slate-400 hover:text-white transition underline-offset-4 hover:underline"
            >
              {isAr ? "الشروط والأحكام وسياسة الخصوصية" : "Terms & Privacy Policy"}
            </Link>
          </div>

          <p className="font-bold text-slate-300">
            {isAr ? "جميع الحقوق محفوظة © 2026 | تطوير وإشراف: " : "All Rights Reserved © 2026 | Developed by: "}
            <span className="text-blue-400">{isAr ? "يوسف ال علي" : "Yousef Al Ali"}</span>
          </p>
        </footer>

        {/* زر الدعم العائم المخصص للكمبيوتر في أسفل الشاشة */}
        <SupportButton variant="floating" />
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider><MainLayoutContent>{children}</MainLayoutContent></LanguageProvider>;
}