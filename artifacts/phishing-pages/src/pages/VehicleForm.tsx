import { useState } from "react";
import { useLocation } from "wouter";
import { addSubmission, ensureSessionId } from "@/lib/submissions";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1919 + 1 }, (_, i) => currentYear - i);

function SelectField({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-gray-700 text-right block">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          dir="rtl"
        >
          {children}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

export default function VehicleForm() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const [insuranceType, setInsuranceType] = useState<"شامل" | "ضد الغير">("ضد الغير");
  const [vehicleType, setVehicleType] = useState("");
  const [manufactureYear, setManufactureYear] = useState(String(currentYear - 3));
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [usagePurpose, setUsagePurpose] = useState("شخصي");
  const [carValue, setCarValue] = useState("");

  const handleCarValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setCarValue(raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) { setLocation("/"); return; }

    // Save insurance type so SelectOffer page can use it
    localStorage.setItem("insuranceType", insuranceType);
    setLoading(true);
    try {
      addSubmission("vehicle", sessionId, {
        insuranceType,
        vehicleType,
        manufactureYear,
        startDate,
        usagePurpose,
        carValue: carValue || undefined,
      });
      setLocation("/select");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col" dir="rtl">
      <Header />

      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto p-5 md:p-7">
          <h1 className="text-xl font-bold text-primary mb-5 pb-3 border-b border-gray-100">
            تفاصيل المركبة والتأمين
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Vehicle type */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700 text-right block">نوع المركبة</Label>
              <Input
                type="text"
                required
                value={vehicleType}
                onChange={e => setVehicleType(e.target.value)}
                placeholder="مثال: تويوتا، هيونداي، كيا"
                className="h-12 text-base text-right"
                dir="rtl"
              />
            </div>

            {/* Insurance type */}
            <SelectField label="نوع التأمين" value={insuranceType} onChange={(v) => setInsuranceType(v as "شامل" | "ضد الغير")}>
              <option value="ضد الغير">ضد الغير</option>
              <option value="شامل">شامل</option>
            </SelectField>

            {/* Manufacture year */}
            <SelectField label="سنة الصنع" value={manufactureYear} onChange={setManufactureYear}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </SelectField>

            {/* Start date */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700 text-right block">تاريخ بدء التأمين</Label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-12 text-base text-right"
                dir="rtl"
              />
            </div>

            {/* Usage purpose */}
            <SelectField label="الغرض من استخدام المركبة" value={usagePurpose} onChange={setUsagePurpose}>
              <option value="شخصي">شخصي</option>
              <option value="تجاري">تجاري</option>
              <option value="أجرة">أجرة</option>
              <option value="حكومي">حكومي</option>
            </SelectField>

            {/* Car value — always visible */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700 text-right block">
                القيمة التقديرية للمركبة (ر.س)
                {insuranceType === "شامل" && <span className="text-red-400 mr-1">*</span>}
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  required={insuranceType === "شامل"}
                  inputMode="numeric"
                  value={carValue ? Number(carValue).toLocaleString("en") : ""}
                  onChange={handleCarValue}
                  placeholder="مثال: 50,000"
                  className="h-12 text-base text-right pr-14"
                  dir="rtl"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">ر.س</span>
              </div>
              <p className="text-xs text-gray-400 text-right">الحد الأقصى: 1,500,000 ر.س</p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white mt-2"
              disabled={loading}
            >
              {loading ? "جاري المعالجة..." : "متابعة — عرض الأسعار"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
