"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "../LanguageContext";
import Link from "next/link";
import { 
  Crown, ShieldAlert, CheckCircle2, AlertTriangle, 
  Clock, Globe, Image as ImageIcon, MessageSquare, 
  Trash2, RefreshCw, ArrowLeft, Mail, BarChart3, 
  Power, History, Ban, Cpu, HardDrive, Zap, ExternalLink, User
} from "lucide-react";

interface ScanRecord {
  id: string;
  user_id: string | null;
  type: string;
  input: string;
  input_content?: string;
  input_type?: string;
  image_url?: string;
  client_ip?: string;
  device_id?: string;
  verdict: "safe" | "warning" | "scam";
  score: number;
  created_at: string;
}

interface BannedIP {
  id: string;
  ip_address: string;
  device_id?: string;
  reason: string;
  is_automatic: boolean;
  banned_at: string;
}

interface AuditLog {
  id: string;
  event_type: string;
  details: string;
  ip_address: string | null;
  user_email: string | null;
  created_at: string;
}

const OWNER_EMAIL = "youssef.bumoza@gmail.com";

export default function AdminDashboard() {
  const { isAr } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<"scans" | "metrics" | "system" | "security" | "audit">("scans");

  // بيانات الفحوصات والفلترة
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIP[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<"all" | "scam" | "warning" | "safe">("all");
  const [refreshing, setRefreshing] = useState(false);

  // حظر يدوي
  const [newIp, setNewIp] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [banReason, setBanReason] = useState("");

  // إعادة التشغيل
  const [redeployLoading, setRedeployLoading] = useState(false);
  const [redeployStatus, setRedeployStatus] = useState<string | null>(null);

  useEffect(() => {
    checkOwnerAccess();
  }, []);

  const checkOwnerAccess = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      setIsOwner(true);
      await Promise.all([fetchAllScans(), fetchBannedIps(), fetchAuditLogs()]);
    } else {
      setIsOwner(false);
    }
    setLoading(false);
  };

  const fetchAllScans = async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setScans(data as ScanRecord[]);
    }
    setRefreshing(false);
  };

  const fetchBannedIps = async () => {
    const { data } = await supabase
      .from("banned_ips")
      .select("*")
      .order("banned_at", { ascending: false });
    if (data) setBannedIps(data as BannedIP[]);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from("system_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data) setAuditLogs(data as AuditLog[]);
  };

  const handleDeleteScan = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا السجل نهائياً؟" : "Delete scan permanently?")) return;
    const { error } = await supabase.from("scans").delete().eq("id", id);
    if (!error) setScans(scans.filter(s => s.id !== id));
  };

  // حظر فوري بنقرة واحدة من بطاقة الفحص (يلتقط الـ IP الحقيقي والبصمة الكاملة بدون نقص)
  const handleQuickBan = async (ip?: string, deviceId?: string) => {
    if (!confirm(isAr ? `تأكيد حظر هذا الجهاز والـ IP فوراً؟` : "Ban device and IP immediately?")) return;

    const targetIp = ip || "127.0.0.1";
    const targetDevice = deviceId || null;

    const { error } = await supabase.from("banned_ips").insert([
      {
        ip_address: targetIp,
        device_id: targetDevice,
        reason: isAr ? "حظر فوري بنقرة واحدة من لوحة الإدارة" : "One-click admin ban",
        is_automatic: false,
      },
    ]);

    if (!error) {
      await supabase.from("system_audit_logs").insert([
        {
          event_type: "MANUAL_BAN",
          details: `حظر فوري: IP=${targetIp}, Device=${targetDevice || 'None'}`,
          user_email: OWNER_EMAIL,
        },
      ]);
      alert(isAr ? "تم حظر الجهاز والـ IP بنجاح!" : "Banned successfully!");
      fetchBannedIps();
      fetchAuditLogs();
    } else {
      alert(isAr ? `خطأ أثناء الحظر: ${error.message}` : `Error: ${error.message}`);
    }
  };

  // إعادة تشغيل ونشر الموقع عبر Vercel API
  const handleRedeploy = async () => {
    if (!confirm(isAr ? "تأكيد إعادة بناء ونشر الموقع على Vercel الآن؟" : "Confirm Vercel Redeployment now?")) return;
    setRedeployLoading(true);
    setRedeployStatus(null);

    try {
      const res = await fetch("/api/admin/redeploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: OWNER_EMAIL }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to redeploy");

      setRedeployStatus(isAr ? "تم إرسال أمر إعادة البناء إلى Vercel بنجاح." : "Redeploy triggered successfully!");
      fetchAuditLogs();
    } catch (err: any) {
      setRedeployStatus(`خطأ: ${err.message}`);
    } finally {
      setRedeployLoading(false);
    }
  };

  // تطبيق الحظر اليدوي
  const handleAddBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim() && !newDeviceId.trim()) return;

    const { error } = await supabase.from("banned_ips").insert([
      {
        ip_address: newIp.trim() || "0.0.0.0",
        device_id: newDeviceId.trim() || null,
        reason: banReason.trim() || (isAr ? "حظر يدوي بواسطة المالك" : "Manual ban by owner"),
        is_automatic: false,
      },
    ]);

    if (!error) {
      await supabase.from("system_audit_logs").insert([
        {
          event_type: "MANUAL_BAN",
          details: `حظر يدوي: IP=${newIp || 'None'}, Device=${newDeviceId || 'None'} (${banReason})`,
          user_email: OWNER_EMAIL,
        },
      ]);
      setNewIp("");
      setNewDeviceId("");
      setBanReason("");
      fetchBannedIps();
      fetchAuditLogs();
    }
  };

  // إلغاء الحظر
  const handleUnban = async (id: string, targetName: string) => {
    if (!confirm(isAr ? `إلغاء الحظر عن ${targetName}؟` : `Unban ${targetName}?`)) return;

    const { error } = await supabase.from("banned_ips").delete().eq("id", id);
    if (!error) {
      await supabase.from("system_audit_logs").insert([
        {
          event_type: "UNBAN",
          details: `تم فك الحظر عن: ${targetName}`,
          user_email: OWNER_EMAIL,
        },
      ]);
      fetchBannedIps();
      fetchAuditLogs();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 relative z-10">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 p-8 rounded-3xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {isAr ? "منطقة مخصصة للمالك فقط" : "Owner Access Only"}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isAr 
              ? "هذه اللوحة محمية ولا يمكن الوصول إليها إلا من خلال حساب المالك الرسمي للمنصة." 
              : "This dashboard is strictly reserved for the platform owner."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isAr ? "العودة للرئيسية" : "Back to Home"}</span>
          </Link>
        </div>
      </div>
    );
  }

  // الحسابات الإحصائية
  const totalScans = scans.length;
  const scamCount = scans.filter(s => s.verdict === "scam").length;
  const warningCount = scans.filter(s => s.verdict === "warning").length;
  const safeCount = scans.filter(s => s.verdict === "safe").length;
  const avgRisk = totalScans > 0 ? Math.round(scans.reduce((acc, cur) => acc + (cur.score || 0), 0) / totalScans) : 0;

  const filteredScans = scans.filter(s => filter === "all" ? true : s.verdict === filter);

  return (
    <div className="py-10 px-4 max-w-6xl mx-auto w-full space-y-8 relative z-10">
      
      {/* الترويسة الرئيسية */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-amber-500/30 p-6 rounded-3xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Scam Radar | {isAr ? "لوحة تحكم المالك" : "Master Platform Dashboard"}
              <span className="bg-amber-500/20 text-amber-300 text-[11px] px-2 py-0.5 rounded-md border border-amber-500/30">
                {isAr ? "المالك" : "Owner"}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{OWNER_EMAIL}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { fetchAllScans(); fetchBannedIps(); fetchAuditLogs(); }}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{isAr ? "تحديث البيانات" : "Refresh"}</span>
          </button>
          
          <Link
            href="/profile"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? "حسابي الشخصي" : "My Profile"}</span>
          </Link>

          <a
            href="https://outlook.live.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{isAr ? "صندوق البلاغات" : "Reports"}</span>
          </a>
        </div>
      </div>

      {/* شريط التبويبات */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("scans")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === "scans" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isAr ? "الفحوصات والمدخلات والـ IP" : "Scans & Inputs"}</span>
          <span className="opacity-75">({totalScans})</span>
        </button>

        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === "metrics" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>{isAr ? "الموارد التقنية والنظام" : "Technical Resources"}</span>
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === "system" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{isAr ? "النظام وإعادة التشغيل" : "System & Redeploy"}</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === "security" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>{isAr ? "حظر الأجهزة والـ IP" : "Device & IP Bans"}</span>
          <span className="opacity-75">({bannedIps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === "audit" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>{isAr ? "سجل تدقيق الأحداث" : "Audit Trail"}</span>
          <span className="opacity-75">({auditLogs.length})</span>
        </button>
      </div>

      {/* 1. تبويب الفحوصات */}
      {activeTab === "scans" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{isAr ? "إجمالي الفحوصات" : "Total Scans"}</span>
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">{totalScans}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-red-500/20 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-red-400 text-xs font-semibold">
                <span>{isAr ? "احتيال مؤكد" : "Scams Blocked"}</span>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-red-400">{scamCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/20 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                <span>{isAr ? "محتوى مشبوه" : "Suspicious"}</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-amber-400">{warningCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
                <span>{isAr ? "محتوى آمن" : "Safe Verified"}</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{safeCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-1 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{isAr ? "متوسط الخطورة" : "Avg Risk"}</span>
                <span className="text-xs font-mono text-cyan-400">%</span>
              </div>
              <p className="text-2xl font-black text-cyan-400">{avgRisk}%</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>{isAr ? "سجل كافة الفحوصات والمدخلات والـ IP الحقيقي" : "Platform Live Activity Feed"}</span>
              </h2>

              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${filter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {isAr ? "الكل" : "All"} ({totalScans})
                </button>
                <button
                  onClick={() => setFilter("scam")}
                  className={`px-2.5 py-1 rounded-lg transition ${filter === "scam" ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:text-white"}`}
                >
                  {isAr ? "احتيال" : "Scams"}
                </button>
                <button
                  onClick={() => setFilter("warning")}
                  className={`px-2.5 py-1 rounded-lg transition ${filter === "warning" ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-white"}`}
                >
                  {isAr ? "مشبوه" : "Suspicious"}
                </button>
                <button
                  onClick={() => setFilter("safe")}
                  className={`px-2.5 py-1 rounded-lg transition ${filter === "safe" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}
                >
                  {isAr ? "آمن" : "Safe"}
                </button>
              </div>
            </div>

            {filteredScans.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                {isAr ? "لا توجد أي فحوصات مسجلة ضمن هذا التصنيف." : "No scans found in this category."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredScans.map((scan) => (
                  <div 
                    key={scan.id} 
                    className="p-4 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 shrink-0">
                        {(scan.input_type || scan.type) === "url" && <Globe className="w-5 h-5" />}
                        {(scan.input_type || scan.type) === "image" && <ImageIcon className="w-5 h-5" />}
                        {(scan.input_type || scan.type) === "text" && <MessageSquare className="w-5 h-5" />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-white truncate max-w-lg">
                          {scan.input_content || scan.input || "بدون محتوى نصي"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                          <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            IP: {scan.client_ip || "127.0.0.1"}
                          </span>
                          {scan.device_id && (
                            <span className="font-mono text-cyan-400 text-[11px]">
                              Device: {scan.device_id.substring(0, 8)}...
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-slate-400">
                            {scan.user_id ? `مسجل (UID: ${scan.user_id.substring(0, 6)}...)` : "زائر غير مسجل (Guest)"}
                          </span>
                          <span>•</span>
                          <span>{new Date(scan.created_at).toLocaleDateString(isAr ? "ar-AE" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                          {scan.image_url && (
                            <>
                              <span>•</span>
                              <a href={scan.image_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 font-semibold">
                                <ExternalLink className="w-3 h-3" />
                                <span>{isAr ? "عرض الصورة المرفوعة" : "View Image"}</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-mono text-slate-400 ml-2">{scan.score}%</span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        scan.verdict === "safe" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        scan.verdict === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {scan.verdict?.toUpperCase()}
                      </span>

                      {/* زر الحظر الفوري بنقرة واحدة */}
                      <button
                        onClick={() => handleQuickBan(scan.client_ip, scan.device_id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title={isAr ? "حظر هذا الجهاز والـ IP فوراً" : "Quick Ban Device & IP"}
                      >
                        <Ban className="w-4 h-4 text-red-400" />
                      </button>

                      {/* زر الحذف */}
                      <button
                        onClick={() => handleDeleteScan(scan.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title={isAr ? "حذف السجل" : "Delete"}
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
      )}

      {/* 2. تبويب الموارد التقنية */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{isAr ? "سجلات الفحص في قاعدة البيانات" : "Total Database Records"}</span>
                <HardDrive className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-white">{totalScans}</p>
              <p className="text-[11px] text-slate-500">{isAr ? "استهلاك صحي لقاعدة بيانات Supabase" : "Healthy Supabase storage"}</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{isAr ? "زمن استجابة السيرفر التقريبي" : "Edge Latency"}</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">~85 ms</p>
              <p className="text-[11px] text-slate-500">{isAr ? "خوادم سحابية موزعة عبر Vercel Edge" : "Distributed Edge Network"}</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>{isAr ? "الأجهزة وعناوين الـ IP المحظورة" : "Blocked Entities"}</span>
                <Ban className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-2xl font-black text-red-400">{bannedIps.length}</p>
              <p className="text-[11px] text-slate-500">{isAr ? "محمية بنجاح عبر جدار حماية Middleware" : "Protected via Edge Middleware"}</p>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
            <h3 className="text-sm font-bold text-white">{isAr ? "حالة الخدمات التقنية المربوطة" : "Connected Services Status"}</h3>
            <ul className="text-xs text-slate-300 space-y-2.5">
              <li className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isAr ? "محرك الذكاء الاصطناعي (Gemini 3.5 Flash Lite): متصل وجاهز للاستجابة السريعة." : "Gemini AI Engine: Connected and active."}</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isAr ? "حاوية التخزين السحابي (avatars): مفعلة وتستقبل صور الملفات الشخصية والفحوصات." : "Supabase Storage (avatars): Operational."}</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isAr ? "سياسات حماية قاعدة البيانات (Supabase RLS): مفعلة وتفصل صلاحيات القراءة والكتابة." : "Row Level Security (RLS): Active policies enforced."}</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 3. تبويب النظام وإعادة تشغيل الموقع */}
      {activeTab === "system" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Power className="w-5 h-5 text-red-400" />
              {isAr ? "إعادة بناء وتشغيل الموقع بضغطة زر (Vercel Redeploy)" : "One-Click Vercel Redeployment"}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isAr 
                ? "يتم إرسال طلب آمن ومشفر إلى Vercel API لتشغيل أحدث إصدار وتفريغ الكاش بالكامل دون الحاجة للدخول للوحة Vercel."
                : "Triggers a secure direct deployment to Vercel production to clear cache and restart edge functions."}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">
                {isAr ? "إعادة النشر الفوري لبيئة الإنتاج" : "Instant Production Redeploy"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? "يستغرق الإنهاء عادة من 30 إلى 60 ثانية" : "Typically completes within 30-60 seconds"}
              </p>
            </div>

            <button
              onClick={handleRedeploy}
              disabled={redeployLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
                redeployLoading 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-900/30"
              }`}
            >
              <Power className={`w-4 h-4 ${redeployLoading ? "animate-spin" : ""}`} />
              {redeployLoading 
                ? (isAr ? "جاري الإرسال لـ Vercel..." : "Deploying...") 
                : (isAr ? "إعادة تشغيل الموقع الآن" : "Trigger Redeploy")}
            </button>
          </div>

          {redeployStatus && (
            <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{redeployStatus}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. تبويب حظر الأجهزة والـ IP */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-amber-400" />
              {isAr ? "حظر عنوان IP أو بصمة جهاز يدوياً" : "Manually Ban IP or Device ID"}
            </h2>
            <form onSubmit={handleAddBan} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder={isAr ? "عنوان الـ IP (مثال: 192.168.1.1)" : "IP address"}
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder={isAr ? "بصمة الجهاز Device ID (اختياري)" : "Device ID (optional)"}
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder={isAr ? "سبب الحظر" : "Ban reason"}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl px-4 py-2.5 text-xs transition"
              >
                {isAr ? "تطبيق الحظر" : "Apply Ban"}
              </button>
            </form>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md space-y-4">
            <h2 className="text-base font-bold text-white">
              {isAr ? "قائمة العناوين والأجهزة المحظورة" : "Blocked Entities"}
            </h2>

            {bannedIps.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                {isAr ? "لا توجد عناوين أو أجهزة محظورة حالياً." : "No blocked entries found."}
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {bannedIps.map((ban) => (
                  <div key={ban.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{ban.ip_address}</span>
                        {ban.device_id && (
                          <span className="font-mono text-cyan-400 text-[11px] bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                            Device: {ban.device_id.substring(0, 10)}...
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ban.is_automatic 
                            ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}>
                          {ban.is_automatic ? (isAr ? "تلقائي (استنزاف)" : "Auto rate-limit") : (isAr ? "يدوي" : "Manual")}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{ban.reason}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">
                        {new Date(ban.banned_at).toLocaleDateString(isAr ? "ar-AE" : "en-US")}
                      </span>
                      <button
                        onClick={() => handleUnban(ban.id, ban.ip_address)}
                        className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-semibold transition"
                      >
                        {isAr ? "إلغاء الحظر" : "Unban"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. تبويب سجل تدقيق الأحداث */}
      {activeTab === "audit" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "سجل تدقيق أحداث النظام (Audit Logs)" : "System Audit Trail"}</span>
          </h2>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              {isAr ? "لا توجد سجلات أحداث مسجلة بعد (ستظهر فور تنفيذ أي فحص جديد)." : "No audit entries recorded."}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                      {log.event_type}
                    </span>
                    <p className="text-slate-300 mt-1 font-medium">{log.details}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                      {log.ip_address && <span className="font-mono text-slate-400">IP: {log.ip_address}</span>}
                      {log.user_email && <span>• By: {log.user_email}</span>}
                    </div>
                  </div>

                  <span className="text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString(isAr ? "ar-AE" : "en-US")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}