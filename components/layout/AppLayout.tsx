"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/ui/GlobalSearch";
import DesktopNotifications from "@/components/ui/DesktopNotifications";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Ana içerik — masaüstünde sidebar kadar sola, mobilde tam genişlik */}
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">

        {/* Üst bar */}
        <header className="h-12 px-4 lg:px-6 flex items-center gap-3 border-b border-gray-100 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
          {/* Hamburger — sadece mobilde */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Menüyü aç"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobilde logo göster */}
          <span className="lg:hidden text-sm font-bold tracking-widest text-[#7A4899] uppercase">
            Jagadamba
          </span>

          <div className="flex-1" />

          <GlobalSearch />
        </header>

        {/* Sayfa içeriği */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      <DesktopNotifications />
    </div>
  );
}
