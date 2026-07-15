import { useLocation, useNavigate } from "react-router";
import { Home, Camera, MapPin, FileText, Menu } from "lucide-react";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const tabs = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/report", icon: Camera, label: "Report" },
    { path: "/locator", icon: MapPin, label: "Locator" },
    { path: "/reports", icon: FileText, label: "Reports" },
    { path: "/more", icon: Menu, label: "More" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0A0E27] overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 glass border-t border-white/10">
        <div className="flex items-center justify-around h-full max-w-lg mx-auto">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            const Icon = tab.icon;
            const isCenter = tab.path === "/report";

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all duration-200 ${
                  active ? "text-[#2563EB]" : "text-white/40"
                }`}
              >
                {isCenter ? (
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                      active
                        ? "bg-[#2563EB] shadow-lg shadow-[#2563EB]/40"
                        : "bg-white/10"
                    }`}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </div>
                ) : (
                  <>
                    <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-[#2563EB]" : ""}`}>
                      {tab.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
