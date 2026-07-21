import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import {
  FileText, TrendingUp, CheckCircle,
  Clock, Filter, Download, ChevronDown,
  MapPin, Phone, Camera, Video, Mic, X,
  ExternalLink, Image, AudioLines,
  ChevronLeft, Lock, Unlock, AlertTriangle,
  ShieldCheck, Package
} from "lucide-react";

// ADMIN PASSWORD
const ADMIN_PASSWORD = "725289";
const PW_KEY = "ojutole_admin_auth";

// USHAF Hotline
const USHAF_HOTLINE = "+2349034610970";
const HOTLINE_DISPLAY = "09034610970";

interface ReportDetail {
  id: number;
  incidentType: string;
  lga: string;
  ward?: string;
  pollingUnit?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  locationAddress?: string;
  status: string;
  reporterPhone?: string;
  submittedAt: string;
  updatedAt: string;
  media?: Array<{
    id: number;
    reportId: number;
    mediaType: "photo" | "video" | "audio";
    url: string;
    thumbnail?: string;
    fileName?: string;
    fileSize?: number;
    createdAt: string;
  }>;
}

function getFullMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("blob:")) return url;
  const base = window.location.origin;
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

function isAuthenticated(): boolean {
  return localStorage.getItem(PW_KEY) === "true";
}

function authenticate() {
  localStorage.setItem(PW_KEY, "true");
}

function logout() {
  localStorage.removeItem(PW_KEY);
}

// Password Gate Component
function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      authenticate();
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] flex flex-col items-center justify-center px-6">
      <div className="glass rounded-3xl p-8 w-full max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-[#2563EB]" />
        </div>
        <h1 className="text-xl font-black text-white text-center uppercase tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-xs text-white/40 text-center mt-2">
          OJÚTÓLÉ | USHAF Nigeria
        </p>
        <p className="text-sm text-white/50 text-center mt-4">
          This page is password protected.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Enter admin password"
            className="w-full h-12 px-4 rounded-xl glass text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={12} /> Incorrect password
            </p>
          )}
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#2563EB] text-white font-bold flex items-center justify-center gap-2"
          >
            <Unlock size={16} /> Access Dashboard
          </button>
        </form>

        <p className="text-[10px] text-white/20 text-center mt-6">
          Contact USHAF Nigeria for access
        </p>
      </div>
    </div>
  );
}

