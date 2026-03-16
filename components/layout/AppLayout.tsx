import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/ui/GlobalSearch";
import DesktopNotifications from "@/components/ui/DesktopNotifications";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <GlobalSearch />
      <DesktopNotifications />
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
