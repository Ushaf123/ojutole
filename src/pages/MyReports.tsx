import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import {
  FileText, MapPin, Clock, WifiOff, ChevronRight, AlertTriangle,
  ChevronLeft, Camera, Video, Mic, Phone, ExternalLink, Image,
  Search, ShieldCheck, Shield, Eye, UserX, RotateCcw
} from "lucide-react";

type FilterTab = "all" | "received" | "under_verification" | "verified" | "escalated" | "closed" | "offline";

interface ReportDetail {
  id: number;
  caseId: string;
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
  confidence?: string;
  reporterPhone?: string;
  submittedAt: string;
  updatedAt: string;
  media?: Array<{
    id: number;
    mediaType: "photo" | "video" | "audio";
    url: string;
    thumbnail?: string;
    fileName?: string;
  }>;
}

// New workflow status config
const STATUS_CONFIG: Record<string, { color: string; label: string; icon: typeof Clock }> = {
  received: { color: "bg-blue-500/20 text-blue-400", label: "Received", icon: RotateCcw },
  triaged: { color: "bg-purple-500/20 text-purple-400", label: "Triaged", icon: Eye },
  under_verification: { color: "bg-amber-500/20 text-amber-400", label: "Under Verification", icon: Shield },
  verified: { color: "bg-emerald-500/20 text-emerald-400", label: "Verified", icon: ShieldCheck },
  unverified: { color: "bg-red-500/20 text-red-400", label: "Unverified", icon: UserX },
  escalated: { color: "bg-orange-500/20 text-orange-400", label: "Escalated", icon: AlertTriangle },
  closed: { color: "bg-gray-500/20 text-gray-400", label: "Closed", icon: Clock },
};

