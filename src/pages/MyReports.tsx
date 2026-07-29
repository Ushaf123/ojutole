import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import {
  FileText, MapPin, Clock, WifiOff, ChevronRight, AlertTriangle,
  ChevronLeft, Camera, Video, Mic, ExternalLink, Image,
  Search, ShieldCheck, Shield, Eye, UserX, RotateCcw, Lock, Users
} from "lucide-react";

type FilterTab = "all" | "my_reports" | "community" | "offline";

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

  // Fetch ALL reports (public API - redacts reporter identity)
  const reportsQuery = trpc.report.list.useQuery(
    { limit: 200 },
    { enabled: true, retry: 2 }
  );
  
  // Debug: log query state
  const queryError = reportsQuery.error?.message;

  // Case ID lookup query
  const caseIdQuery = trpc.report.getByCaseId.useQuery(
    { caseId: caseIdSearch.trim() },
    { enabled: false }
  );

  const allReports = reportsQuery.data?.reports || [];
  const offlineQueue = JSON.parse(localStorage.getItem("ojutole_offline_queue") || "[]");

  // Split into my reports vs community reports
  const myReports = allReports.filter((r) => myReportIds.includes(r.id));
  const communityReports = allReports.filter((r) => !myReportIds.includes(r.id));

  // Apply filter
  let displayReports: typeof allReports = [];
  let sectionTitle = "";

  if (filter === "my_reports") {
    displayReports = myReports;
    sectionTitle = "My Reports";
  } else if (filter === "community") {
    displayReports = communityReports;
    sectionTitle = "Community Reports";
  } else if (filter === "all") {
    displayReports = allReports;
    sectionTitle = "All Reports";
  }

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
    { value: "all", label: `All (${allReports.length})` },
    { value: "my_reports", label: `My Reports (${myReports.length})` },
    { value: "community", label: `Community (${communityReports.length})` },
    { value: "offline", label: `Offline` },
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

  // Helper to check if a report belongs to current user
  const isMyReport = (reportId: number) => myReportIds.includes(reportId);

  // Report Card Component
  const ReportCard = ({ report, isMine }: { report: any; isMine: boolean }) => {
    const st = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
    const StatusIcon = st.icon;
    const hasMedia = report.media && report.media.length > 0;
    const hasLocation = report.latitude && report.longitude;

    if (isMine) {
      // My report - fully clickable
      return (
        <button
          onClick={() => setSelectedReport(report as ReportDetail)}
          className="w-full glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border-l-2 border-[#2563EB]"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-mono text-[#2563EB]/60">{report.caseId}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${st.color} font-medium flex items-center gap-1`}>
                  <StatusIcon size={10} /> {st.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2563EB]/20 text-[#2563EB] font-medium">MY REPORT</span>
              </div>
              <p className="text-white font-medium text-sm">{incidentLabels[report.incidentType] || report.incidentType}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-medium text-white/70 bg-white/5 px-2 py-0.5 rounded">{report.lga}</span>
                {report.ward && <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1"><MapPin size={10} /> {report.ward}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {hasMedia && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1"><Camera size={10} /> {report.media?.length}</span>}
                {hasLocation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1"><MapPin size={10} /> GPS</span>}
              </div>
              {report.description && <p className="text-xs text-white/40 mt-2 line-clamp-2">{report.description}</p>}
              <p className="text-[10px] text-white/30 mt-2">{new Date(report.submittedAt).toLocaleString("en-NG")}</p>
            </div>
            <ChevronRight size={16} className="text-[#2563EB] flex-shrink-0 mt-1" />
          </div>
        </button>
      );
    } else {
      // Community report - NOT clickable, limited info
      return (
        <div className="w-full glass rounded-xl p-4 opacity-60 border-l-2 border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-mono text-white/30">{report.caseId}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${st.color} font-medium flex items-center gap-1`}>
                  <StatusIcon size={10} /> {st.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40 font-medium flex items-center gap-1">
                  <Users size={10} /> Community
                </span>
              </div>
              <p className="text-white/60 font-medium text-sm">{incidentLabels[report.incidentType] || report.incidentType}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded">{report.lga}</span>
                {report.ward && <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded flex items-center gap-1"><MapPin size={10} /> {report.ward}</span>}
              </div>
              {/* Limited info - no media count, no description */}
              <div className="flex items-center gap-2 mt-3">
                <Lock size={12} className="text-white/20" />
                <span className="text-[10px] text-white/20 italic">Reported by another citizen — details protected for privacy</span>
              </div>
              <p className="text-[10px] text-white/20 mt-2">{new Date(report.submittedAt).toLocaleDateString("en-NG")}</p>
            </div>
          </div>
        </div>
      );
    }
  };

  // Report Detail View
  if (selectedReport) {
    // SECURITY CHECK: Only allow viewing details of your own reports
    if (!isMyReport(selectedReport.id)) {
      // Trying to view someone else's report - show limited view
      return (
        <div className="min-h-screen pb-8">
          <div className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedReport(null)} className="w-8 h-8 flex items-center justify-center rounded-full glass">
                <ChevronLeft size={18} className="text-white/60" />
              </button>
              <div>
                <h1 className="text-lg font-black uppercase tracking-tight text-white">{selectedReport.caseId}</h1>
                <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">Community Report</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Lock size={32} className="text-white/20" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Details Protected</h2>
            <p className="text-white/40 text-center max-w-sm mb-4">
              This report was submitted by another citizen. For privacy and security, the full details are only visible to the reporter and the verification team.
            </p>
            <div className="glass rounded-2xl p-4 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-2 h-2 rounded-full ${(STATUS_CONFIG[selectedReport.status]?.color || "").split(" ")[1] || "bg-white/20"}`} />
                <span className="text-sm text-white/60">{incidentLabels[selectedReport.incidentType] || selectedReport.incidentType}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-white/30" />
                <span className="text-sm text-white/60">{selectedReport.lga} LGA</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Clock size={14} className="text-white/30" />
                <span className="text-sm text-white/60">{new Date(selectedReport.submittedAt).toLocaleDateString("en-NG")}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5">
                <span className="text-xs text-white/30">Status: {STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}</span>
              </div>
            </div>
            <button onClick={() => setSelectedReport(null)} className="mt-6 h-10 px-6 rounded-xl glass text-white/60 text-sm font-medium hover:text-white/80">
              Go Back
            </button>
          </div>
        </div>
      );
    }

    // Viewing my own report - show full details
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
              <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">My Report | OJÚTÓLÉ</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full ${st.color} font-medium flex items-center gap-1.5`}>
              <StatusIcon size={12} /> {st.label}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-[#2563EB]/20 text-[#2563EB] font-medium">MY REPORT</span>
          </div>

          {/* Location */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin size={14} /> Location</h2>
            <p className="text-white font-medium">{selectedReport.lga} LGA</p>
            {selectedReport.ward && <p className="text-sm text-white/60 mt-1">{selectedReport.ward}</p>}
            {hasLocation && (
              <div className="mt-3 p-3 rounded-xl bg-white/5 space-y-2">
                <p className="text-xs text-white/40">{selectedReport.latitude?.toFixed(6)}, {selectedReport.longitude?.toFixed(6)}</p>
                <a href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#2563EB] underline"><ExternalLink size={10} /> View on Map</a>
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
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2"><Image size={14} /> Evidence ({selectedReport.media?.length})</h2>
              <div className="space-y-3">
                {selectedReport.media?.map((m, idx) => (
                  <div key={m.id} className="rounded-xl overflow-hidden bg-white/5">
                    {m.mediaType === "photo" && <img src={m.url} alt={`Evidence ${idx + 1}`} className="w-full object-contain max-h-64" />}
                    {m.mediaType === "video" && <video src={m.url} className="w-full" controls />}
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

          <p className="text-xs text-white/40">Submitted: {new Date(selectedReport.submittedAt).toLocaleString("en-NG")}</p>
        </div>
      </div>
    );
  }

  // ==================== MAIN LIST VIEW ====================
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
              placeholder="Enter Case ID to check status..."
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
              <button onClick={() => setSearchedCase(null)} className="text-white/30 hover:text-white/60">
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === tab.value ? "bg-[#2563EB] text-white" : "glass text-white/50 hover:text-white"
              }`}>
              {tab.label}
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
                <p className="text-white/50">No offline reports waiting</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-[#F59E0B]" />
                  <p className="text-sm text-[#F59E0B]">{offlineQueue.length} reports waiting to sync</p>
                </div>
                {offlineQueue.map((report: Record<string, unknown>, i: number) => (
                  <div key={i} className="glass rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">Offline</span>
                        <p className="text-white font-medium">{incidentLabels[report.incidentType as string] || report.incidentType as string}</p>
                        <p className="text-sm text-white/50">{report.lga as string}</p>
                      </div>
                      <WifiOff size={16} className="text-white/30" />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {filter !== "offline" && (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/60">{sectionTitle}</h2>
              <span className="text-[10px] text-white/30">{displayReports.length} reports</span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <span className="text-[10px] text-white/40">My Reports</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-[10px] text-white/40">Community</span>
              </div>
            </div>

            {/* Show query error if any */}
            {queryError && (
              <div className="glass rounded-2xl p-4 mb-4 border border-red-500/30 bg-red-500/10">
                <p className="text-xs text-red-400 font-medium flex items-center gap-2">
                  <AlertTriangle size={14} /> Failed to load reports
                </p>
                <p className="text-[10px] text-white/40 mt-1">{queryError}</p>
                <button 
                  onClick={() => reportsQuery.refetch()} 
                  className="mt-2 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold"
                >
                  Retry
                </button>
              </div>
            )}

            {reportsQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-white/40 text-sm">Loading reports...</p>
              </div>
            ) : reportsQuery.isError ? (
              <div className="text-center py-12">
                <AlertTriangle size={40} className="mx-auto text-red-400/40 mb-3" />
                <p className="text-red-400/60 text-sm">Failed to load reports</p>
                <button 
                  onClick={() => reportsQuery.refetch()} 
                  className="mt-3 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-bold"
                >
                  Try Again
                </button>
              </div>
            ) : displayReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">
                  {filter === "my_reports" ? "No reports from this device yet" : filter === "community" ? "No community reports yet" : "No reports found"}
                </p>
                {allReports.length === 0 && !reportsQuery.isLoading && (
                  <p className="text-white/30 text-xs mt-2">Submit your first report to see it here</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayReports.map((report: any) => (
                  <ReportCard key={report.id} report={report} isMine={isMyReport(report.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
