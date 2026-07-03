import { Link, useLocation } from "wouter";

export function Header() {
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* زر اللغة - جهة اليسار */}
        <div className="flex items-center">
          <span className="text-sm font-bold text-[#004b8d] cursor-pointer">EN</span>
        </div>

        {/* الشعار - في المنتصف */}
        <Link href="/">
          <div className="cursor-pointer flex items-center">
            <img
              src="https://bcare.com.sa/assets/images/Bcare-logo.svg"
              alt="Bcare Logo"
              className="h-10 md:h-12 w-auto"
            />
          </div>
        </Link>

        {/* أيقونة المستخدم - جهة اليمين */}
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-[#004b8d] flex items-center justify-center text-white border border-[#004b8d]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        {/* رابط تسجيل الدخول في حال كنت في صفحة الأدمن */}
        {isAdminPage && (
          <div className="absolute left-4 top-20 bg-white p-2 shadow-lg rounded-lg">
            <Link href="/admin">
              <span className="text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer">
                تسجيل الدخول
              </span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
