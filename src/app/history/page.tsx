"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import { 
  User, LogIn, UserPlus, LogOut, KeyRound, ShieldAlert, 
  Trash2, Clock, Globe, Image as ImageIcon, 
  MessageSquare, UserX, Camera, Edit3, Mail, RefreshCw, 
  CheckCircle2, AlertTriangle, ArrowLeft 
} from "lucide-react";
import { useLanguage } from "../LanguageContext";

interface ScanRecord {
  id: string;
  type: string;
  input: string;
  input_content?: string;
  input_type?: string;
  image_url?: string;
  verdict: string;
  score: number;
  created_at: string;
}

export default function HistoryPage() {
  const { isAr } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  
  // حقول تسجيل الدخول
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [btnLoading, setBtnLoading] = useState(false);

  // سجل الفحوصات
  const [scans, setScans] = useState<ScanRecord[]>([]);

  // تعديل الحساب
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // تغيير البريد
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        initUserData(session.user);
        fetchScans(session.user.id);
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        initUserData(session.user);
        fetchScans(session.user.id);
      } else {
        setCurrentUser(null);
        setScans([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initUserData = (user: any) => {
    setCurrentUser(user);
    setDisplayName(user.user_metadata?.full_name || "");
    setAvatarUrl(user.user_metadata?.avatar_url || null);
  };

  const fetchScans = async (userId: string) => {
    const { data, error } = await supabase
      .from("scans")
      .select("*")
      .eq("user_id", userId)
      .or("is_deleted_by_user.eq.false,is_deleted_by_user.is.null")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setScans(data);
    }
  };

  // رفع وتعديل صورة الحساب الشخصية
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImg(true);
      setStatusMsg(null);
      if (!e.target.files || e.target.files.length === 0 || !currentUser) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop() || "png";
      const filePath = `user-${currentUser.id}-${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
      setStatusMsg({ type: "success", text: isAr ? "تم تحديث صورتك الشخصية بنجاح!" : "Avatar updated successfully!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || (isAr ? "فشل رفع الصورة" : "Failed to upload image") });
    } finally {
      setUploadingImg(false);
    }
  };

  // حفظ الاسم الشخصي
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSavingProfile(true);
    setStatusMsg(null);

    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });
    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setStatusMsg({ type: "success", text: isAr ? "تم حفظ الاسم بنجاح!" : "Name updated successfully!" });
      setIsEditing(false);
    }
    setSavingProfile(false);
  };

  // طلب تغيير البريد وإرسال رابط التأكيد
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail.toLowerCase() === currentUser.email?.toLowerCase()) return;

    setEmailLoading(true);
    setStatusMsg(null);

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setStatusMsg({
        type: "success",
        text: isAr 
          ? `تم إرسال رابط تأكيد التحديث إلى بريدك (${newEmail}). يرجى الضغط عليه في الإيميل لتأكيد الحساب.` 
          : `Confirmation link sent to ${newEmail}. Please check your inbox.`,
      });
      setNewEmail("");
    }
    setEmailLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtnLoading(true);
    setStatusMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatusMsg({ type: "error", text: isAr ? "بيانات الدخول غير صحيحة أو الحساب بانتظار التأكيد." : error.message });
    }
    setBtnLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtnLoading(true);
    setStatusMsg(null);

    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: redirectUrl,
      }
    });

    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setPassword("");
      setAuthMode("login");
      setStatusMsg({
        type: "success",
        text: isAr ? "تم إنشاء الحساب بنجاح! تفقد بريدك لتأكيد حسابك ثم سجّل دخولك." : "Account created! Please verify your email."
      });
    }
    setBtnLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtnLoading(true);
    setStatusMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/history",
    });

    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setStatusMsg({
        type: "success",
        text: isAr ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!" : "Password reset link sent!"
      });
    }
    setBtnLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteScan = async (id: string) => {
    const { error } = await supabase
      .from("scans")
      .update({ is_deleted_by_user: true })
      .eq("id", id);

    if (!error) {
      setScans((prev) => prev.filter((s) => s.id !== id));
    } else {
      alert(isAr ? "تعذر حذف الفحص، يرجى المحاولة لاحقاً." : "Failed to delete scan.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      isAr 
        ? "⚠️ هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟ لن تتمكن من استرجاع الحساب بعد تأكيد الحذف." 
        : "⚠️ Are you sure you want to permanently delete your account?"
    );

    if (!confirmDelete) return;

    setBtnLoading(true);
    const { error } = await supabase.rpc("delete_user_account");

    if (error) {
      alert(isAr ? "تعذر حذف الحساب: " + error.message : "Failed to delete account: " + error.message);
      setBtnLoading(false);
    } else {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setScans([]);
      setBtnLoading(false);
      alert(isAr ? "تم حذف حسابك بنجاح." : "Account deleted successfully.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto w-full space-y-8 relative z-10">
      
      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
          statusMsg.type === "success" ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300" : "bg-red-950/60 border border-red-800 text-red-300"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {currentUser ? (
        <div className="space-y-6">
          
          {/* 1. بطاقة الملف الشخصي العلوية */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
              
              {/* المستخدم والصورة أولاً في الكود (يمين بالعربي، يسار بالإنجليزي) */}
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 overflow-hidden border border-slate-700">
                    {uploadingImg ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7" />
                    )}
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImg}
                    className="absolute -bottom-1 -right-1 p-1 bg-slate-950 border border-slate-700 hover:border-blue-500 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition shadow-md"
                    title={isAr ? "تغيير الصورة الشخصية" : "Change photo"}
                  >
                    <Camera className="w-3 h-3" />
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
                  <h2 className="text-xl font-bold text-white">
                    {displayName || currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0]}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{currentUser.email}</p>
                </div>
              </div>

              {/* أزرار الإجراءات ثانياً في الكود (يسار بالعربي، يمين بالإنجليزي) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isAr ? "تعديل البيانات" : "Edit Profile"}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
                </button>

                <button
                  onClick={handleDeleteAccount}
                  disabled={btnLoading}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  <span>{isAr ? "حذف الحساب" : "Delete Account"}</span>
                </button>
              </div>

            </div>

            {/* قسم تعديل البيانات المنسدل */}
            {isEditing && (
              <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                
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
                      disabled={savingProfile}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0"
                    >
                      {savingProfile ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ الاسم" : "Save Name")}
                    </button>
                  </div>
                </form>

                {/* تغيير البريد عبر رابط تأكيد رسمي */}
                <form onSubmit={handleRequestEmailChange} className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 block">{isAr ? "تغيير البريد الإلكتروني:" : "Change Email:"}</label>
                  <div className="flex gap-2">
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
                      disabled={emailLoading || !newEmail.trim()}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shrink-0"
                    >
                      {emailLoading ? "..." : (isAr ? "إرسال الرابط" : "Send Link")}
                    </button>
                  </div>
                </form>

              </div>
            )}
          </div>

          {/* 2. سجل الفحوصات الشخصية */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl backdrop-blur-md space-y-6">
            
            {/* الترويسة: العنوان أولاً ثم العداد ثانياً */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span>{isAr ? "سجل فحوصاتي الشخصية" : "My Personal Scans"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr ? "سجلاتك محفوظة بشكل آمن وتظهر عبر جميع أجهزتك" : "Your scans are synced securely across all your devices"}
                </p>
              </div>

              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">
                {scans.length} {isAr ? "فحوصات" : "scans"}
              </span>
            </div>

            {scans.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <p className="text-slate-400 text-sm">{isAr ? "لا توجد فحوصات محفوظة حتى الآن في حسابك." : "No scans saved in your account yet."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scans.map((scan) => (
                  <div key={scan.id} className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-4 transition">
                    
                    {/* المحتوى والأيقونة أولاً في الكود (يمين في العربي، يسار في الإنجليزي) */}
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 shrink-0">
                        {(scan.input_type || scan.type) === "url" && <Globe className="w-5 h-5" />}
                        {(scan.input_type || scan.type) === "image" && <ImageIcon className="w-5 h-5" />}
                        {(scan.input_type || scan.type) === "text" && <MessageSquare className="w-5 h-5" />}
                      </div>

                      <div className="truncate">
                        <p className="text-sm font-semibold text-white truncate max-w-lg">
                          {scan.input_content || scan.input}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(scan.created_at).toLocaleDateString(isAr ? "ar-AE" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    {/* التقييم وزر الحذف ثانياً في الكود (يسار في العربي، يمين في الإنجليزي) */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        scan.verdict?.toLowerCase() === "safe" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        scan.verdict?.toLowerCase() === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {scan.verdict.toUpperCase()}
                      </span>

                      <button
                        onClick={() => handleDeleteScan(scan.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title={isAr ? "إزالة من سجلي" : "Remove"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl backdrop-blur-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">
              {authMode === "login" && (isAr ? "تسجيل الدخول" : "Sign In")}
              {authMode === "register" && (isAr ? "إنشاء حساب سحابي جديد" : "Create Cloud Account")}
              {authMode === "forgot" && (isAr ? "استعادة كلمة المرور" : "Reset Password")}
            </h2>
            <p className="text-xs text-slate-400">
              {authMode === "forgot" 
                ? (isAr ? "أدخل بريدك الإلكتروني ليصلك رابط إعادة التعيين الحقيقي" : "Enter your email for a reset link")
                : (isAr ? "احفظ نتائج فحوصاتك وقم بمزامنتها عبر جميع أجهزتك" : "Sync and save your scan results across devices")}
            </p>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : authMode === "register" ? handleRegister : handleForgotPassword} className="space-y-4">
            {authMode === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 ml-1">{isAr ? "الاسم الكامل" : "Full Name"}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isAr ? "مثال: يوسف" : "e.g. Yousef"}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 ml-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
              />
            </div>

            {authMode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 ml-1">{isAr ? "كلمة المرور" : "Password"}</label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setAuthMode("forgot"); setStatusMsg(null); }}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {isAr ? "نسيت كلمة السر؟" : "Forgot Password?"}
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={btnLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {btnLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  {authMode === "login" && <><LogIn className="w-4 h-4" /> {isAr ? "تسجيل الدخول" : "Sign In"}</>}
                  {authMode === "register" && <><UserPlus className="w-4 h-4" /> {isAr ? "إنشاء الحساب" : "Create Account"}</>}
                  {authMode === "forgot" && <><KeyRound className="w-4 h-4" /> {isAr ? "إرسال رابط الاستعادة" : "Send Reset Link"}</>}
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            {authMode === "login" ? (
              <p className="text-xs text-slate-400">
                {isAr ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                <button onClick={() => { setAuthMode("register"); setStatusMsg(null); }} className="text-blue-400 font-bold hover:underline">
                  {isAr ? "سجل الآن مجاناً" : "Sign Up"}
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                {isAr ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
                <button onClick={() => { setAuthMode("login"); setStatusMsg(null); }} className="text-blue-400 font-bold hover:underline">
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}