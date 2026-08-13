import { useEffect, useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import html2canvas from "html2canvas";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

const COLORS = {
  verified: "#16a34a",
  unverified: "#dc2626",
  escalated: "#f59e0b",
  pending: "#2563eb",
  closed: "#9ca3af",
};

const INCIDENT_COLORS = [
  "#1a2744", "#2563eb", "#16a34a", "#f59e0b", "#dc2626",
  "#8b5cf6", "#0ea5e9", "#f97316",
];

export default function PublicDisplay() {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const overview = trpc.analytics.overview.useQuery(undefined, {
    refetchInterval: 30000, // 30 seconds for public display
  });
  const byLGA = trpc.analytics.byLGA.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const byType = trpc.analytics.byIncidentType.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const byHour = trpc.analytics.byHour.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const hotspots = trpc.analytics.hotspots.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const patterns = trpc.analytics.patterns.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const stats = overview.data;

  const statusData = stats
    ? [
        { name: "Verified", value: stats.verified, color: COLORS.verified },
        { name: "Unverified", value: stats.unverified, color: COLORS.unverified },
        { name: "Escalated", value: stats.escalated, color: COLORS.escalated },
        { name: "Pending", value: stats.pending, color: COLORS.pending },
        { name: "Closed", value: stats.closed, color: COLORS.closed },
      ].filter((d) => d.value > 0)
    : [];

  const dashboardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadPNG = async () => {
    if (!dashboardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: "#0f172a",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `ojutole-display-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      alert("Download failed. Try again.");
    }
    setDownloading(false);
  };

  const printPDF = () => {
    window.print();
  };

  return (
    <div ref={dashboardRef} className="min-h-screen bg-[#0f172a] text-white overflow-hidden">
      <style>{`
        @media print {
          .min-h-screen { background: white !important; }
          button { display: none !important; }
          .bg-\[\#0f172a\] { background: white !important; }
          .bg-\[\#1a2744\] { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-\[\#1e293b\] { background: #f5f5f5 !important; border: 1px solid #ddd !important; }
          .text-white { color: black !important; }
          .text-gray-200 { color: #333 !important; }
          .text-gray-300 { color: #333 !important; }
          .text-gray-400 { color: #666 !important; }
          .border-amber-500 { border-color: #333 !important; }
        }
      `}</style>
      {/* TOP HEADER BAR */}
      <div className="bg-[#1a2744] px-8 py-4 flex items-center justify-between border-b-4 border-amber-500">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-[#1a2744] text-2xl font-bold">O</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">OJÚTÓLÉ</h1>
            <p className="text-sm text-gray-300">Election Monitoring Dashboard</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-4xl font-mono font-bold">{clock.toLocaleTimeString("en-NG", { hour12: false })}</p>
            <p className="text-sm text-gray-400">{clock.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex flex-col gap-1.5 print:hidden">
            <button
              onClick={downloadPNG}
              disabled={downloading}
              className="px-2 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
            >
              {downloading ? "..." : "PNG"}
            </button>
            <button
              onClick={printPDF}
              className="px-2 py-1 rounded text-xs font-medium bg-gray-600 hover:bg-gray-500 text-white transition"
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6">
        {/* BIG NUMBER ROW */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <BigNumber
            label="TOTAL REPORTS"
            value={stats?.total || 0}
            color="border-blue-500"
          />
          <BigNumber
            label="VERIFIED"
            value={stats?.verified || 0}
            color="border-green-500"
          />
          <BigNumber
            label="PENDING"
            value={stats?.pending || 0}
            color="border-blue-400"
          />
          <BigNumber
            label="ESCALATED"
            value={stats?.escalated || 0}
            color="border-amber-500"
          />
          <BigNumber
            label="UNVERIFIED"
            value={stats?.unverified || 0}
            color="border-red-500"
          />
        </div>

        {/* ALERTS BANNER */}
        {patterns.data && patterns.data.alerts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <h2 className="text-xl font-bold text-red-400">EMERGING ALERTS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {patterns.data.alerts.slice(0, 3).map((alert, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-4 border-l-4 ${
                    alert.severity === "high"
                      ? "bg-red-900/40 border-red-500"
                      : alert.severity === "medium"
                      ? "bg-amber-900/40 border-amber-500"
                      : "bg-blue-900/40 border-blue-500"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        alert.severity === "high"
                          ? "bg-red-500 text-white"
                          : alert.severity === "medium"
                          ? "bg-amber-500 text-black"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-300">{alert.count} reports</span>
                  </div>
                  <p className="text-lg font-semibold">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHARTS ROW 1 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* LGA Chart */}
          <div className="bg-[#1e293b] rounded-xl p-5">
            <h3 className="text-lg font-bold text-gray-200 mb-4 uppercase tracking-wide">
              Reports by LGA
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byLGA.data?.lgAs.slice(0, 8) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" fontSize={12} tick={{ fill: "#94a3b8" }} />
                <YAxis dataKey="name" type="category" width={120} fontSize={12} tick={{ fill: "#e2e8f0" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Incident Type */}
          <div className="bg-[#1e293b] rounded-xl p-5">
            <h3 className="text-lg font-bold text-gray-200 mb-4 uppercase tracking-wide">
              Incident Types
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={byType.data?.types || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${(name as string).replace(/_/g, " ").substring(0, 12)} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {(byType.data?.types || []).map((_, index) => (
                    <Cell key={index} fill={INCIDENT_COLORS[index % INCIDENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHARTS ROW 2 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Hourly Volume */}
          <div className="bg-[#1e293b] rounded-xl p-5">
            <h3 className="text-lg font-bold text-gray-200 mb-4 uppercase tracking-wide">
              Hourly Volume (Today)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={byHour.data?.hourly.filter((h) => h.count > 0) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" fontSize={12} tick={{ fill: "#94a3b8" }} />
                <YAxis fontSize={12} tick={{ fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status Breakdown */}
          <div className="bg-[#1e293b] rounded-xl p-5">
            <h3 className="text-lg font-bold text-gray-200 mb-4 uppercase tracking-wide">
              Status Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HOTSPOTS TABLE */}
        <div className="bg-[#1e293b] rounded-xl p-5 mb-6">
          <h3 className="text-lg font-bold text-gray-200 mb-4 uppercase tracking-wide">
            Top Hotspots
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-600">
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-300 uppercase">Location</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-300 uppercase">Total Reports</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-300 uppercase">Escalated</th>
                </tr>
              </thead>
              <tbody>
                {(hotspots.data?.hotspots || []).slice(0, 8).map((spot, i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 text-gray-200 font-medium text-base">{spot.location}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">
                        {spot.total}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {spot.escalated > 0 ? (
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white font-bold text-lg">
                          {spot.escalated}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-lg">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!hotspots.data || hotspots.data.hotspots.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400 text-lg">
                      No hotspots detected yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER TICKER */}
        <div className="bg-[#1a2744] rounded-lg px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-gray-300">Live Data — Auto-refreshes every 30 seconds</span>
          </div>
          <div className="text-sm text-gray-400">
            USHAF Nigeria — The Eye That Watches — {stats?.total || 0} reports monitored
          </div>
        </div>
      </div>
    </div>
  );
}

function BigNumber({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-[#1e293b] rounded-xl p-5 border-t-4 ${color}`}>
      <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-5xl font-bold text-white mt-2">{value}</p>
    </div>
  );
}
