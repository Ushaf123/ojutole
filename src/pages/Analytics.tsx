import { useEffect, useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import html2canvas from "html2canvas";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";

const COLORS = {
  verified: "#16a34a",
  unverified: "#dc2626",
  escalated: "#f59e0b",
  pending: "#2563eb",
  received: "#6b7280",
  triaged: "#8b5cf6",
  underVerification: "#0ea5e9",
  closed: "#9ca3af",
  high: "#16a34a",
  medium: "#f59e0b",
  low: "#dc2626",
};

const INCIDENT_COLORS = [
  "#1a2744", "#2563eb", "#16a34a", "#f59e0b", "#dc2626",
  "#8b5cf6", "#0ea5e9", "#f97316", "#06b6d4", "#84cc16",
];

export default function Analytics() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [downloading, setDownloading] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const downloadPNG = async () => {
    if (!dashboardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: "#f9fafb",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `ojutole-analytics-${new Date().toISOString().split("T")[0]}.png`;
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

  const overview = trpc.analytics.overview.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });
  const byLGA = trpc.analytics.byLGA.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });
  const byType = trpc.analytics.byIncidentType.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });
  const byHour = trpc.analytics.byHour.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });
  const hotspots = trpc.analytics.hotspots.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });
  const patterns = trpc.analytics.patterns.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });
  const confidence = trpc.analytics.confidenceTrend.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });

  useEffect(() => {
    if (overview.data) setLastUpdated(new Date());
  }, [overview.data]);

  const stats = overview.data;
  const isLoading = overview.isLoading;

  // Status data for pie chart
  const statusData = stats
    ? [
        { name: "Verified", value: stats.verified, color: COLORS.verified },
        { name: "Unverified", value: stats.unverified, color: COLORS.unverified },
        { name: "Escalated", value: stats.escalated, color: COLORS.escalated },
        { name: "Pending", value: stats.pending, color: COLORS.pending },
        { name: "Closed", value: stats.closed, color: COLORS.closed },
      ].filter((d) => d.value > 0)
    : [];

  // Confidence data
  const confidenceData = stats
    ? [
        { name: "High", value: stats.highConfidence, color: COLORS.high },
        { name: "Medium", value: stats.mediumConfidence, color: COLORS.medium },
        { name: "Low", value: stats.lowConfidence, color: COLORS.low },
      ].filter((d) => d.value > 0)
    : [];

  const severityBadge = (severity: string) => {
    const classes = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${classes[severity as keyof typeof classes]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media print {
          .min-h-screen { background: white !important; }
          button, a[href="/display"] { display: none !important; }
          .bg-\[1a2744\] { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-\[1a2744\] h1, .bg-\[1a2744\] p { color: black !important; }
          .text-white { color: black !important; }
          .text-gray-300 { color: #333 !important; }
          .text-gray-400 { color: #666 !important; }
          .max-w-7xl { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>
      {/* Header */}
      <div className="bg-[#1a2744] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">OJÚTÓLÉ Analytics Dashboard</h1>
            <p className="text-sm text-gray-300 mt-1">Real-time election monitoring intelligence</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Last updated</p>
              <p className="text-sm font-mono">{lastUpdated.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                autoRefresh
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-600 hover:bg-gray-500 text-white"
              }`}
            >
              {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
            </button>
            <a
              href="/display"
              target="_blank"
              className="px-3 py-1.5 rounded text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition"
            >
              Open Public Display
            </a>
            <button
              onClick={downloadPNG}
              disabled={downloading}
              className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
            >
              {downloading ? "Saving..." : "Download PNG"}
            </button>
            <button
              onClick={printPDF}
              className="px-3 py-1.5 rounded text-sm font-medium bg-gray-600 hover:bg-gray-500 text-white transition"
            >
              Print PDF
            </button>
          </div>
        </div>
      </div>

      <div ref={dashboardRef} className="max-w-7xl mx-auto px-6 py-6 print:p-0 print:max-w-none">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a2744]"></div>
          </div>
        ) : (
          <>
            {/* TOP STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <StatCard title="Total Reports" value={stats?.total || 0} color="bg-[#1a2744]" />
              <StatCard title="Today" value={stats?.today || 0} color="bg-blue-600" />
              <StatCard title="Verified" value={stats?.verified || 0} color="bg-green-600" />
              <StatCard title="Pending" value={stats?.pending || 0} color="bg-blue-500" />
              <StatCard title="Escalated" value={stats?.escalated || 0} color="bg-amber-500" />
              <StatCard title="Unverified" value={stats?.unverified || 0} color="bg-red-500" />
            </div>

            {/* SECOND ROW: VERIFICATION SPEED + CONFIDENCE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Verification Time</p>
                <p className="text-3xl font-bold text-[#1a2744] mt-1">
                  {stats?.avgVerificationMinutes || 0}
                  <span className="text-sm font-normal text-gray-500 ml-1">min</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">From submitted to verified</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Verification Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {stats && stats.total > 0
                    ? Math.round((stats.verified / stats.total) * 100)
                    : 0}
                  <span className="text-sm font-normal text-gray-500 ml-1">%</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Of all reports received</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Escalation Rate</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  {stats && stats.total > 0
                    ? Math.round((stats.escalated / stats.total) * 100)
                    : 0}
                  <span className="text-sm font-normal text-gray-500 ml-1">%</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Require urgent attention</p>
              </div>
            </div>

            {/* EMERGING PATTERNS ALERTS */}
            {patterns.data && patterns.data.alerts.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[#1a2744] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Emerging Patterns & Alerts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {patterns.data.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border-l-4 p-3 bg-white shadow ${
                        alert.severity === "high"
                          ? "border-red-500"
                          : alert.severity === "medium"
                          ? "border-amber-500"
                          : "border-blue-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {severityBadge(alert.severity)}
                        <span className="text-xs text-gray-400">{alert.count} reports</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                      {alert.location && (
                        <p className="text-xs text-gray-500 mt-1">Location: {alert.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHARTS ROW 1: LGA + INCIDENT TYPE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* By LGA */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-[#1a2744] mb-3 uppercase tracking-wide">
                  Reports by LGA
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byLGA.data?.lgAs.slice(0, 10) || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#1a2744" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* By Incident Type */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-[#1a2744] mb-3 uppercase tracking-wide">
                  Reports by Incident Type
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={byType.data?.types || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${(name as string).replace(/_/g, " ")} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {(byType.data?.types || []).map((_, index) => (
                        <Cell key={index} fill={INCIDENT_COLORS[index % INCIDENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHARTS ROW 2: STATUS + HOURLY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-[#1a2744] mb-3 uppercase tracking-wide">
                  Status Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Hourly Timeline */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-[#1a2744] mb-3 uppercase tracking-wide">
                  Hourly Report Volume (Today)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={byHour.data?.hourly.filter((h) => h.count > 0) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHARTS ROW 3: HOTSPOTS + CONFIDENCE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Hotspots */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-[#1a2744] mb-3 uppercase tracking-wide">
                  Top Hotspots
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Location</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Escalated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(hotspots.data?.hotspots || []).map((spot, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 text-gray-800 font-medium">{spot.location}</td>
                          <td className="py-2 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                              {spot.total}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {spot.escalated > 0 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                                {spot.escalated}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!hotspots.data || hotspots.data.hotspots.length === 0) && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-gray-400 text-sm">
                            No hotspots detected yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confidence Trend */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-[#1a2744] mb-3 uppercase tracking-wide">
                  Confidence Trend (Today)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={confidence.data?.hourly.filter((h) => h.high + h.medium + h.low > 0) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="high" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="low" stroke="#dc2626" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FOOTER */}
            <div className="text-center text-xs text-gray-400 py-4 print:hidden">
              OJÚTÓLÉ Analytics Dashboard — Auto-refreshes every 10 seconds — Data is read-only
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-lg shadow p-4 text-white`}>
      <p className="text-xs opacity-80 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
