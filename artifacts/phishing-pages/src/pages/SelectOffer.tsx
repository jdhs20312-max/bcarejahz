import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { addSubmission } from "@/lib/submissions";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Shield, Check, ChevronRight } from "lucide-react";
import { getSettings, type CompanySettings } from "@/lib/settings-api";

const DEFAULT_COMPANY_LOGOS: Record<string, string> = {
  medgulf: "https://manhom.majarracdn.cloud/mgmt/images/44211/1730128444/%D8%B4%D8%B1%D9%83%D8%A9-%D8%A7%D9%84%D9%85%D8%AA%D9%88%D8%B3%D8%B7-%D9%88%D8%A7%D9%84%D8%AE%D9%84%D9%8A%D8%AC-%D9%84%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86-%D9%88%D8%A7%D8%B9%D8%A7%D8%AF%D8%A9-%D8%A7.webp",
  walaa: "https://manhom.majarracdn.cloud/mgmt/images/6399/1730129361/%D9%88%D9%84%D8%A7%D8%A1-%D9%84%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86.webp",
  malath: "https://manhom.majarracdn.cloud/mgmt/images/4457/1730189765/%D9%85%D9%84%D8%A7%D8%B0-%D9%84%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86-%D9%88%D8%A7%D8%B9%D8%A7%D8%AF%D8%A9-%D8%A7%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86-%D8%A7%D9%84%D8%AA%D8%B9%D8%A7%D9%88%D9%86%D9%8A.webp",
  buruj: "https://www.aleqt.com/_next/image?url=https%3A%2F%2Farchive-files.aleqt.com%2Frbitem%2F2022%2F05%2F22%2F1917191-950088230.png&w=1920&q=75",
  axa: "https://amanleek.com/wp-content/uploads/2020/05/AXA-insurance-logo-300-x300.png",
  salama: "https://manhom.majarracdn.cloud/mgmt/images/2169/1730137176/%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A9-%D8%A7%D9%84%D8%A5%D8%B3%D9%84%D8%A7%D9%85%D9%8A%D8%A9-%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9-%D9%84%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86-%D8%B3%D9%84%D8%A7.webp",
  takaful: "https://manhom.majarracdn.cloud/mgmt/images/6738/1730127273/%D8%B4%D8%B1%D9%83%D8%A9-%D8%A7%D9%84%D8%B1%D8%A7%D8%AC%D8%AD%D9%8A-%D9%84%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86-%D8%A7%D9%84%D8%AA%D8%B9%D8%A7%D9%88%D9%86%D9%8A-%D8%AA%D9%83%D8%A7%D9%81.webp",
  tawuniya: "https://manhom.majarracdn.cloud/mgmt/images/4716/1730115516/%D8%B4%D8%B1%D9%83%D8%A9-%D8%A7%D9%84%D8%AA%D8%B9%D8%A7%D9%88%D9%86%D9%8A%D8%A9-%D9%84%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86.webp",
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

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  offers: [
    { id: "walaa", name: "ولاء", price: 530.0, type: "ضد الغير", active: true },
    { id: "medgulf", name: "ميدغلف", price: 540.0, type: "ضد الغير", active: true },
    { id: "malath", name: "ملاذ", price: 555.25, type: "ضد الغير", active: true },
    { id: "buruj", name: "بروج", price: 590.0, type: "ضد الغير", active: true },
    { id: "axa", name: "أكسا", price: 605.0, type: "ضد الغير", active: true },
    { id: "salama", name: "سلامة", price: 620.5, type: "ضد الغير", active: true },
    { id: "tawuniya", name: "التعاونية", price: 685.5, type: "ضد الغير", active: true },
    { id: "takaful", name: "تكافل الراجحي", price: 695.5, type: "ضد الغير", active: true },
    { id: "medgulf_2", name: "ميدغلف", price: 1350.0, type: "شامل", active: true },
    { id: "malath_2", name: "ملاذ", price: 1388.13, type: "شامل", active: true },
    { id: "walaa_2", name: "ولاء", price: 1325.0, type: "شامل", active: true },
    { id: "axa_2", name: "أكسا", price: 1512.5, type: "شامل", active: true },
    { id: "salama_2", name: "سلامة", price: 1551.25, type: "شامل", active: true },
    { id: "buruj_2", name: "بروج", price: 1475.0, type: "شامل", active: true },
    { id: "tawuniya_2", name: "التعاونية", price: 1713.75, type: "شامل", active: true },
    { id: "takaful_2", name: "تكافل الراجحي", price: 1738.75, type: "شامل", active: true },
  ],
};

export default function SelectOffer() {
  const [, setLocation] = useLocation();
  const [insuranceType, setInsuranceType] = useState<"شامل" | "ضد الغير">("ضد الغير");
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem("insuranceType");
    if (saved === "شامل" || saved === "ضد الغير") setInsuranceType(saved);

    getSettings()
      .then(setSettings)
      .catch(() => {
        setSettings(DEFAULT_COMPANY_SETTINGS);
      });
  }, []);

  const companies = settings?.offers || DEFAULT_COMPANY_SETTINGS.offers;
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies
            .filter(offer => offer.type === insuranceType && offer.active)
            .map((company, index) => {
              const discount = company.price * 0.25;
              const afterDiscount = company.price - discount;
              const vat = afterDiscount * 0.15;
              const total = afterDiscount + vat;
              const logoUrl = company.imageUrl || DEFAULT_COMPANY_LOGOS[company.id.replace("_2", "")] || "";

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
                      {logoUrl ? (
                        <img
                          src={logoUrl}
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
