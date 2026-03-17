"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/ui/GlobalSearch";
import DesktopNotifications from "@/components/ui/DesktopNotifications";
import { useAuth } from "@/components/AuthProvider";

const ROLE_LABELS: Record<string, string> = {
  admin: "Yönetici",
  coordinator: "Koordinatör",
  translator: "Tercüman",
  user: "Kullanıcı",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklanınca menüyü kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Yükleniyor veya oturum yoksa
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // AuthProvider yönlendirecek
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Ana içerik */}
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">

        {/* Üst bar */}
        <header className="h-12 px-4 lg:px-6 flex items-center gap-3 border-b border-gray-100 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Menüyü aç"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobilde logo */}
          <span className="lg:hidden text-sm font-bold tracking-widest text-[#7A4899] uppercase">
            Jagadamba
          </span>

          <div className="flex-1" />

          <GlobalSearch />

          {/* Kullanıcı menüsü */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-gray-800 leading-none">{user.name}</p>
                <p className="text-[10px] text-gray-400 leading-none mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-gray-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Sayfa içeriği */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      <DesktopNotifications />
    </div>
  );
}
