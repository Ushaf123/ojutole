import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import {
  FileText, CheckCircle, Clock, MapPin, Phone, Camera, Video, Mic,
  X, ExternalLink, ChevronLeft, Lock, Unlock, AlertTriangle,
  ShieldCheck, Package, Shield, Eye, UserX, RotateCcw, History,
  Award, StickyNote, Search, ChevronDown, ShieldAlert
} from "lucide-react";

const ADMIN_TOKEN_KEY = "ojutole_admin_token";
const ADMIN_ROLE_KEY = "ojutole_admin_role";
const ADMIN_NAME_KEY = "ojutole_admin_name";

type AdminRole = "verifier" | "supervisor" | null;

interface AdminSession {
  token: string;
  role: AdminRole;
  name: string;
}

function getSession(): AdminSession | null {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const role = localStorage.getItem(ADMIN_ROLE_KEY) as AdminRole;
  const name = localStorage.getItem(ADMIN_NAME_KEY);
  if (!token || !role) return null;
  return { token, role, name: name || role };
}

function setSession(token: string, role: string, name: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_ROLE_KEY, role);
  localStorage.setItem(ADMIN_NAME_KEY, name);
}

function clearSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_ROLE_KEY);
  localStorage.removeItem(ADMIN_NAME_KEY);
}

// Status config
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  received: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Received" },
  triaged: { color: "text-purple-400", bg: "bg-purple-500/20", label: "Triaged" },
  under_verification: { color: "text-amber-400", bg: "bg-amber-500/20", label: "Under Verification" },
  verified: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Verified" },
  unverified: { color: "text-red-400", bg: "bg-red-500/20", label: "Unverified" },
  escalated: { color: "text-orange-400", bg: "bg-orange-500/20", label: "Escalated" },
  closed: { color: "text-gray-400", bg: "bg-gray-500/20", label: "Closed" },
};

const CONFIDENCE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "High" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/20", label: "Medium" },
  low: { color: "text-red-400", bg: "bg-red-500/20", label: "Low" },
};

const WORKFLOW_STATUSES = ["received", "triaged", "under_verification", "verified", "unverified", "escalated", "closed"];

function getFullMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("blob:")) return url;
  const base = window.location.origin;
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

