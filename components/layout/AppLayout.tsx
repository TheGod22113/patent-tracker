import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/ui/GlobalSearch";
import DesktopNotifications from "@/components/ui/DesktopNotifications";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Üst bar — arama butonu burada, sayfa içeriğiyle çakışmaz */}
        <header className="h-12 px-8 flex items-center justify-end border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <GlobalSearch />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
      <DesktopNotifications />
    </div>
  );
}