export default function Admin() {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(isAuthenticated);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [lgaFilter, setLgaFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [backupStatus, setBackupStatus] = useState<"idle" | "loading" | "done">("idle");

  const statsQuery = trpc.report.getStats.useQuery();
  const reportsQuery = trpc.report.list.useQuery(
    {
      status: (statusFilter as "submitted" | "pending" | "resolved" | "escalated") || undefined,
      lga: lgaFilter || undefined,
      limit: 50,
    }
  );
  const lgaQuery = trpc.pollingUnit.getLGAs.useQuery();
  const puStatsQuery = trpc.pollingUnit.stats.useQuery();

  const stats = statsQuery.data;
  const reports = reportsQuery.data?.reports || [];
  const total = stats?.total || 0;
  const resolved = stats?.byStatus.find((s) => s.status === "resolved")?.count || 0;
  const pending = stats?.byStatus.find((s) => s.status === "pending")?.count || 0;

  const incidentLabels: Record<string, string> = {
    vote_buying: t("incident.vote_buying"),
    ballot_snatching: t("incident.ballot_snatching"),
    intimidation: t("incident.intimidation"),
    bvas_failure: t("incident.bvas_failure"),
    overvoting: t("incident.overvoting"),
    late_arrival: t("incident.late_arrival"),
    other: t("incident.other"),
  };

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    submitted: { color: "text-blue-400", bg: "bg-blue-500/20", label: t("status.submitted") },
    pending: { color: "text-amber-400", bg: "bg-amber-500/20", label: t("status.pending") },
    resolved: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: t("status.resolved") },
    escalated: { color: "text-red-400", bg: "bg-red-500/20", label: t("status.escalated") },
  };

  // Export all data as CSV
  const handleExportCSV = () => {
    const rows = reports.map((r) => ({
      ID: r.id,
      Type: incidentLabels[r.incidentType] || r.incidentType,
      LGA: r.lga,
      Ward: r.ward || "",
      Description: (r.description || "").replace(/\n/g, " "),
      Status: r.status,
      Latitude: r.latitude || "",
      Longitude: r.longitude || "",
      Location: r.locationAddress || "",
      Phone: r.reporterPhone || "",
      MediaCount: r.media?.length || 0,
      Submitted: new Date(r.submittedAt).toLocaleString("en-NG"),
    }));

    if (rows.length === 0) {
      alert("No reports to export");
      return;
    }

    const headers = Object.keys(rows[0]).join(",");
    const csv = [headers, ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(","))].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OJUTOLÉ-Reports-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupStatus("done");
    setTimeout(() => setBackupStatus("idle"), 3000);
  };

  if (!authenticated) {
    return <PasswordGate onSuccess={() => setAuthenticated(true)} />;
  }

  // Report Detail View
  if (selectedReport) {
    const st = statusConfig[selectedReport.status] || statusConfig.submitted;
    const hasMedia = selectedReport.media && selectedReport.media.length > 0;
    const hasLocation = selectedReport.latitude && selectedReport.longitude;

    return (
      <div className="min-h-screen bg-[#0A0E27] pb-8">
        <div className="glass border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedReport(null)} className="w-8 h-8 flex items-center justify-center rounded-full glass">
              <ChevronLeft size={18} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">Report #{selectedReport.id}</h1>
              <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">OJÚTÓLÉ | USHAF Nigeria</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full ${st.bg} ${st.color} font-medium`}>{st.label}</span>
            <span className="text-xs text-white/40">{incidentLabels[selectedReport.incidentType] || selectedReport.incidentType}</span>
          </div>

          {/* Location */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin size={14} /> Location
            </h2>
            <div className="space-y-2">
              <p className="text-white font-medium">{selectedReport.lga} LGA</p>
              {selectedReport.ward && <p className="text-sm text-white/60">Ward: {selectedReport.ward}</p>}
              {selectedReport.pollingUnit && <p className="text-sm text-white/60">PU: {selectedReport.pollingUnit}</p>}

              {hasLocation && (
                <div className="mt-3 p-3 rounded-xl bg-white/5 space-y-2">
                  <p className="text-xs text-white/40">
                    Lat: {selectedReport.latitude?.toFixed(6)}, Lng: {selectedReport.longitude?.toFixed(6)}
                  </p>
                  {selectedReport.locationAccuracy && (
                    <p className="text-xs text-white/40">Accuracy: ±{Math.round(selectedReport.locationAccuracy)}m</p>
                  )}
                  {selectedReport.locationAddress && (
                    <p className="text-xs text-emerald-400/80">{selectedReport.locationAddress}</p>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#2563EB] underline"
                  >
                    <ExternalLink size={10} /> View Exact Location on Google Maps
                  </a>
                </div>
              )}

              {!hasLocation && (
                <p className="text-xs text-amber-400/60 mt-2">No GPS coordinates captured</p>
              )}
            </div>
          </section>

          {/* Description */}
          {selectedReport.description && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} /> Description
              </h2>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedReport.description}</p>
            </section>
          )}

          {/* Media Attachments */}
          {hasMedia && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Image size={14} /> Evidence Attachments ({selectedReport.media?.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {selectedReport.media?.map((m, idx) => {
                  const fullUrl = getFullMediaUrl(m.url);
                  return (
                    <div key={m.id} className="relative rounded-xl overflow-hidden bg-white/5">
                      {m.mediaType === "photo" && (
                        <>
                          <img src={fullUrl} alt={`Evidence ${idx + 1}`} className="w-full aspect-square object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white/80 flex items-center gap-1">
                            <Camera size={10} /> Photo
                          </div>
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-[#2563EB] flex items-center gap-1">
                            <ExternalLink size={10} /> Open
                          </a>
                        </>
                      )}
                      {m.mediaType === "video" && (
                        <>
                          <video src={fullUrl} className="w-full aspect-square object-cover" controls />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white/80 flex items-center gap-1">
                            <Video size={10} /> Video
                          </div>
                        </>
                      )}
                      {m.mediaType === "audio" && (
                        <div className="p-4 flex flex-col items-center justify-center aspect-square">
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-2">
                            <AudioLines size={24} className="text-amber-400" />
                          </div>
                          <audio src={fullUrl} controls className="w-full max-w-[200px]" />
                          <div className="mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
                            <Mic size={10} /> Voice Note
                          </div>
                          {m.fileName && <p className="text-[10px] text-white/30 mt-1 truncate max-w-full">{m.fileName}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Reporter Info */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Phone size={14} /> Reporter
            </h2>
            {selectedReport.reporterPhone ? (
              <a href={`tel:${selectedReport.reporterPhone}`} className="text-sm text-[#2563EB] flex items-center gap-2">
                <Phone size={14} /> {selectedReport.reporterPhone}
              </a>
            ) : (
              <p className="text-sm text-white/40">No phone number provided (anonymous)</p>
            )}
          </section>

          {/* Timestamps */}
          <section className="glass rounded-2xl p-4">
            <div className="space-y-1">
              <p className="text-xs text-white/40">Submitted: {new Date(selectedReport.submittedAt).toLocaleString("en-NG")}</p>
              <p className="text-xs text-white/40">Updated: {new Date(selectedReport.updatedAt).toLocaleString("en-NG")}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-[#0A0E27]">
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">{t("admin.title")}</h1>
            <p className="text-xs text-[#F59E0B] mt-1">{t("admin.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>

        {/* Hotline */}
        <a
          href={`tel:${USHAF_HOTLINE}`}
          className="flex items-center gap-2 mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Phone size={12} /> USHAF Hotline: <span className="font-bold">{HOTLINE_DISPLAY}</span>
        </a>

        {/* Logout + Backup buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              backupStatus === "done"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-[#2563EB]/20 text-[#2563EB]"
            }`}
          >
            {backupStatus === "done" ? <CheckCircle size={12} /> : <Package size={12} />}
            {backupStatus === "done" ? "Downloaded!" : "Download All Data"}
          </button>
          <button
            onClick={() => { logout(); setAuthenticated(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60"
          >
            <Lock size={12} /> Lock
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* PU Stats */}
        {puStatsQuery.data && (
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Osun State Coverage</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{puStatsQuery.data.totalLGAs}</p>
                <p className="text-[10px] text-white/40 uppercase">LGAs</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{puStatsQuery.data.totalWards}</p>
                <p className="text-[10px] text-white/40 uppercase">Wards</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{puStatsQuery.data.totalPollingUnits.toLocaleString()}</p>
                <p className="text-[10px] text-white/40 uppercase">Polling Units</p>
              </div>
            </div>
            <p className="text-[10px] text-white/20 mt-2 text-center">{puStatsQuery.data.source}</p>
          </section>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: FileText, label: t("admin.totalReports"), value: total, color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
            { icon: TrendingUp, label: t("admin.activeToday"), value: total, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
            { icon: CheckCircle, label: t("admin.resolved"), value: resolved, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: Clock, label: t("admin.pending"), value: pending, color: "text-amber-400", bg: "bg-amber-500/10" },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Incident Type Breakdown */}
        {stats?.byType && stats.byType.length > 0 && (
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">{t("admin.byType")}</h2>
            <div className="space-y-3">
              {stats.byType.map((item) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.incidentType}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/80">{incidentLabels[item.incidentType] || item.incidentType}</span>
                      <span className="text-sm font-medium text-white">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#FF4D6D] transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top LGAs */}
        {stats?.byLGA && stats.byLGA.length > 0 && (
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">{t("admin.topLGAs")}</h2>
            <div className="space-y-2">
              {stats.byLGA.map((item, i) => (
                <div key={item.lga} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-white/30 font-mono">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">{item.lga}</span>
                      <span className="text-sm text-white/50">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 mt-1">
                      <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reports Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">{t("admin.recentReports")}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-xs text-white/60">
                <Filter size={12} /> Filter <ChevronDown size={10} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="glass rounded-xl p-3 mb-3 space-y-2 animate-slide-up">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent">
                <option value="">All Statuses</option>
                <option value="submitted">{t("status.submitted")}</option>
                <option value="pending">{t("status.pending")}</option>
                <option value="resolved">{t("status.resolved")}</option>
                <option value="escalated">{t("status.escalated")}</option>
              </select>
              <select value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent">
                <option value="">{t("locator.allLGAs")}</option>
                {(lgaQuery.data || []).map((lga) => <option key={lga} value={lga}>{lga}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <FileText size={32} className="mx-auto text-white/20 mb-2" />
                <p className="text-white/40 text-sm">{t("myReports.noReports")}</p>
              </div>
            ) : (
              reports.map((report) => {
                const st = statusConfig[report.status] || statusConfig.submitted;
                const hasMedia = report.media && report.media.length > 0;
                const hasLocation = report.latitude && report.longitude;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report as unknown as ReportDetail)}
                    className="w-full glass rounded-2xl p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color} font-medium`}>{st.label}</span>
                          {hasMedia && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                              <Image size={10} /> {report.media?.length}
                            </span>
                          )}
                          {hasLocation && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                              <MapPin size={10} /> GPS
                            </span>
                          )}
                        </div>
                        <p className="text-white font-medium text-sm">{incidentLabels[report.incidentType] || report.incidentType}</p>

                        {/* LGA + Ward */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-xs font-medium text-white/70 bg-white/5 px-2 py-0.5 rounded">{report.lga}</span>
                          {report.ward && (
                            <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                              <MapPin size={10} /> {report.ward}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {report.description && (
                          <p className="text-xs text-white/40 mt-2 line-clamp-2">{report.description}</p>
                        )}

                        {/* Exact Date & Time */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                          <Clock size={12} className="text-white/30" />
                          <span className="text-xs text-white/50">
                            {new Date(report.submittedAt).toLocaleString("en-NG", {
                              weekday: "short", year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
                            })}
                          </span>
                        </div>

                        <p className="text-[10px] text-[#2563EB]/60 mt-1">Tap to view full details, media & location</p>
                      </div>
                      <ChevronDown size={16} className="text-white/20 flex-shrink-0 mt-1 rotate-[-90deg]" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