export default function MyReports() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [caseIdSearch, setCaseIdSearch] = useState("");
  const [searchedCase, setSearchedCase] = useState<any>(null);

  // Get report IDs submitted from this device
  const myReportIds = JSON.parse(localStorage.getItem("ojutole_my_reports") || "[]") as number[];

  // Fetch recent reports but only show ones submitted from this phone
  const reportsQuery = trpc.report.list.useQuery(
    { limit: 100 },
    { enabled: myReportIds.length > 0 }
  );

  // Case ID lookup query
  const caseIdQuery = trpc.report.getByCaseId.useQuery(
    { caseId: caseIdSearch.trim() },
    { enabled: false } // Manual trigger only
  );

  // Filter to only show reports from this device
  const allReports = (reportsQuery.data?.reports || []).filter((r) => myReportIds.includes(r.id));
  const offlineQueue = JSON.parse(localStorage.getItem("ojutole_offline_queue") || "[]");

  const filteredReports = filter === "offline" ? [] : filter === "all" ? allReports : allReports.filter((r) => r.status === filter);

  const incidentLabels: Record<string, string> = {
    vote_buying: t("incident.vote_buying"),
    ballot_snatching: t("incident.ballot_snatching"),
    intimidation: t("incident.intimidation"),
    bvas_failure: t("incident.bvas_failure"),
    overvoting: t("incident.overvoting"),
    late_arrival: t("incident.late_arrival"),
    other: t("incident.other"),
  };

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "received", label: "Received" },
    { value: "under_verification", label: "In Review" },
    { value: "verified", label: "Verified" },
    { value: "escalated", label: "Escalated" },
    { value: "closed", label: "Closed" },
    { value: "offline", label: "Offline" },
  ];

  const handleCaseSearch = async () => {
    if (!caseIdSearch.trim()) return;
    const result = await caseIdQuery.refetch();
    if (result.data) {
      setSearchedCase(result.data);
    } else {
      setSearchedCase(null);
      alert("Case ID not found. Please check the ID and try again.");
    }
  };

  // Report Detail View
  if (selectedReport) {
    const st = STATUS_CONFIG[selectedReport.status] || STATUS_CONFIG.received;
    const hasMedia = selectedReport.media && selectedReport.media.length > 0;
    const hasLocation = selectedReport.latitude && selectedReport.longitude;
    const StatusIcon = st.icon;

    return (
      <div className="min-h-screen pb-8">
        <div className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedReport(null)} className="w-8 h-8 flex items-center justify-center rounded-full glass">
              <ChevronLeft size={18} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">{selectedReport.caseId}</h1>
              <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">Report #{selectedReport.id} | OJÚTÓLÉ</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${st.color} flex items-center gap-1.5`}>
              <StatusIcon size={12} /> {st.label}
            </span>
            <span className="text-xs text-white/40">{incidentLabels[selectedReport.incidentType] || selectedReport.incidentType}</span>
          </div>

          {/* Location */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin size={14} /> Location
            </h2>
            <p className="text-white font-medium">{selectedReport.lga} LGA</p>
            {selectedReport.ward && <p className="text-sm text-white/60 mt-1">{selectedReport.ward}</p>}
            {hasLocation && (
              <div className="mt-3 p-3 rounded-xl bg-white/5 space-y-2">
                <p className="text-xs text-white/40">
                  {selectedReport.latitude?.toFixed(6)}, {selectedReport.longitude?.toFixed(6)}
                </p>
                {selectedReport.locationAddress && (
                  <p className="text-xs text-emerald-400/80">{selectedReport.locationAddress}</p>
                )}
                <a href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#2563EB] underline">
                  <ExternalLink size={10} /> View on Map
                </a>
              </div>
            )}
          </section>

          {/* Description */}
          {selectedReport.description && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Description</h2>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedReport.description}</p>
            </section>
          )}

          {/* Media */}
          {hasMedia && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Image size={14} /> Evidence ({selectedReport.media?.length})
              </h2>
              <div className="space-y-3">
                {selectedReport.media?.map((m, idx) => (
                  <div key={m.id} className="rounded-xl overflow-hidden bg-white/5">
                    {m.mediaType === "photo" && (
                      <img src={m.url} alt={`Evidence ${idx + 1}`} className="w-full object-contain max-h-64" />
                    )}
                    {m.mediaType === "video" && (
                      <video src={m.url} className="w-full" controls />
                    )}
                    {m.mediaType === "audio" && (
                      <div className="p-4 flex items-center gap-3">
                        <Mic size={20} className="text-amber-400" />
                        <audio src={m.url} controls className="flex-1" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

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
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black uppercase tracking-tight text-white">{t("myReports.title")}</h1>
          <span className="text-[10px] text-[#F59E0B] uppercase tracking-wider">OJÚTÓLÉ</span>
        </div>

        {/* Case ID Lookup */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={caseIdSearch}
              onChange={(e) => setCaseIdSearch(e.target.value)}
              placeholder="Enter Case ID (e.g., OJT-20260728-0001)"
              className="w-full h-10 pl-9 pr-3 rounded-xl glass text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
            />
          </div>
          <button
            onClick={handleCaseSearch}
            disabled={!caseIdSearch.trim() || caseIdQuery.isFetching}
            className="h-10 px-4 rounded-xl bg-[#2563EB] text-white text-xs font-bold disabled:opacity-50"
          >
            {caseIdQuery.isFetching ? "..." : "Check"}
          </button>
        </div>

        {/* Searched Case Result */}
        {searchedCase && (
          <div className="glass rounded-xl p-3 mb-4 border border-[#2563EB]/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-[#2563EB]">{searchedCase.caseId}</p>
                <p className="text-sm text-white font-medium">{incidentLabels[searchedCase.incidentType] || searchedCase.incidentType}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CONFIG[searchedCase.status]?.color || ""}`}>
                  {STATUS_CONFIG[searchedCase.status]?.label || searchedCase.status}
                </span>
              </div>
              <button
                onClick={() => setSearchedCase(null)}
                className="text-white/30 hover:text-white/60"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === tab.value ? "bg-[#2563EB] text-white" : "glass text-white/50 hover:text-white"
              }`}>
              {tab.label}
              {tab.value === "offline" && offlineQueue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-[#0A0E27] text-[10px] font-bold">{offlineQueue.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {filter === "offline" && (
          <div className="space-y-3">
            {offlineQueue.length === 0 ? (
              <div className="text-center py-12">
                <WifiOff size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">{t("myReports.noReports")}</p>
                <p className="text-sm text-white/30 mt-1">{t("myReports.noReportsDesc")}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-[#F59E0B]" />
                  <p className="text-sm text-[#F59E0B]">{offlineQueue.length} {t("myReports.offlineWaiting")}</p>
                </div>
                {offlineQueue.map((report: Record<string, unknown>, i: number) => (
                  <div key={i} className="glass rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{t("common.offline")}</span>
                        </div>
                        <p className="text-white font-medium">{incidentLabels[report.incidentType as string] || report.incidentType as string}</p>
                        <p className="text-sm text-white/50 mt-1">{report.lga as string}</p>
                      </div>
                      <WifiOff size={16} className="text-white/30" />
                    </div>
                    <p className="text-xs text-white/30 mt-2">{t("common.saved")}: {new Date(report.submittedAt as string).toLocaleString("en-NG")}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {filter !== "offline" && (
          <>
            {reportsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl shimmer" />)}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">{filter === "all" ? t("myReports.noReports") : t("myReports.noFiltered")}</p>
                <p className="text-sm text-white/30 mt-1">{filter === "all" ? t("myReports.noReportsDesc") : ""}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report: any) => {
                  const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
                  const StatusIcon = status.icon;
                  const hasMedia = report.media && report.media.length > 0;
                  const hasLocation = report.latitude && report.longitude;
                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report as unknown as ReportDetail)}
                      className="w-full glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Case ID */}
                          <p className="text-[10px] font-mono text-[#2563EB]/60 mb-1">{report.caseId}</p>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color} flex items-center gap-1`}>
                              <StatusIcon size={10} /> {status.label}
                            </span>
                            {hasMedia && <span className="text-xs text-purple-400 flex items-center gap-1"><Camera size={10} /> {report.media?.length}</span>}
                            {hasLocation && <span className="text-xs text-emerald-400 flex items-center gap-1"><MapPin size={10} /> GPS</span>}
                          </div>
                          <p className="text-white font-medium">{incidentLabels[report.incidentType] || report.incidentType}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-white/40"><MapPin size={10} />{report.lga}</span>
                            <span className="flex items-center gap-1 text-xs text-white/40"><Clock size={10} />{new Date(report.submittedAt).toLocaleDateString("en-NG")}</span>
                          </div>
                          {report.description && <p className="text-sm text-white/50 mt-2 line-clamp-2">{report.description}</p>}
                        </div>
                        <ChevronRight size={16} className="text-white/20 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
