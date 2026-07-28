import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import {
  FileText, TrendingUp, CheckCircle, Clock, Filter, Download,
  ChevronDown, MapPin, Phone, Camera, Video, Mic, X, ExternalLink,
  Image, AudioLines, ChevronLeft, Lock, Unlock, AlertTriangle,
  ShieldCheck, Package, Shield, Eye, MessageSquare, UserCheck,
  UserX, Send, RotateCcw, History, Award, StickyNote
} from "lucide-react";

// Role management
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

// USHAF Hotline
const USHAF_HOTLINE = "+2349034610970";
const HOTLINE_DISPLAY = "09034610970";

// ============================================================
// STATUS CONFIG (Full Workflow)
// ============================================================
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  received:      { color: "text-blue-400",       bg: "bg-blue-500/20",       label: "Received",            icon: Package },
  triaged:       { color: "text-purple-400",     bg: "bg-purple-500/20",     label: "Triaged",             icon: Eye },
  under_verification: { color: "text-amber-400", bg: "bg-amber-500/20",      label: "Under Verification",  icon: Shield },
  verified:      { color: "text-emerald-400",    bg: "bg-emerald-500/20",    label: "Verified",            icon: CheckCircle },
  unverified:    { color: "text-red-400",        bg: "bg-red-500/20",        label: "Unverified",          icon: UserX },
  escalated:     { color: "text-orange-400",     bg: "bg-orange-500/20",     label: "Escalated",           icon: AlertTriangle },
  closed:        { color: "text-gray-400",       bg: "bg-gray-500/20",       label: "Closed",              icon: Lock },
};

// Workflow transitions: status → [allowed next statuses]
const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  received: ["triaged", "escalated"],
  triaged: ["under_verification", "escalated"],
  under_verification: ["verified", "unverified", "escalated"],
  verified: ["escalated", "closed"],
  unverified: ["closed"],
  escalated: ["closed"],
  closed: [],
};

// Who can do what
const VERIFIER_ACTIONS = ["triaged", "under_verification"];
const SUPERVISOR_ACTIONS = ["verified", "unverified", "escalated", "closed"];

// ============================================================
// CONFIDENCE CONFIG
// ============================================================
const CONFIDENCE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof Award }> = {
  high:   { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "High Confidence",   icon: ShieldCheck },
  medium: { color: "text-amber-400",   bg: "bg-amber-500/20",   label: "Medium Confidence", icon: Award },
  low:    { color: "text-red-400",     bg: "bg-red-500/20",     label: "Low Confidence",    icon: AlertTriangle },
};