// ============================================================
// LOGIN GATE
// ============================================================
function LoginGate({ onSuccess }: { onSuccess: (role: AdminRole, name: string) => void }) {
  const [role, setRole] = useState<"verifier" | "supervisor">("verifier");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: (data) => {
      setLoading(false);
      if (data.success && data.token) {
        setSession(data.token, data.user.role, data.user.name);
        onSuccess(data.user.role as AdminRole, data.user.name);
      } else {
        setError(data.error || "Login failed");
      }
    },
    onError: (err) => {
      setLoading(false);
      setError(err.message || "Invalid credentials");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    loginMutation.mutate({ role, password });
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] flex flex-col items-center justify-center px-6">
      <div className="glass rounded-3xl p-8 w-full max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
          <Shield size={28} className="text-[#2563EB]" />
        </div>
        <h1 className="text-xl font-black text-white text-center uppercase tracking-tight">Verification Desk</h1>
        <p className="text-xs text-white/40 text-center mt-2">OJÚTÓLÉ | USHAF Nigeria</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setRole("verifier"); setError(""); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                role === "verifier" ? "bg-[#2563EB] text-white" : "glass text-white/40 hover:text-white/60"
              }`}>
              <Eye size={14} className="mx-auto mb-1" />
              Verifier
            </button>
            <button type="button" onClick={() => { setRole("supervisor"); setError(""); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                role === "supervisor" ? "bg-[#F59E0B] text-white" : "glass text-white/40 hover:text-white/60"
              }`}>
              <ShieldCheck size={14} className="mx-auto mb-1" />
              Supervisor
            </button>
          </div>

          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Enter password" className="w-full h-12 px-4 rounded-xl glass text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50" autoFocus />

          {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>}

          <button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl bg-[#2563EB] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Clock size={16} className="animate-spin" /> : <Unlock size={16} />}
            {loading ? "Authenticating..." : "Access Desk"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ADMIN
// ============================================================
export default function Admin() {
  const { t } = useLanguage();
  const [session, setSessionState] = useState<AdminSession | null>(getSession);
  const [statusFilter, setStatusFilter] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [caseIdSearch, setCaseIdSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [quickDate, setQuickDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<"idle" | "done">("idle");
  const [noteText, setNoteText] = useState("");
  const [showSecurityLog, setShowSecurityLog] = useState(false);

  const role = session?.role || null;
  const isSupervisor = role === "supervisor";

  // Validate session token on load
  const meQuery = trpc.adminAuth.me.useQuery(
    { token: session?.token || "" },
    { enabled: !!session?.token, retry: 0 }
  );

  // Auto-logout if token is invalid
  if (meQuery.isError || (meQuery.data && !meQuery.data.authenticated)) {
    clearSession();
    if (session) {
      setSessionState(null);
      window.location.reload();
    }
  }

  // Queries
  const statsQuery = trpc.report.getStats.useQuery(undefined, { enabled: !!role, retry: 1 });
  const reportsQuery = trpc.report.listAdmin.useQuery(
    { status: statusFilter || undefined, lga: lgaFilter || undefined, caseId: caseIdSearch || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined, limit: 500 },
    { enabled: !!role, retry: 1 }
  );
  const lgaQuery = trpc.pollingUnit.getLGAs.useQuery(undefined, { enabled: !!role, retry: 1 });
  const securityLogQuery = trpc.adminAuth.activityLog.useQuery(
    undefined,
    { enabled: !!role && isSupervisor && showSecurityLog, retry: 1 }
  );
  const detailQuery = trpc.report.getByIdAdmin.useQuery(
    { id: selectedReport?.id || 0 },
    { enabled: !!selectedReport?.id && !!role, retry: 1 }
  );

  // Show query errors
  const queryError = reportsQuery.error?.message || statsQuery.error?.message;

  const utils = trpc.useUtils();

  // Mutations
  const triageMutation = trpc.report.triage.useMutation({ onSuccess: () => { invalidateAll(); } });
  const startVerMutation = trpc.report.startVerification.useMutation({ onSuccess: () => { invalidateAll(); } });
  const verifyMutation = trpc.report.verify.useMutation({ onSuccess: () => { invalidateAll(); } });
  const unverifyMutation = trpc.report.markUnverified.useMutation({ onSuccess: () => { invalidateAll(); } });
  const escalateMutation = trpc.report.escalate.useMutation({ onSuccess: () => { invalidateAll(); } });
  const closeMutation = trpc.report.close.useMutation({ onSuccess: () => { invalidateAll(); } });
  const addNoteMutation = trpc.report.addNote.useMutation({ onSuccess: () => { invalidateAll(); setNoteText(""); } });

  function invalidateAll() {
    utils.report.listAdmin.invalidate();
    utils.report.getStats.invalidate();
    utils.report.getByIdAdmin.invalidate();
  }

  const stats = statsQuery.data;
  const reports = reportsQuery.data?.reports || [];
  const total = stats?.total || 0;

  const incidentLabels: Record<string, string> = {
    vote_buying: t("incident.vote_buying"),
    ballot_snatching: t("incident.ballot_snatching"),
    intimidation: t("incident.intimidation"),
    bvas_failure: t("incident.bvas_failure"),
    overvoting: t("incident.overvoting"),
    late_arrival: t("incident.late_arrival"),
    other: t("incident.other"),
  };

  // Quick date filter
  function applyQuickDate(filter: string) {
    setQuickDate(filter);
    const now = new Date();
    const iso = (d: Date) => d.toISOString().split("T")[0];
    if (filter === "today") { setFromDate(iso(now)); setToDate(iso(now)); }
    else if (filter === "7days") { const d = new Date(now); d.setDate(d.getDate() - 7); setFromDate(iso(d)); setToDate(iso(now)); }
    else if (filter === "30days") { const d = new Date(now); d.setDate(d.getDate() - 30); setFromDate(iso(d)); setToDate(iso(now)); }
    else { setFromDate(""); setToDate(""); }
  }

  // CSV Export
  const handleExportCSV = () => {
    if (reports.length === 0) { alert("No reports to export"); return; }
    const headers = ["CaseID", "ID", "Type", "LGA", "Ward", "Confidence", "Status", "Description", "Latitude", "Longitude", "Location", "Phone", "MediaCount", "Submitted"];
    const rows = reports.map((r: any) => [
      r.caseId, r.id, incidentLabels[r.incidentType] || r.incidentType, r.lga, r.ward || "",
      r.confidence, STATUS_CONFIG[r.status]?.label || r.status,
      (r.description || "").replace(/\n/g, " "), r.latitude || "", r.longitude || "",
      r.locationAddress || "", r.reporterPhone || "", r.media?.length || 0,
      new Date(r.submittedAt).toLocaleString("en-NG")
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OJUTOLÉ-Reports-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupStatus("done");
    setTimeout(() => setBackupStatus("idle"), 3000);
  };

  // Full backup download
  const handleBackupDownload = async () => {
    try {
      const resp = await fetch("/api/trpc/report.backup", {
        headers: { "x-admin-token": localStorage.getItem("ojutole_admin_token") || "" },
      });
      if (!resp.ok) { alert("Backup failed. Check login."); return; }
      const result = await resp.json();
      const data = result.result?.data || result;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OJUTOLÉ-Full-Backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Backup download failed"); }
  };

  const handleLogin = (role: AdminRole, name: string) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
    setSessionState({ token, role, name });
  };

  const handleLogout = () => {
    clearSession();
    setSessionState(null);
    setSelectedReport(null);
  };

  // Status action handler
  const handleStatusChange = (reportId: number, action: string) => {
    switch (action) {
      case "triaged": triageMutation.mutate({ id: reportId }); break;
      case "under_verification": startVerMutation.mutate({ id: reportId }); break;
      case "verified": verifyMutation.mutate({ id: reportId }); break;
      case "unverified": unverifyMutation.mutate({ id: reportId }); break;
      case "escalated": escalateMutation.mutate({ id: reportId }); break;
      case "closed": closeMutation.mutate({ id: reportId }); break;
    }
  };

  // Available actions based on role
  const getAvailableActions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      received: ["triaged", "escalated"],
      triaged: ["under_verification", "escalated"],
      under_verification: ["verified", "unverified", "escalated"],
      verified: ["escalated", "closed"],
      unverified: ["closed"],
      escalated: ["closed"],
      closed: [],
    };
    const allowed = transitions[currentStatus] || [];
    if (isSupervisor) return allowed;
    return allowed.filter((s) => ["triaged", "under_verification"].includes(s));
  };

  // Show login if not authenticated
  if (!role) {
    return <LoginGate onSuccess={handleLogin} />;
  }

  // Report detail view
  if (selectedReport) {
    const report = detailQuery.data || selectedReport;
    const st = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
    const conf = CONFIDENCE_CONFIG[report.confidence] || CONFIDENCE_CONFIG.low;
    const hasMedia = report.media && report.media.length > 0;
    const hasLocation = report.latitude && report.longitude;
    const auditLog = report.auditLog || [];
    const availableActions = getAvailableActions(report.status);

    return (
      <div className="min-h-screen bg-[#0A0E27] pb-8">
        <div className="glass border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedReport(null)} className="w-8 h-8 flex items-center justify-center rounded-full glass">
              <ChevronLeft size={18} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">{report.caseId}</h1>
              <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">Report #{report.id}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Status + Confidence */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full ${st.bg} ${st.color} font-bold`}>{st.label}</span>
            <span className={`text-xs px-3 py-1.5 rounded-full ${conf.bg} ${conf.color} font-medium`}>{conf.label} Confidence</span>
          </div>

          {/* Workflow Timeline */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <History size={14} /> Timeline
            </h2>
            <div className="relative pl-4 border-l-2 border-white/10 space-y-3">
              {[
                { label: "Received", time: report.submittedAt, active: true },
                { label: "Triaged", time: report.triagedAt, active: !!report.triagedAt },
                { label: "Under Verification", time: null, active: report.status === "under_verification" },
                { label: "Verified", time: report.verifiedAt, active: !!report.verifiedAt },
                { label: "Escalated", time: report.escalatedAt, active: !!report.escalatedAt },
                { label: "Closed", time: report.closedAt, active: !!report.closedAt },
              ].map((step, i) => (
                <div key={i} className={`relative ${step.active ? "opacity-100" : "opacity-30"}`}>
                  <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 ${step.active ? "bg-[#2563EB] border-[#2563EB]" : "bg-transparent border-white/30"}`} />
                  <p className="text-xs font-medium text-white">{step.label}</p>
                  {step.time && <p className="text-[10px] text-white/40">{new Date(step.time).toLocaleString("en-NG")}</p>}
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          {availableActions.length > 0 && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Actions</h2>
              <p className="text-[10px] text-white/30 mb-3">Logged in as: <span className="text-[#F59E0B]">{role}</span></p>
              <div className="flex flex-wrap gap-2">
                {availableActions.map((action) => {
                  const cfg = STATUS_CONFIG[action];
                  return (
                    <button key={action} onClick={() => handleStatusChange(report.id, action)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${cfg.bg} ${cfg.color} hover:brightness-125`}>
                      Mark {cfg.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Location */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin size={14} /> Location</h2>
            <p className="text-white font-medium">{report.lga} LGA</p>
            {report.ward && <p className="text-sm text-white/60">Ward: {report.ward}</p>}
            {hasLocation && (
              <div className="mt-3 p-3 rounded-xl bg-white/5">
                <p className="text-xs text-white/40">{report.latitude?.toFixed(6)}, {report.longitude?.toFixed(6)}</p>
                <a href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#2563EB] underline mt-1"><ExternalLink size={10} /> View on Google Maps</a>
              </div>
            )}
          </section>

          {/* Description */}
          {report.description && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14} /> Description</h2>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{report.description}</p>
            </section>
          )}

          {/* Media */}
          {hasMedia && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Evidence ({report.media?.length})</h2>
              <div className="grid grid-cols-2 gap-3">
                {report.media?.map((m: any, idx: number) => {
                  const fullUrl = getFullMediaUrl(m.url);
                  return (
                    <div key={m.id} className="relative rounded-xl overflow-hidden bg-white/5">
                      {m.mediaType === "photo" && (
                        <><img src={fullUrl} alt={`Evidence ${idx + 1}`} className="w-full aspect-square object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-black/60 text-white/80 flex items-center gap-1"><Camera size={10} /> Photo</div></>
                      )}
                      {m.mediaType === "video" && (
                        <><video src={fullUrl} className="w-full aspect-square object-cover" controls />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-black/60 text-white/80 flex items-center gap-1"><Video size={10} /> Video</div></>
                      )}
                      {m.mediaType === "audio" && (
                        <div className="p-4 flex flex-col items-center justify-center aspect-square">
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-2"><Mic size={24} className="text-amber-400" /></div>
                          <audio src={fullUrl} controls className="w-full max-w-[200px]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Internal Notes */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2"><StickyNote size={14} /> Internal Notes</h2>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {report.notes && report.notes.length > 0 ? (
                report.notes.map((n: any) => (
                  <div key={n.id} className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-white/70">{n.note}</p>
                    <p className="text-[10px] text-white/30 mt-1">{n.authorName} ({n.authorRole}) · {new Date(n.createdAt).toLocaleString("en-NG")}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/30 italic">No internal notes yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note..."
                className="flex-1 h-9 px-3 rounded-lg glass text-xs text-white placeholder:text-white/30 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteText.trim()) {
                    addNoteMutation.mutate({ reportId: report.id, note: noteText.trim() });
                  }
                }}
              />
              <button onClick={() => {
                if (noteText.trim()) {
                  addNoteMutation.mutate({ reportId: report.id, note: noteText.trim() });
                }
              }} disabled={!noteText.trim() || addNoteMutation.isPending}
                className="h-9 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-bold disabled:opacity-50">
                {addNoteMutation.isPending ? "..." : "Add"}
              </button>
            </div>
          </section>

          {/* Audit Trail */}
          {auditLog.length > 0 && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2"><History size={14} /> Audit Trail</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {auditLog.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70"><span className="font-medium text-white/90">{entry.action.replace(/_/g, " ")}</span>
                        {entry.oldStatus && entry.newStatus && <span className="text-white/50">: {entry.oldStatus} → {entry.newStatus}</span>}</p>
                      {entry.note && <p className="text-[10px] text-white/40 mt-0.5">{entry.note}</p>}
                      <p className="text-[10px] text-white/30 mt-0.5">{entry.operatorName} ({entry.operatorRole}) · {new Date(entry.timestamp).toLocaleString("en-NG")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reporter info - supervisor only */}
          {isSupervisor && (
            <section className="glass rounded-2xl p-4 border border-amber-500/20">
              <h2 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2"><Phone size={14} /> Reporter Identity (Supervisor Only)</h2>
              {report.reporterPhone ? <a href={`tel:${report.reporterPhone}`} className="text-sm text-[#2563EB] flex items-center gap-2"><Phone size={14} /> {report.reporterPhone}</a> : <p className="text-sm text-white/40">Anonymous report</p>}
            </section>
          )}

          <p className="text-xs text-white/40">Submitted: {new Date(report.submittedAt).toLocaleString("en-NG")}</p>
        </div>
      </div>
    );
  }

  // ==================== MAIN DASHBOARD ====================
  return (
    <div className="min-h-screen pb-8 bg-[#0A0E27]">
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">{t("admin.title")}</h1>
            <p className="text-xs text-[#F59E0B] mt-1">{t("admin.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-emerald-400">Live</span></div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isSupervisor ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-[#2563EB]/20 text-[#2563EB]"}`}>{role} Mode</span>
          <span className="text-[10px] text-white/30">{isSupervisor ? "Can verify/escalate/close" : "Can triage/review"}</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleExportCSV} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${backupStatus === "done" ? "bg-emerald-500/20 text-emerald-400" : "bg-[#2563EB]/20 text-[#2563EB]"}`}>
            {backupStatus === "done" ? <CheckCircle size={12} /> : <Package size={12} />}{backupStatus === "done" ? "Downloaded!" : "Export CSV"}</button>
          {isSupervisor && <button onClick={handleBackupDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium"><Package size={12} /> Full Backup</button>}
          {isSupervisor && <button onClick={() => setShowSecurityLog(!showSecurityLog)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${showSecurityLog ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/40 hover:text-white/60"}`}><ShieldAlert size={12} /> Security Log</button>}
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60"><Lock size={12} /> Logout</button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: FileText, label: "Total Reports", value: total, color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
            { icon: ShieldCheck, label: "Verified", value: stats?.byStatus?.find((s: any) => s.status === "verified")?.count || 0, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: AlertTriangle, label: "Escalated", value: stats?.byStatus?.find((s: any) => s.status === "escalated")?.count || 0, color: "text-orange-400", bg: "bg-orange-500/10" },
            { icon: Clock, label: "Received", value: stats?.byStatus?.find((s: any) => s.status === "received")?.count || 0, color: "text-blue-400", bg: "bg-blue-500/10" },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}><stat.icon size={16} className={stat.color} /></div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Security Log Panel - Supervisor Only */}
        {isSupervisor && showSecurityLog && (
          <div className="glass rounded-2xl p-4 space-y-3 border border-red-500/20">
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2"><ShieldAlert size={14} /> Security Log</h2>
            <p className="text-[10px] text-white/30">Tracks all login attempts, failures, and lockouts</p>
            {securityLogQuery.isLoading ? (
              <div className="flex items-center justify-center py-6"><div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : securityLogQuery.data && securityLogQuery.data.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {securityLogQuery.data.slice().reverse().map((log: any) => (
                  <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.action === "login_success" ? "bg-emerald-400" : log.action === "login_failure" ? "bg-red-400" : "bg-white/20"}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-white/70">
                        <span className="font-mono text-[10px] text-white/40">{new Date(log.timestamp).toLocaleString("en-NG")}</span>
                        {" — "}
                        <span className={log.action === "login_success" ? "text-emerald-400" : log.action === "login_failure" ? "text-red-400" : "text-white/50"}>
                          {log.action.replace("_", " ").toUpperCase()}
                        </span>
                      </p>
                      {log.role && <p className="text-[10px] text-white/40">Role: {log.role}</p>}
                      {log.ip && <p className="text-[10px] text-white/30 font-mono">IP: {log.ip}</p>}
                      {log.details && <p className="text-[10px] text-white/30 italic">{log.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 py-4 text-center">No security events yet</p>
            )}
          </div>
        )}

        {/* Search & Archive Panel */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2"><Search size={14} /> Case Archive & Search</h2>

          {/* Case ID Search */}
          <div className="flex gap-2">
            <input type="text" value={caseIdSearch} onChange={(e) => setCaseIdSearch(e.target.value)}
              placeholder="Search by Case ID or Report #..." className="flex-1 h-10 px-4 rounded-xl glass text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50" />
            {caseIdSearch && <button onClick={() => setCaseIdSearch("")} className="h-10 px-3 rounded-xl glass text-white/40 hover:text-white/60"><X size={14} /></button>}
          </div>

          {/* Quick Date Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {["", "today", "7days", "30days"].map((q) => {
              const labels: Record<string, string> = { "": "All Time", today: "Today", "7days": "Last 7 Days", "30days": "Last 30 Days" };
              return (
                <button key={q} onClick={() => applyQuickDate(q)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${quickDate === q ? "bg-[#2563EB] text-white" : "glass text-white/40 hover:text-white/60"}`}>
                  {labels[q]}
                </button>
              );
            })}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <div className="flex-1"><label className="text-[10px] text-white/30 uppercase mb-1 block">From</label>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setQuickDate(""); }} className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent focus:outline-none" /></div>
            <div className="flex-1"><label className="text-[10px] text-white/30 uppercase mb-1 block">To</label>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setQuickDate(""); }} className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent focus:outline-none" /></div>
          </div>

          {/* Status + LGA */}
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 h-9 px-3 rounded-lg glass text-xs text-white bg-transparent">
              <option value="">All Statuses</option>
              {WORKFLOW_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
            </select>
            <select value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)} className="flex-1 h-9 px-3 rounded-lg glass text-xs text-white bg-transparent">
              <option value="">All LGAs</option>
              {(lgaQuery.data || []).map((lga: string) => <option key={lga} value={lga}>{lga}</option>)}
            </select>
          </div>

          <p className="text-[10px] text-white/30 text-center">{reports.length} of {reportsQuery.data?.total || 0} reports</p>
        </div>

        {/* Reports Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">{t("admin.recentReports")}</h2>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-xs text-white/60"><ChevronDown size={10} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} /> Filters</button>
          </div>

          {showFilters && (
            <div className="glass rounded-xl p-3 mb-3 space-y-2">
              <button onClick={() => { setStatusFilter(""); setLgaFilter(""); setCaseIdSearch(""); setFromDate(""); setToDate(""); setQuickDate(""); }} className="w-full h-9 rounded-lg bg-[#2563EB]/20 text-[#2563EB] text-xs font-bold">Clear All Filters</button>
            </div>
          )}

          {/* Error display */}
          {queryError && (
            <div className="glass rounded-2xl p-4 border border-red-500/30 bg-red-500/10">
              <p className="text-xs text-red-400 font-medium flex items-center gap-2"><AlertTriangle size={14} /> Error: {queryError}</p>
              <p className="text-[10px] text-white/40 mt-1">Try logging out and back in. If problem persists, contact support.</p>
            </div>
          )}

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <FileText size={32} className="mx-auto text-white/20 mb-2" />
                <p className="text-white/40 text-sm">
                  {reportsQuery.isLoading ? "Loading reports..." : queryError ? "Failed to load reports" : "No reports found"}
                </p>
                {reportsQuery.isLoading && <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mt-3" />}
              </div>
            ) : (
              reports.map((report: any) => {
                const st = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
                const conf = CONFIDENCE_CONFIG[report.confidence] || CONFIDENCE_CONFIG.low;
                const hasMedia = report.media && report.media.length > 0;
                const hasLocation = report.latitude && report.longitude;
                return (
                  <button key={report.id} onClick={() => setSelectedReport(report)} className="w-full glass rounded-2xl p-4 text-left hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono text-[#2563EB]/60">{report.caseId}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color} font-medium`}>{st.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${conf.bg} ${conf.color}`}>{conf.label}</span>
                        </div>
                        <p className="text-white font-medium text-sm">{incidentLabels[report.incidentType] || report.incidentType}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-xs font-medium text-white/70 bg-white/5 px-2 py-0.5 rounded">{report.lga}</span>
                          {report.ward && <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1"><MapPin size={10} /> {report.ward}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {hasMedia && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">{report.media?.length} files</span>}
                          {hasLocation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1"><MapPin size={10} /> GPS</span>}
                        </div>
                        {report.description && <p className="text-xs text-white/40 mt-2 line-clamp-2">{report.description}</p>}
                        <p className="text-[10px] text-white/30 mt-2">{new Date(report.submittedAt).toLocaleString("en-NG")}</p>
                      </div>
                      <ChevronLeft size={16} className="text-white/20 flex-shrink-0 mt-1 rotate-180" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
