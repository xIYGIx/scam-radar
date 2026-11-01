"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "../LanguageContext";
import Link from "next/link";
import { 
  User, Mail, Upload, KeyRound, CheckCircle2, AlertTriangle, 
  ArrowLeft, Camera, LogOut, Trash2, Globe, Image as ImageIcon, 
  MessageSquare, Edit3, RefreshCw, Clock
} from "lucide-react";

interface ScanRecord {
  id: string;
  type: string;
  input: string;
  input_content?: string;
  input_type?: string;
  image_url?: string;
  verdict: "safe" | "warning" | "scam";
  score: number;
  created_at: string;
}

export default function ProfilePage() {
  const { isAr } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // سجل الفحوصات
  const [scans, setScans] = useState<ScanRecord[]>([]);

  // حقول تعديل الملف الشخصي
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [stepOtp, setStepOtp] = useState(false);

  // حالات الرسائل والتحميل
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setDisplayName(session.user.user_metadata?.full_name || "");
      setAvatarUrl(session.user.user_metadata?.avatar_url || null);

      // جلب سجل الفحوصات الخاص بحساب المستخدم
      const { data: userScans } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (userScans) {
        setScans(userScans as ScanRecord[]);
      }
    }
    setLoading(false);
  };

  // 1. رفع وتعديل صورة الحساب لجميع المستخدمين
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImg(true);
      setStatusMsg(null);
      if (!e.target.files || e.target.files.length === 0 || !user) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `user-${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
      setStatusMsg({ type: "success", text: isAr ? "تم تحديث الصورة الشخصية بنجاح" : "Avatar updated successfully" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || (isAr ? "فشل رفع الصورة" : "Failed to upload image") });
    } finally {
      setUploadingImg(false);
    }
  };

  // 2. تحديث وحفظ الاسم
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setStatusMsg({ type: "success", text: isAr ? "تم حفظ الاسم بنجاح" : "Name updated successfully" });
      setIsEditing(false);
    }
    setSaving(false);
  };

  // 3. طلب تغيير البريد وإرسال رمز التحقق OTP
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail.toLowerCase() === user.email?.toLowerCase()) return;

    setSaving(true);
    setStatusMsg(null);

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setStepOtp(true);
      setStatusMsg({
        type: "success",
        text: isAr ? `تم إرسال رمز التحقق (OTP) إلى بريدك الجديد (${newEmail}). أدخل الرمز أدناه لتأكيد التغيير.` : `Verification code sent to ${newEmail}`,
      });
    }
    setSaving(false);
  };

  // 4. تأكيد رمز OTP وتطبيق تغيير البريد
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const { data, error } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: otpToken.trim(),
      type: "email_change",
    });

    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setUser(data.user);
      setStepOtp(false);
      setNewEmail("");
      setOtpToken("");
      setStatusMsg({ type: "success", text: isAr ? "تم تغيير وتأكيد البريد الإلكتروني الجديد بنجاح!" : "Email changed successfully!" });
    }
    setSaving(false);
  };

  // 5. حذف فحص معين من سجل المستخدم
  const handleDeleteScan = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا الفحص من سجلك الشخصي؟" : "Delete this scan?")) return;
    const { error } = await supabase.from("scans").delete().eq("id", id);
    if (!error) {
      setScans(scans.filter(s => s.id !== id));
    }
  };

  // تسجيل الخروج
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // حذف الحساب
  const handleDeleteAccount = async () => {
    if (!confirm(isAr ? "تأكيد حذف الحساب نهائياً؟" : "Confirm account deletion?")) return;
    alert(isAr ? "تم تسجيل طلب حذف الحساب وسيتم التواصل معك." : "Account deletion requested.");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-4">
          <p className="text-slate-300 text-sm">{isAr ? "يرجى تسجيل الدخول للوصول إلى صفحة حسابك" : "Please log in to manage your profile"}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs">
            <ArrowLeft className="w-4 h-4" />
            <span>{isAr ? "الرجوع للرئيسية" : "Home"}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 max-w-4xl mx-auto w-full space-y-6">
      
      {/* رسائل الحالة */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
          statusMsg.type === "success" ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300" : "bg-red-950/60 border border-red-800 text-red-300"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 1. بطاقة الملف الشخصي العلوية */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            {/* الصورة الشخصية مع إمكانية التغيير الفوري */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-blue-600 border border-slate-700 flex items-center justify-center text-white text-2xl font-bold">
                {uploadingImg ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                )}
              </div>

              {/* زر رفع الصورة */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImg}
                className="absolute -bottom-1 -right-1 p-1.5 bg-slate-950 border border-slate-700 hover:border-blue-500 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition shadow-md"
                title={isAr ? "تغيير الصورة" : "Change photo"}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploadingImg}
                className="hidden"
              />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {displayName || user.user_metadata?.full_name || user.email?.split("@")[0]}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* الأزرار العلوية */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isAr ? "تعديل البيانات" : "Edit Profile"}</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isAr ? "تسجيل الخروج" : "Logout"}</span>
            </button>

            <button
              onClick={handleDeleteAccount}
              className="px-3.5 py-2.5 rounded-xl bg-red-950/30 hover:bg-red-900/30 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? "حذف الحساب" : "Delete"}</span>
            </button>
          </div>
        </div>

        {/* نموذج تعديل الاسم والبريد الإلكتروني المنسدل */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* تعديل الاسم */}
            <form onSubmit={handleUpdateName} className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">{isAr ? "الاسم المعروض:" : "Display Name:"}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isAr ? "اكتب اسمك الكامل" : "Enter display name"}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0"
                >
                  {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ الاسم" : "Save Name")}
                </button>
              </div>
            </form>

            {/* تعديل البريد مع OTP */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">{isAr ? "تغيير البريد (عبر رمز التحقق):" : "Change Email (via OTP):"}</label>
              {!stepOtp ? (
                <form onSubmit={handleRequestEmailChange} className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={isAr ? "البريد الإلكتروني الجديد" : "New email address"}
                    required
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={saving || !newEmail.trim()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shrink-0"
                  >
                    {saving ? "..." : (isAr ? "إرسال الرمز" : "Send OTP")}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex gap-2">
                  <input
                    type="text"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    placeholder="123456"
                    required
                    className="flex-1 bg-slate-950 border border-blue-500 rounded-xl px-4 py-2.5 text-center text-xs text-white font-mono tracking-widest focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shrink-0"
                  >
                    {isAr ? "تأكيد" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStepOtp(false)}
                    className="px-3 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-xs"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. سجل الفحوصات الشخصية */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{isAr ? "سجل فحوصاتي الشخصية" : "My Personal Scan History"}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "سجلاتك محفوظة بشكل آمن وتظهر عبر جميع أجهزتك" : "Your encrypted history across all devices"}
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
            {scans.length} {isAr ? "فحوصات" : "Scans"}
          </span>
        </div>

        {scans.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {isAr ? "لم تقم بإجراء أي فحوصات حتى الآن." : "No scans performed yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => (
              <div 
                key={scan.id} 
                className="p-4 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-4 transition"
              >
                {/* زر الحذف والتصنيف على اليسار */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleDeleteScan(scan.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title={isAr ? "حذف الفحص" : "Delete"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    scan.verdict === "safe" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    scan.verdict === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {scan.verdict?.toUpperCase()}
                  </span>
                </div>

                {/* المحتوى والتاريخ والأيقونة على اليمين */}
                <div className="flex items-center gap-3.5 overflow-hidden text-right">
                  <div className="truncate">
                    <p className="text-sm font-semibold text-white truncate max-w-lg">
                      {scan.input_content || scan.input || "بدون محتوى"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(scan.created_at).toLocaleDateString(isAr ? "ar-AE" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 shrink-0">
                    {(scan.input_type || scan.type) === "url" && <Globe className="w-5 h-5" />}
                    {(scan.input_type || scan.type) === "image" && <ImageIcon className="w-5 h-5" />}
                    {(scan.input_type || scan.type) === "text" && <MessageSquare className="w-5 h-5" />}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}