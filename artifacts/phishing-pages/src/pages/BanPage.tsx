import { useEffect, useState } from "react";

export default function BanPage() {
  const [message, setMessage] = useState("جاري التحميل...");

  useEffect(() => {
    // Try to unblock after some time or show contact info
    const timer = setTimeout(() => {
      setMessage("يرجى التواصل مع الدعم الفني لإلغاء الحظر");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          تم حظرك من استخدام هذا الموقع
        </h1>

        {/* Reasons */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-6">
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

        {/* Contact Info */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-amber-400 mb-4">معلومات التواصل</h2>
          <p className="text-slate-300 text-center">
            {message}
          </p>
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-sm text-center mt-8">
          © 2025 Bcare - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
