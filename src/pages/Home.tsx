import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Shield, Camera, MapPin, TrendingUp, Activity, Users, Phone } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// USHAF HOTLINE - Change this to your actual hotline number
const USHAF_HOTLINE = "+2348012345678";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const statsQuery = trpc.report.getStats.useQuery();
  const recentQuery = trpc.report.getRecent.useQuery({ limit: 5 });

  const stats = statsQuery.data;
  const recent = recentQuery.data || [];

  const statusColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-emerald-500/20 text-emerald-400";
      case "pending": return "bg-amber-500/20 text-amber-400";
      case "escalated": return "bg-red-500/20 text-red-400";
      default: return "bg-blue-500/20 text-blue-400";
    }
  };

  const incidentLabels: Record<string, string> = {
    vote_buying: t("incident.vote_buying"),
    ballot_snatching: t("incident.ballot_snatching"),
    intimidation: t("incident.intimidation"),
    bvas_failure: t("incident.bvas_failure"),
    overvoting: t("incident.overvoting"),
    late_arrival: t("incident.late_arrival"),
    other: t("incident.other"),
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E27]/40 via-transparent to-[#0A0E27]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          {/* Logo */}
          <div className="w-24 h-24 mb-1">
            <img src="/ojutole-logo.png" alt="OJÚTÓLÉ" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(37,99,235,0.6)]" />
          </div>

          {/* App Name */}
          <h1 className="text-3xl font-black tracking-tight text-white" style={{ textShadow: "0 0 40px rgba(37,99,235,0.5)" }}>
            OJÚTÓLÉ
          </h1>
          <p className="text-xs text-white/40 uppercase tracking-[0.3em] -mt-1">{t("hero.tagline")}</p>

          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
            <div className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-pulse-glow" />
            <span className="text-sm font-medium text-white/80">{t("hero.live")}</span>
          </div>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-[1.2]"
              style={{ textShadow: "0 2px 40px rgba(37,99,235,0.4)" }}>
            {t("hero.title")}<br />
            <span className="text-gradient">{t("hero.subtitle")}</span>
          </h2>

          <p className="text-base text-white/65 max-w-md">
            {t("hero.description")}
          </p>

          {/* CTA Buttons */}
          <button
            onClick={() => navigate("/report")}
            className="btn-primary text-lg mt-2 flex items-center gap-2"
          >
            <Camera size={20} />
            {t("hero.cta")}
          </button>

          {/* Call to Report - Hotline Button */}
          <a
            href={`tel:${USHAF_HOTLINE}`}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-emerald-500/40 text-emerald-400 font-medium text-sm hover:bg-emerald-500/10 transition-all active:scale-[0.98]"
          >
            <Phone size={16} />
            <span>Call to Report</span>
            <span className="text-emerald-400/60 text-xs">{USHAF_HOTLINE}</span>
          </a>

          {/* USHAF Nigeria Branding */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full glass-inner">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">{t("hero.poweredBy")}</span>
            <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">USHAF Nigeria</span>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="px-4 -mt-8 relative z-10">
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4">
          {[
            { icon: Activity, label: t("stats.reports"), value: stats?.total || 0, color: "text-[#F59E0B]" },
            { icon: MapPin, label: t("stats.lgas"), value: "30/30", color: "text-[#2563EB]" },
            { icon: Users, label: t("stats.citizens"), value: stats?.total ? stats.total * 3 : 0, color: "text-emerald-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 glass rounded-2xl p-4 snap-start"
            >
              <stat.icon size={20} className={`${stat.color} mb-2`} />
              <p className={`text-2xl font-bold ${stat.color}`}>
                {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-xs text-white/50 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-8">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6">
          {t("hiw.title")}
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", title: t("hiw.step1.title"), desc: t("hiw.step1.desc"), icon: Camera },
            { step: "2", title: t("hiw.step2.title"), desc: t("hiw.step2.desc"), icon: MapPin },
            { step: "3", title: t("hiw.step3.title"), desc: t("hiw.step3.desc"), icon: TrendingUp },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 glass rounded-2xl p-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold">
                {item.step}
              </div>
              <div>
                <h3 className="font-bold text-white">{item.title}</h3>
                <p className="text-sm text-white/60 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            {t("recent.title")}
          </h2>
          <button
            onClick={() => navigate("/reports")}
            className="text-sm text-[#2563EB] font-medium"
          >
            {t("recent.viewAll")}
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Shield size={40} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/50">{t("recent.empty")}</p>
            <button
              onClick={() => navigate("/report")}
              className="mt-4 text-[#2563EB] font-medium text-sm"
            >
              {t("recent.emptyCta")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((report) => (
              <div key={report.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-white font-medium">
                      {incidentLabels[report.incidentType] || report.incidentType}
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                      {report.lga} {report.ward && `· ${report.ward}`}
                    </p>
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(report.submittedAt).toLocaleDateString("en-NG")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Civic Illustration */}
      <section className="px-4 pb-8">
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src="/civic-illustration.jpg"
            alt="Citizens monitoring elections"
            className="w-full h-48 object-cover rounded-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E27] via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-sm font-medium text-white/80">
              {t("hero.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Footer Spacer */}
      <div className="h-8" />
    </div>
  );
}
