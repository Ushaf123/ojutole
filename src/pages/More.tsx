import { useState } from "react";
import {
  Info, Shield, Phone, Globe, Bell, Database,
  ChevronRight, ExternalLink, BookOpen, Heart, WifiOff
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function More() {
  const { user, logout } = useAuth();
  const [offlineMode, setOfflineMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const menuSections = [
    {
      title: "Information",
      items: [
        {
          icon: Info,
          label: "About OJÚTÓLÉ",
          desc: "Learn about our mission for electoral transparency",
          action: () => alert("OJÚTÓLÉ (The Eye That Watches) is a civic tech innovation from USHAF Nigeria, enabling Nigerian citizens to report electoral irregularities in real-time. OJÚTÓLÉ was built for the Osun State gubernatorial election pilot to strengthen electoral transparency, civic engagement, and credible participation.\n\nPowered by USHAF Nigeria — developing technology for social good."),
        },
        {
          icon: BookOpen,
          label: "How to Report",
          desc: "Step-by-step guide to making effective reports",
          action: () => alert("1. Select incident type\n2. Choose your LGA and Ward\n3. Capture photo/video/voice evidence\n4. Add a description\n5. Submit! Your report will be reviewed by election monitors."),
        },
        {
          icon: Shield,
          label: "Safety Tips",
          desc: "Stay safe while monitoring elections",
          action: () => alert("\u2022 Always prioritize your personal safety\n\u2022 Do not confront violators directly\n\u2022 Report from a safe distance\n\u2022 Use the app discreetly\n\u2022 Have an exit plan\n\u2022 Report anonymously if needed"),
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          icon: WifiOff,
          label: "Offline Mode",
          desc: "Save reports for later submission",
          toggle: true,
          value: offlineMode,
          onToggle: () => setOfflineMode(!offlineMode),
        },
        {
          icon: Bell,
          label: "Notifications",
          desc: "Get updates on your reports",
          toggle: true,
          value: notifications,
          onToggle: () => setNotifications(!notifications),
        },
        {
          icon: Globe,
          label: "Language",
          desc: "English / Yoruba",
          action: () => alert("Language selection coming soon!"),
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: Phone,
          label: "Contact Support",
          desc: "Get help with the app",
          action: () => window.open("tel:+2348000000000"),
        },
        {
          icon: Heart,
          label: "Partner With Us",
          desc: "NGOs, CSOs, and election bodies",
          action: () => alert("Thank you for your interest in partnering with USHAF Nigeria on OJÚTÓLÉ! Please email ushafnigeria@gmail.com"),
        },
        {
          icon: ExternalLink,
          label: "Visit USHAF Nigeria",
          desc: "Learn more about our work",
          action: () => alert("Visit USHAF Nigeria to learn more about our civic tech innovations."),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-6">
        {/* USHAF Nigeria Branding */}
        <div className="flex items-center gap-2 mb-4">
          <img src="/ojutole-logo.png" alt="OJÚTÓLÉ" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              OJÚTÓLÉ
            </h1>
            <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">Powered by USHAF Nigeria</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2563EB] to-[#F59E0B] flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{user?.name || "Citizen Reporter"}</p>
            <p className="text-sm text-white/50">{user?.email || "Anonymous User"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* App Stats */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Database size={16} className="text-[#2563EB]" />
            <span className="text-sm font-semibold text-white/60">App Data</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-[#F59E0B]">30</p>
              <p className="text-[10px] text-white/40 uppercase">LGAs</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#2563EB]">480+</p>
              <p className="text-[10px] text-white/40 uppercase">Polling Units</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">7</p>
              <p className="text-[10px] text-white/40 uppercase">Incident Types</p>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full glass rounded-xl p-3 flex items-center gap-3 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon size={16} className="text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-white/40">{item.desc}</p>
                  </div>
                  {item.toggle ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onToggle?.();
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                        item.value ? "bg-[#2563EB]" : "bg-white/20"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          item.value ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  ) : (
                    <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Legal */}
        <section>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 px-1">
            Legal
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => alert("Privacy Policy: OJÚTÓLÉ by USHAF Nigeria is committed to protecting your privacy. We collect minimal data, anonymize locations to ~100m accuracy, and never share personal information with third parties without consent.\n\nPowered by USHAF Nigeria — developing technology for social good.")}
              className="w-full glass rounded-xl p-3 text-left text-sm text-white/60 hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => alert("Terms of Service: By using OJÚTÓLÉ, you agree to use the platform responsibly for reporting genuine electoral irregularities. False reports may be flagged and removed.\n\nOJÚTÓLÉ is an innovation of USHAF Nigeria, developed to strengthen electoral transparency and civic engagement in Nigeria.")}
              className="w-full glass rounded-xl p-3 text-left text-sm text-white/60 hover:text-white transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </section>

        {/* Version */}
        <div className="text-center pt-4 space-y-1">
          <p className="text-xs text-white/20">OJÚTÓLÉ v1.0.0 · Pilot Release</p>
          <p className="text-[10px] text-[#F59E0B]/60 uppercase tracking-wider">An Innovation of USHAF Nigeria</p>
        </div>

        {/* Logout */}
        {user && (
          <button
            onClick={() => logout()}
            className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
          >
            Log Out
          </button>
        )}
      </div>
    </div>
  );
}