// ============================================================
// MEDIA HELPER
// ============================================================
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
        <h1 className="text-xl font-black text-white text-center uppercase tracking-tight">
          Verification Desk
        </h1>
        <p className="text-xs text-white/40 text-center mt-2">
          OJÚTÓLÉ | USHAF Nigeria
        </p>
        <p className="text-[10px] text-[#F59E0B] text-center mt-1 uppercase tracking-wider">
          Two-Person Rule Enforced
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setRole("verifier"); setError(""); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                role === "verifier"
                  ? "bg-[#2563EB] text-white"
                  : "glass text-white/40 hover:text-white/60"
              }`}
            >
              <Eye size={14} className="mx-auto mb-1" />
              Verifier
            </button>
            <button
              type="button"
              onClick={() => { setRole("supervisor"); setError(""); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                role === "supervisor"
                  ? "bg-[#F59E0B] text-white"
                  : "glass text-white/40 hover:text-white/60"
              }`}
            >
              <ShieldCheck size={14} className="mx-auto mb-1" />
              Supervisor
            </button>
          </div>

          <p className="text-[10px] text-white/30 text-center">
            {role === "verifier"
              ? "Can triage, review, and start verification"
              : "Can verify, escalate, and close cases"}
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Enter password"
            className="w-full h-12 px-4 rounded-xl glass text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
            autoFocus
          />

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={12} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[#2563EB] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Clock size={16} className="animate-spin" /> : <Unlock size={16} />}
            {loading ? "Authenticating..." : "Access Desk"}
          </button>
        </form>

        <p className="text-[10px] text-white/20 text-center mt-6">
          Contact USHAF Nigeria for credentials
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ADMIN COMPONENT
// ============================================================
export default function Admin() {
  const { t } = useLanguage();
  const [session, setSessionState] = useState<AdminSession | null>(getSession);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [lgaFilter, setLgaFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<"idle" | "loading" | "done">("idle");
  const [noteText, setNoteText] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [showActionNote, setShowActionNote] = useState<string | null>(null);

  const role: AdminRole = session?.role || null;
  const isVerifier = role === "verifier";
  const isSupervisor = role === "supervisor" || role === "admin";

  // Only fetch data when authenticated
  const statsQuery = trpc.report.getStats.useQuery(undefined, { enabled: !!role });
  const reportsQuery = trpc.report.listAdmin.useQuery(
    {
      status: statusFilter || undefined,
      lga: lgaFilter || undefined,
      limit: 50,
    },
    { enabled: !!role }
  );
  const lgaQuery = trpc.pollingUnit.getLGAs.useQuery(undefined, { enabled: !!role });
  const puStatsQuery = trpc.pollingUnit.stats.useQuery(undefined, { enabled: !!role });

  // Detail query (when a report is selected)
  const detailQuery = trpc.report.getByIdAdmin.useQuery(
    { id: selectedReport?.id || 0 },
    { enabled: !!selectedReport?.id && !!role }
  );

  const utils = trpc.useUtils();

  // Mutations
  const triageMutation = trpc.report.triage.useMutation({
    onSuccess: () => { invalidateAll(); setActionNote(""); setShowActionNote(null); },
  });
  const startVerMutation = trpc.report.startVerification.useMutation({
    onSuccess: () => { invalidateAll(); setActionNote(""); setShowActionNote(null); },
  });
  const verifyMutation = trpc.report.verify.useMutation({
    onSuccess: () => { invalidateAll(); setActionNote(""); setShowActionNote(null); },
  });
  const unverifyMutation = trpc.report.markUnverified.useMutation({
    onSuccess: () => { invalidateAll(); setActionNote(""); setShowActionNote(null); },
  });
  const escalateMutation = trpc.report.escalate.useMutation({
    onSuccess: () => { invalidateAll(); setActionNote(""); setShowActionNote(null); },
  });
  const closeMutation = trpc.report.close.useMutation({
    onSuccess: () => { invalidateAll(); setActionNote(""); setShowActionNote(null); },
  });
  const addNoteMutation = trpc.report.addNote.useMutation({
    onSuccess: () => { invalidateAll(); setNoteText(""); },
  });

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

  // Export CSV
  const STATUS_LABELS: Record<string, string> = {
    received: "Received",
    triaged: "Triaged",
    under_verification: "Under Verification",
    verified: "Verified",
    unverified: "Unverified",
    escalated: "Escalated",
    closed: "Closed",
  };

  const handleExportCSV = () => {
    const rows = reports.map((r: any) => ({
      CaseID: r.caseId,
      ID: r.id,
      Type: incidentLabels[r.incidentType] || r.incidentType,
      LGA: r.lga,
      Ward: r.ward || "",
      Confidence: r.confidence,
      Status: STATUS_LABELS[r.status] || r.status,
      Description: (r.description || "").replace(/\n/g, " "),
      Latitude: r.latitude || "",
      Longitude: r.longitude || "",
      Location: r.locationAddress || "",
      Phone: r.reporterPhone || "",
      MediaCount: r.media?.length || 0,
      Submitted: new Date(r.submittedAt).toLocaleString("en-NG"),
    }));

    if (rows.length === 0) { alert("No reports to export"); return; }

    const headers = Object.keys(rows[0]).join(",");
    const csv = [headers, ...rows.map((r: any) => Object.values(r).map((v: any) => `"${v}"`).join(","))].join("\n");
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

  const handleLogin = (role: AdminRole, name: string) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
    setSessionState({ token, role, name });
  };

  const handleLogout = () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      trpc.adminAuth.logout.useMutation().mutate({ token });
    }
    clearSession();
    setSessionState(null);
    setSelectedReport(null);
  };

  // Status action button
  const StatusActionButton = ({ targetStatus, reportId }: { targetStatus: string; reportId: number }) => {
    const config = STATUS_CONFIG[targetStatus];
    if (!config) return null;

    const Icon = config.icon;
    let mutation: any;
    switch (targetStatus) {
      case "triaged": mutation = triageMutation; break;
      case "under_verification": mutation = startVerMutation; break;
      case "verified": mutation = verifyMutation; break;
      case "unverified": mutation = unverifyMutation; break;
      case "escalated": mutation = escalateMutation; break;
      case "closed": mutation = closeMutation; break;
      default: return null;
    }

    const isLoading = mutation.isPending;

    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowActionNote(showActionNote === targetStatus ? null : targetStatus)}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${config.bg} ${config.color} hover:brightness-125 disabled:opacity-50`}
        >
          {isLoading ? <Clock size={14} className="animate-spin" /> : <Icon size={14} />}
          {isLoading ? "Processing..." : `Mark ${config.label}`}
        </button>
        {showActionNote === targetStatus && (
          <div className="flex gap-2">
            <input
              type="text"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Reason/note for this action..."
              className="flex-1 h-9 px-3 rounded-lg glass text-xs text-white placeholder:text-white/30 focus:outline-none"
            />
            <button
              onClick={() => mutation.mutate({ id: reportId, note: actionNote || undefined })}
              className="h-9 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-bold"
            >
              <Send size={12} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Available actions for current role
  const getAvailableActions = (currentStatus: string): string[] => {
    const transitions = WORKFLOW_TRANSITIONS[currentStatus] || [];
    if (isSupervisor) {
      // Supervisor can do ALL transitions
      return transitions;
    }
    if (isVerifier) {
      // Verifier can only do triage and under_verification
      return transitions.filter((s) => VERIFIER_ACTIONS.includes(s));
    }
    return [];
  };

  if (!role) {
    return <LoginGate onSuccess={handleLogin} />;
  }

  // ==================== REPORT DETAIL VIEW ====================
  if (selectedReport) {
    const detail = detailQuery.data;
    const report = detail || selectedReport;
    const st = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
    const conf = CONFIDENCE_CONFIG[report.confidence] || CONFIDENCE_CONFIG.low;
    const hasMedia = report.media && report.media.length > 0;
    const hasLocation = report.latitude && report.longitude;
    const auditLog = report.auditLog || [];
    const notes = report.notes || [];
    const availableActions = getAvailableActions(report.status);

    return (
      <div className="min-h-screen bg-[#0A0E27] pb-8">
        {/* Header */}
        <div className="glass border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedReport(null)} className="w-8 h-8 flex items-center justify-center rounded-full glass">
              <ChevronLeft size={18} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">
                {report.caseId}
              </h1>
              <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">
                Report #{report.id} | OJÚTÓLÉ | USHAF Nigeria
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Status + Confidence Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full ${st.bg} ${st.color} font-bold flex items-center gap-1.5`}>
              <st.icon size={12} /> {st.label}
            </span>
            <span className={`text-xs px-3 py-1.5 rounded-full ${conf.bg} ${conf.color} font-medium flex items-center gap-1.5`}>
              <conf.icon size={12} /> {conf.label}
            </span>
            <span className="text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-full">
              {incidentLabels[report.incidentType] || report.incidentType}
            </span>
          </div>

          {/* WORKFLOW TIMELINE */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <History size={14} /> Verification Timeline
            </h2>
            <div className="relative pl-4 border-l-2 border-white/10 space-y-4">
              {[
                { label: "Received", time: report.submittedAt, by: "Auto-Intake", active: true },
                { label: "Triaged", time: report.triagedAt, by: report.triagedBy, active: !!report.triagedAt },
                { label: "Under Verification", time: report.underVerificationAt || report.triagedAt, by: report.triagedBy, active: report.status === "under_verification" || !!report.verifiedAt || !!report.escalatedAt },
                { label: "Verified", time: report.verifiedAt, by: report.verifiedBy, active: !!report.verifiedAt },
                { label: "Escalated", time: report.escalatedAt, by: report.escalatedBy, active: !!report.escalatedAt },
                { label: "Closed", time: report.closedAt, by: report.closedBy, active: !!report.closedAt },
              ].map((step, i) => (
                <div key={i} className={`relative ${step.active ? "opacity-100" : "opacity-30"}`}>
                  <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 ${
                    step.active ? "bg-[#2563EB] border-[#2563EB]" : "bg-transparent border-white/30"
                  }`} />
                  <p className="text-xs font-medium text-white">{step.label}</p>
                  {step.time && (
                    <p className="text-[10px] text-white/40">
                      {new Date(step.time).toLocaleString("en-NG")}
                      {step.by && ` · by ${step.by}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ACTIONS */}
          {availableActions.length > 0 && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <RotateCcw size={14} /> Status Actions
              </h2>
              <p className="text-[10px] text-white/30 mb-3">
                Logged in as: <span className="text-[#F59E0B]">{role}</span>
                {isSupervisor && " (can verify/escalate/close)"}
                {isVerifier && " (can triage/start verification)"}
              </p>
              <div className="space-y-2">
                {availableActions.map((action) => (
                  <StatusActionButton key={action} targetStatus={action} reportId={report.id} />
                ))}
              </div>
            </section>
          )}

          {/* Location */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin size={14} /> Location
            </h2>
            <div className="space-y-2">
              <p className="text-white font-medium">{report.lga} LGA</p>
              {report.ward && <p className="text-sm text-white/60">Ward: {report.ward}</p>}
              {report.pollingUnit && <p className="text-sm text-white/60">PU: {report.pollingUnit}</p>}
              {hasLocation && (
                <div className="mt-3 p-3 rounded-xl bg-white/5 space-y-2">
                  <p className="text-xs text-white/40">
                    Lat: {report.latitude?.toFixed(6)}, Lng: {report.longitude?.toFixed(6)}
                  </p>
                  {report.locationAccuracy && (
                    <p className="text-xs text-white/40">Accuracy: ±{Math.round(report.locationAccuracy)}m</p>
                  )}
                  {report.locationAddress && (
                    <p className="text-xs text-emerald-400/80">{report.locationAddress}</p>
                  )}
                  <a href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#2563EB] underline">
                    <ExternalLink size={10} /> View on Google Maps
                  </a>
                </div>
              )}
              {!hasLocation && <p className="text-xs text-amber-400/60 mt-2">No GPS captured</p>}
            </div>
          </section>

          {/* Description */}
          {report.description && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} /> Description
              </h2>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{report.description}</p>
            </section>
          )}

          {/* Media Attachments */}
          {hasMedia && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Image size={14} /> Evidence Attachments ({report.media?.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {report.media?.map((m: any, idx: number) => {
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* INTERNAL NOTES */}
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <StickyNote size={14} /> Internal Notes
            </h2>
            <div className="space-y-2 mb-3">
              {notes.length === 0 ? (
                <p className="text-xs text-white/30 italic">No notes yet</p>
              ) : (
                notes.map((n: any) => (
                  <div key={n.id} className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-white/70">{n.note}</p>
                    <p className="text-[10px] text-white/30 mt-1">
                      {n.authorName} ({n.authorRole}) · {new Date(n.createdAt).toLocaleString("en-NG")}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note..."
                className="flex-1 h-9 px-3 rounded-lg glass text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (noteText.trim()) {
                    addNoteMutation.mutate({ reportId: report.id, note: noteText.trim() });
                  }
                }}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                className="h-9 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-bold disabled:opacity-50"
              >
                <Send size={12} />
              </button>
            </div>
          </section>

          {/* AUDIT TRAIL */}
          {auditLog.length > 0 && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <History size={14} /> Audit Trail
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {auditLog.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70">
                        <span className="font-medium text-white/90">{entry.action.replace(/_/g, " ")}</span>
                        {entry.oldStatus && entry.newStatus && (
                          <span className="text-white/50">: {entry.oldStatus} → {entry.newStatus}</span>
                        )}
                      </p>
                      {entry.note && <p className="text-[10px] text-white/40 mt-0.5">{entry.note}</p>}
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {entry.operatorName} ({entry.operatorRole}) · {new Date(entry.timestamp).toLocaleString("en-NG")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reporter Info (only for supervisors) */}
          {isSupervisor && (
            <section className="glass rounded-2xl p-4 border border-amber-500/20">
              <h2 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Phone size={14} /> Reporter Identity (Supervisor Only)
              </h2>
              {report.reporterPhone ? (
                <a href={`tel:${report.reporterPhone}`} className="text-sm text-[#2563EB] flex items-center gap-2">
                  <Phone size={14} /> {report.reporterPhone}
                </a>
              ) : (
                <p className="text-sm text-white/40">Anonymous report</p>
              )}
              {report.reporterName && <p className="text-xs text-white/40 mt-1">{report.reporterName}</p>}
            </section>
          )}

          {/* Timestamps */}
          <section className="glass rounded-2xl p-4">
            <div className="space-y-1">
              <p className="text-xs text-white/40">Submitted: {new Date(report.submittedAt).toLocaleString("en-NG")}</p>
              <p className="text-xs text-white/40">Updated: {new Date(report.updatedAt).toLocaleString("en-NG")}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ==================== MAIN DASHBOARD VIEW ====================
  return (
    <div className="min-h-screen pb-8 bg-[#0A0E27]">
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              {t("admin.title")}
            </h1>
            <p className="text-xs text-[#F59E0B] mt-1">{t("admin.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
            isSupervisor ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-[#2563EB]/20 text-[#2563EB]"
          }`}>
            {role} Mode
          </span>
          <span className="text-[10px] text-white/30">
            {isSupervisor ? "Can verify/escalate/close" : "Can triage/review"}
          </span>
        </div>

        {/* Hotline */}
        <a href={`tel:${USHAF_HOTLINE}`} className="flex items-center gap-2 mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
          <Phone size={12} /> USHAF Hotline: <span className="font-bold">{HOTLINE_DISPLAY}</span>
        </a>

        {/* Logout + Backup buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              backupStatus === "done" ? "bg-emerald-500/20 text-emerald-400" : "bg-[#2563EB]/20 text-[#2563EB]"
            }`}>
            {backupStatus === "done" ? <CheckCircle size={12} /> : <Package size={12} />}
            {backupStatus === "done" ? "Downloaded!" : "Download CSV"}
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60">
            <Lock size={12} /> Logout
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
          </section>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: FileText, label: "Total Reports", value: total, color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
            { icon: ShieldCheck, label: "Verified", value: stats?.byStatus?.find((s: any) => s.status === "verified")?.count || 0, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: AlertTriangle, label: "Escalated", value: stats?.byStatus?.find((s: any) => s.status === "escalated")?.count || 0, color: "text-orange-400", bg: "bg-orange-500/10" },
            { icon: Clock, label: "Received", value: stats?.byStatus?.find((s: any) => s.status === "received")?.count || 0, color: "text-blue-400", bg: "bg-blue-500/10" },
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

        {/* Confidence Breakdown */}
        {stats?.byConfidence && stats.byConfidence.length > 0 && (
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award size={14} /> Confidence Distribution
            </h2>
            <div className="space-y-2">
              {stats.byConfidence.map((item: any) => {
                const cc = CONFIDENCE_CONFIG[item.level] || CONFIDENCE_CONFIG.low;
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.level} className="flex items-center gap-3">
                    <cc.icon size={14} className={cc.color} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">{cc.label}</span>
                        <span className="text-xs font-medium text-white">{item.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 mt-1">
                        <div className={`h-full rounded-full ${cc.bg.replace("bg-", "bg-")}`} style={{ width: `${pct}%`, backgroundColor: "currentColor" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Incident Type Breakdown */}
        {stats?.byType && stats.byType.length > 0 && (
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">{t("admin.byType")}</h2>
            <div className="space-y-3">
              {stats.byType.map((item: any) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.incidentType}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/80">{incidentLabels[item.incidentType] || item.incidentType}</span>
                      <span className="text-sm font-medium text-white">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#FF4D6D]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Reports Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">{t("admin.recentReports")}</h2>
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-xs text-white/60">
              <Filter size={12} /> Filter <ChevronDown size={10} />
            </button>
          </div>

          {showFilters && (
            <div className="glass rounded-xl p-3 mb-3 space-y-2 animate-slide-up">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent">
                <option value="">All Statuses</option>
                {WORKFLOW_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
              <select value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-lg glass text-sm text-white bg-transparent">
                <option value="">{t("locator.allLGAs")}</option>
                {(lgaQuery.data || []).map((lga: string) => <option key={lga} value={lga}>{lga}</option>)}
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
              reports.map((report: any) => {
                const st = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
                const conf = CONFIDENCE_CONFIG[report.confidence] || CONFIDENCE_CONFIG.low;
                const hasMedia = report.media && report.media.length > 0;
                const hasLocation = report.latitude && report.longitude;
                return (
                  <button key={report.id} onClick={() => setSelectedReport(report)}
                    className="w-full glass rounded-2xl p-4 text-left hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Top row: Case ID + Status + Confidence */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono text-[#2563EB]/60">{report.caseId}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color} font-medium`}>{st.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${conf.bg} ${conf.color}`}>{conf.label}</span>
                        </div>

                        <p className="text-white font-medium text-sm">
                          {incidentLabels[report.incidentType] || report.incidentType}
                        </p>

                        {/* LGA + Ward */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-xs font-medium text-white/70 bg-white/5 px-2 py-0.5 rounded">{report.lga}</span>
                          {report.ward && (
                            <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                              <MapPin size={10} /> {report.ward}
                            </span>
                          )}
                        </div>

                        {/* Media + GPS indicators */}
                        <div className="flex items-center gap-2 mt-2">
                          {hasMedia && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                              <Image size={10} /> {report.media?.length}
                            </span>
                          )}
                          {hasLocation && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                              <MapPin size={10} /> GPS
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {report.description && (
                          <p className="text-xs text-white/40 mt-2 line-clamp-2">{report.description}</p>
                        )}

                        {/* Time */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                          <Clock size={12} className="text-white/30" />
                          <span className="text-xs text-white/50">
                            {new Date(report.submittedAt).toLocaleString("en-NG", {
                              weekday: "short", year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
                            })}
                          </span>
                        </div>

                        <p className="text-[10px] text-[#2563EB]/60 mt-1">Tap to view details, audit trail & actions</p>
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
