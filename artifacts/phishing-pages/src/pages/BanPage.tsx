import { useEffect, useState } from "react";
import { checkVisitorBlocked } from "@/lib/api";

export default function BanPage() {
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let intervalId: number | null = null;

    async function checkUnblocked() {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        setChecking(false);
        return;
      }

      try {
        const result = await checkVisitorBlocked(sessionId);
        if (!result.blocked) {
          // User has been unblocked! Redirect to home
          setRedirecting(true);
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
          if (intervalId) clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error checking block status:", error);
      } finally {
        setChecking(false);
      }
    }

    // Initial check
    checkUnblocked();

    // Check every 3 seconds for unblock
    intervalId = window.setInterval(checkUnblocked, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {redirecting ? (
          <>
            {/* Success Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                <svg
                  className="w-12 h-12 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-green-400 mb-4">
              تم إلغاء الحظر!
            </h1>
            <p className="text-slate-300">
              جاري توجيهك للصفحة الرئيسية...
            </p>
          </>
        ) : (
          <>
            {/* Warning Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-6">
              تم حظرك من استخدام هذا الموقع
            </h1>

            {/* Reasons */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-6 text-right">
              <h2 className="text-lg font-semibold text-red-400 mb-4">الأسباب المحتملة:</h2>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">•</span>
                  <span>ربما قمت بمخالفة للسياسات والأنظمة</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">•</span>
                  <span>ربما قمت بتكرار عمليات الإرسال غير ناجحة مما أدى إلى حظرك</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">•</span>
                  <span>محاولة الوصول لصفحات غير مصرح بها</span>
                </li>
              </ul>
            </div>

            {/* Auto-unblock notice */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>جاري التحقق من حالة الحظر تلقائياً</span>
              </div>
              <p className="text-slate-400 text-sm">
                سيتم توجيهك تلقائياً للصفحة الرئيسية عند إلغاء الحظر
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <p className="text-slate-500 text-sm text-center mt-8">
          © 2025 Bcare - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
