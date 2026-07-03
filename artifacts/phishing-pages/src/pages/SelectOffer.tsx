import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { addSubmission } from "@/lib/submissions";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Shield, Check, ChevronRight } from "lucide-react";
import { getSettings, type CompanySettings } from "@/lib/settings-api";

const DEFAULT_COMPANY_LOGOS: Record<string, string> = {
  walaa: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop",
  medgulf: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop",
  malath: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=100&h=100&fit=crop",
  buruj: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=100&h=100&fit=crop",
  axa: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&h=100&fit=crop",
  salama: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
  tawuniya: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=100&h=100&fit=crop",
  takaful: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop",
  alrajhi: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=100&h=100&fit=crop",
};

const THIRD_PARTY_FEATURES = [
  "تغطية الأضرار الجسدية للغير",
  "تغطية الأضرار المادية للغير",
  "المسؤولية المدنية",
];

const COMPREHENSIVE_FEATURES = [
  "جميع مزايا ضد الغير",
  "تغطية أضرار سيارتك",
  "سرقة وحريق وكوارث طبيعية",
  "بدل إيجار سيارة عند الحادث",
];

export default function SelectOffer() {
  const [, setLocation] = useLocation();
  const [insuranceType, setInsuranceType] = useState<"شامل" | "ضد الغير">("ضد الغير");
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("insuranceType");
    if (saved === "شامل" || saved === "ضد الغير") setInsuranceType(saved);
    
    // Fetch settings from API
    getSettings()
      .then(setSettings)
      .catch(console.error);
  }, []);

  const companies = (settings?.offers || [])
    .filter(offer => offer.type === insuranceType && offer.active)
    .map(offer => ({
      id: offer.id,
      name: offer.name,
      price: offer.price,
      imageUrl: offer.imageUrl || DEFAULT_COMPANY_LOGOS[offer.id.replace("_2", "")] || "",
    }));

  const features = insuranceType === "شامل" ? COMPREHENSIVE_FEATURES : THIRD_PARTY_FEATURES;

  const handleSelect = (price: number, company: string) => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) { setLocation("/"); return; }
    localStorage.setItem("selectedPrice", price.toString());
    localStorage.setItem("selectedCompany", company);

    addSubmission("select", sessionId, { company, price });

    setLocation("/visa");
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col" dir="rtl">
      <Header />

      <main className="flex-1 p-4">
        {/* Type Toggle */}
        <div className="mb-6">
          <div className="inline-flex rounded-2xl bg-white p-1.5 shadow-sm border border-gray-200">
            <button
              onClick={() => setInsuranceType("ضد الغير")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                insuranceType === "ضد الغير"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ضد الغير
            </button>
            <button
              onClick={() => setInsuranceType("شامل")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                insuranceType === "شامل"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              شامل
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 text-center">
            {companies.length} عرض متاح
          </p>
        </div>

        {/* Company Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company, index) => {
            const discount = company.price * 0.25;
            const afterDiscount = company.price - discount;
            const vat = afterDiscount * 0.15;
            const total = afterDiscount + vat;

            return (
              <div key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-primary/30 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{company.name}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${
                      insuranceType === "شامل"
                        ? "bg-primary/10 text-primary"
                        : "bg-blue-50 text-blue-600"
                    }`}>
                      <Shield className="w-3 h-3" />
                      {insuranceType}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gray-100 p-1 overflow-hidden">
                    {company.imageUrl ? (
                      <img 
                        src={company.imageUrl} 
                        alt={company.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                        {company.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-4 flex-1">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 mt-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-left">
                      <span className="text-2xl font-bold text-gray-900">{total.toFixed(2)}</span>
                      <span className="text-sm text-gray-500 mr-1">ر.س</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 line-through block">{company.price.toFixed(2)} ر.س</span>
                      <span className="text-xs text-green-600 font-medium">خصم 25%</span>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="sm"
                    onClick={() => handleSelect(company.price, company.name)}
                  >
                    اختيار
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
