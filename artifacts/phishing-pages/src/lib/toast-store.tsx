// Toast notification system for admin dashboard
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

// Global toast state
let globalToasts: ToastMessage[] = [];
let listeners: ((toasts: ToastMessage[]) => void)[] = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...globalToasts]));
}

export function toast(type: ToastType, title: string, message?: string) {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const newToast: ToastMessage = { id, type, title, message };
  globalToasts.push(newToast);
  notifyListeners();
  
  // Auto dismiss after 4 seconds
  setTimeout(() => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    notifyListeners();
  }, 4000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter(l => l !== setToasts);
    };
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error": return <XCircle className="w-5 h-5 text-red-600" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case "success": return "bg-green-50 border-green-200";
      case "error": return "bg-red-50 border-red-200";
      case "warning": return "bg-amber-50 border-amber-200";
    }
  };

  const getTitleColor = (type: ToastType) => {
    switch (type) {
      case "success": return "text-green-800";
      case "error": return "text-red-800";
      case "warning": return "text-amber-800";
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 max-w-md">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${getBgColor(t.type)}`}
          >
            <div className="shrink-0 mt-0.5">{getIcon(t.type)}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${getTitleColor(t.type)}`}>{t.title}</p>
              {t.message && (
                <p className="text-xs text-gray-600 mt-0.5">{t.message}</p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
