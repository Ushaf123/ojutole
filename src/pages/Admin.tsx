import { useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  FileText, TrendingUp, CheckCircle,
  Clock, Filter, Download, ChevronDown
} from "lucide-react";

const incidentLabels: Record<string, string> = {
  vote_buying: "Vote Buying",
  ballot_snatching: "Ballot Snatching",
  intimidation: "Intimidation",
  bvas_failure: "BVAS Failure",
  overvoting: "Overvoting",
  late_arrival: "Late Arrival",
  other: "Other",
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  submitted: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Submitted" },
  pending: { color: "text-amber-400", bg: "bg-amber-500/20", label: "Pending" },
  resolved: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Resolved" },
  escalated: { color: "text-red-400", bg: "bg-red-500/20", label: "Escalated" },
};

export default function Admin() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [lgaFilter, setLgaFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const statsQuery = trpc.report.getStats.useQuery();
  const reportsQuery = trpc.report.list.useQuery(
    {
      status: (statusFilter as "submitted" | "pending" | "resolved" | "escalated") || undefined,
      lga: lgaFilter || undefined,
      limit: 50,
    }
  );
  const lgaQuery = trpc.pollingUnit.getLGAs.useQuery();

  const stats = statsQuery.data;
  const reports = reportsQuery.data?.reports || [];

  const total = stats?.total || 0;
  const resolved = stats?.byStatus.find((s) => s.status === "resolved")?.count || 0;
  const pending = stats?.byStatus.find((s) => s.status === "pending")?.count || 0;

  return (
    <div className="min-h-screen pb-8 bg-[#0A0E27]">
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              OJÚTÓLÉ Admin
            </h1>
            <p className="text-xs text-[#F59E0B] mt-1">USHAF Nigeria · Election Monitoring Center</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: FileText, label: "Total Reports", value: total, color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
            { icon: TrendingUp, label: "Active Today", value: total, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
            { icon: CheckCircle, label: "Resolved", value: resolved, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: Clock, label: "Pending", value: pending, color: "text-amber-400", bg: "bg-amber-500/10" },
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
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Reports by Type
            </h2>
            <div className="space-y-3">
              {stats.byType.map((item) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.incidentType}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/80">
                        {incidentLabels[item.incidentType] || item.incidentType}
                      </span>
                      <span className="text-sm font-medium text-white">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#FF4D6D] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
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
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Top LGAs by Reports
            </h2>
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
                      <div
                        className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                        style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                      />
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
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Recent Reports
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-xs text-white/60"
              >
                <Filter size={12} />
                Filter
                <ChevronDown size={10} />
              </button>
              <button
                onClick={() => {
                  const csv = reports.map((r) =>
                    `${r.id},${r.incidentType},${r.lga},${r.status},${new Date(r.submittedAt).toISOString()}`
                  ).join("\n");
                  const blob = new Blob([`ID,Type,LGA,Status,Date\n${csv}`], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "ojutole-reports-ushaf-nigeria.csv";
                  a.click();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-xs text-white/60"
              >
                <Download size={12} />
                CSV
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="glass rounded-xl p-3 mb-3 space-y-2 animate-slide-up">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent"
              >
                <option value="">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
              <select
                value={lgaFilter}
                onChange={(e) => setLgaFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent"
              >
                <option value="">All LGAs</option>
                {(lgaQuery.data || []).map((lga) => (
                  <option key={lga} value={lga}>{lga}</option>
                ))}
              </select>
            </div>
          )}

          {/* Table */}
          <div className="glass rounded-2xl overflow-hidden">
            {reports.length === 0 ? (
              <div className="p-8 text-center">
                <FileText size={32} className="mx-auto text-white/20 mb-2" />
                <p className="text-white/40 text-sm">No reports found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase">LGA</th>
                      <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => {
                      const st = statusConfig[report.status] || statusConfig.submitted;
                      return (
                        <tr key={report.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-sm text-white">
                            {incidentLabels[report.incidentType] || report.incidentType}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60">{report.lga}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/40">
                            {new Date(report.submittedAt).toLocaleDateString("en-NG")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
