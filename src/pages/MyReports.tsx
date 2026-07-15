import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { FileText, MapPin, Clock, WifiOff, ChevronRight, AlertTriangle } from "lucide-react";

type FilterTab = "all" | "submitted" | "pending" | "resolved" | "offline";

const incidentLabels: Record<string, string> = {
  vote_buying: "Vote Buying",
  ballot_snatching: "Ballot Snatching",
  intimidation: "Intimidation",
  bvas_failure: "BVAS Failure",
  overvoting: "Overvoting",
  late_arrival: "Late Arrival",
  other: "Other",
};

const statusConfig: Record<string, { color: string; label: string }> = {
  submitted: { color: "bg-blue-500/20 text-blue-400", label: "Submitted" },
  pending: { color: "bg-amber-500/20 text-amber-400", label: "Pending" },
  resolved: { color: "bg-emerald-500/20 text-emerald-400", label: "Resolved" },
  escalated: { color: "bg-red-500/20 text-red-400", label: "Escalated" },
};

export default function MyReports() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const reportsQuery = trpc.report.list.useQuery(
    filter !== "all" && filter !== "offline"
      ? { status: filter as "submitted" | "pending" | "resolved" | "escalated", limit: 50 }
      : { limit: 50 }
  );

  const allReports = reportsQuery.data?.reports || [];

  // Get offline queue from localStorage
  const offlineQueue = JSON.parse(localStorage.getItem("ojutole_offline_queue") || "[]");

  const filteredReports = filter === "offline"
    ? []
    : filter === "all"
    ? allReports
    : allReports.filter((r) => r.status === filter);

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "pending", label: "Pending" },
    { value: "resolved", label: "Resolved" },
    { value: "offline", label: "Offline" },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-black uppercase tracking-tight text-white mb-4">
          My Reports
        </h1>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === tab.value
                  ? "bg-[#2563EB] text-white"
                  : "glass text-white/50 hover:text-white"
              }`}
            >
              {tab.label}
              {tab.value === "offline" && offlineQueue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-[#0A0E27] text-[10px] font-bold">
                  {offlineQueue.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Offline Queue Section */}
        {filter === "offline" && (
          <div className="space-y-3">
            {offlineQueue.length === 0 ? (
              <div className="text-center py-12">
                <WifiOff size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">No offline reports</p>
                <p className="text-sm text-white/30 mt-1">
                  Reports saved offline will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-[#F59E0B]" />
                  <p className="text-sm text-[#F59E0B]">
                    {offlineQueue.length} report{offlineQueue.length > 1 ? "s" : ""} waiting to sync
                  </p>
                </div>
                {offlineQueue.map((report: Record<string, unknown>, i: number) => (
                  <div key={i} className="glass rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                            Offline
                          </span>
                        </div>
                        <p className="text-white font-medium">
                          {incidentLabels[(report.incidentType as string)] || report.incidentType as string}
                        </p>
                        <p className="text-sm text-white/50 mt-1">
                          {report.lga as string}
                        </p>
                      </div>
                      <WifiOff size={16} className="text-white/30" />
                    </div>
                    <p className="text-xs text-white/30 mt-2">
                      Saved: {new Date(report.submittedAt as string).toLocaleString("en-NG")}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Regular Reports */}
        {filter !== "offline" && (
          <>
            {reportsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-xl shimmer" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={40} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">
                  {filter === "all" ? "No reports yet" : `No ${filter} reports`}
                </p>
                <p className="text-sm text-white/30 mt-1">
                  {filter === "all"
                    ? "Tap the camera button to make your first report"
                    : "Reports with this status will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => {
                  const status = statusConfig[report.status] || statusConfig.submitted;
                  return (
                    <div key={report.id} className="glass rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-white font-medium">
                            {incidentLabels[report.incidentType] || report.incidentType}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-white/40">
                              <MapPin size={10} />
                              {report.lga}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-white/40">
                              <Clock size={10} />
                              {new Date(report.submittedAt).toLocaleDateString("en-NG")}
                            </span>
                          </div>
                          {report.description && (
                            <p className="text-sm text-white/50 mt-2 line-clamp-2">
                              {report.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-white/20 flex-shrink-0 mt-1" />
                      </div>
                    </div>
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
