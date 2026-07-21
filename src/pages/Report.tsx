import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  Camera, Video, Mic, MapPin, X, Check, Send,
  Loader2, Phone, Upload, AlertTriangle, WifiOff,
  ShieldCheck
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// USHAF Hotline
const USHAF_HOTLINE = "+2349034610970";
const HOTLINE_DISPLAY = "09034610970";

type IncidentType = "vote_buying" | "ballot_snatching" | "intimidation" | "bvas_failure" | "overvoting" | "late_arrival" | "other";

interface CapturedMedia {
  id: string;
  type: "photo" | "video" | "audio";
  url: string;        // local blob URL for preview
  serverUrl?: string; // real uploaded URL from server
  file: File;
  uploading: boolean;
  uploadError?: string;
}

// Upload a single file to the server
async function uploadToServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }

  const data = await resp.json();
  return data.url as string; // Returns "/uploads/uuid.ext"
}

export default function Report() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [description, setDescription] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [media, setMedia] = useState<CapturedMedia[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [locationAddress, setLocationAddress] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "error">("idle");
  const [anonymous, setAnonymous] = useState(false);

  // Video safety limits
  const VIDEO_MAX_SIZE_MB = 10;
  const VIDEO_MAX_DURATION_SEC = 60;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const incidentTypes: { value: IncidentType; label: string }[] = [
    { value: "vote_buying", label: t("incident.vote_buying") },
    { value: "ballot_snatching", label: t("incident.ballot_snatching") },
    { value: "intimidation", label: t("incident.intimidation") },
    { value: "bvas_failure", label: t("incident.bvas_failure") },
    { value: "overvoting", label: t("incident.overvoting") },
    { value: "late_arrival", label: t("incident.late_arrival") },
    { value: "other", label: t("incident.other") },
  ];

  const lgaQuery = trpc.pollingUnit.getLGAs.useQuery();
  const wardQuery = trpc.pollingUnit.getWardsByLGA.useQuery(
    { lga },
    { enabled: !!lga }
  );

  const utils = trpc.useUtils();
  const createReport = trpc.report.create.useMutation({
    onSuccess: () => {
      utils.report.getStats.invalidate();
      utils.report.getRecent.invalidate();
      setSubmitted(true);
      setTimeout(() => {
        navigate("/");
      }, 2000);
    },
  });

  // GPS capture with better error handling
  const getLocation = useCallback(() => {
    setGpsLoading(true);
    setGpsStatus("requesting");

    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsStatus("granted");
        setGpsLoading(false);

        // Try to get address from coordinates
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "OJUTOLÉ/1.0" } }
          );
          const data = await response.json();
          if (data.display_name) {
            setLocationAddress(data.display_name);
          }
        } catch {
          // Address lookup failed silently
        }
      },
      (err) => {
        console.error("[GPS] Error:", err.code, err.message);
        setGpsStatus("denied");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Photo capture + immediate upload
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    const mediaId = crypto.randomUUID();
    const newMedia: CapturedMedia = {
      id: mediaId,
      type: "photo",
      url: localUrl,
      file,
      uploading: true,
    };
    setMedia((prev) => [...prev, newMedia]);
    e.target.value = "";

    // Upload to server immediately
    try {
      const serverUrl = await uploadToServer(file);
      setMedia((prev) =>
        prev.map((m) =>
          m.id === mediaId ? { ...m, serverUrl, uploading: false } : m
        )
      );
    } catch (err: any) {
      setMedia((prev) =>
        prev.map((m) =>
          m.id === mediaId
            ? { ...m, uploading: false, uploadError: err.message }
            : m
        )
      );
    }
  };

  // Video capture + immediate upload (with size limit)
  const handleVideoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check video file size (max 10MB)
    if (file.size > VIDEO_MAX_SIZE_MB * 1024 * 1024) {
      alert(`Video too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${VIDEO_MAX_SIZE_MB}MB. Please record a shorter video.`);
      e.target.value = "";
      return;
    }

    const localUrl = URL.createObjectURL(file);
    const mediaId = crypto.randomUUID();
    const newMedia: CapturedMedia = {
      id: mediaId,
      type: "video",
      url: localUrl,
      file,
      uploading: true,
    };
    setMedia((prev) => [...prev, newMedia]);
    e.target.value = "";

    try {
      const serverUrl = await uploadToServer(file);
      setMedia((prev) =>
        prev.map((m) =>
          m.id === mediaId ? { ...m, serverUrl, uploading: false } : m
        )
      );
    } catch (err: any) {
      setMedia((prev) =>
        prev.map((m) =>
          m.id === mediaId
            ? { ...m, uploading: false, uploadError: err.message }
            : m
        )
      );
    }
  };

  // Voice recording
  // Voice recording with proper mobile support
  const MAX_RECORDING_SECONDS = 60;
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = async () => {
    // Prevent double-start
    if (isRecording || mediaRecorderRef.current?.state === "recording") {
      console.log("[RECORD] Already recording, ignoring start request");
      return;
    }

    try {
      console.log("[RECORD] Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        console.log("[RECORD] Recording stopped, processing...");
        // Stop all tracks to release microphone
        stream.getTracks().forEach((t) => t.stop());

        if (chunksRef.current.length === 0) {
          console.log("[RECORD] No audio data captured");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);
        const file = new File([blob], `recording_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        const mediaId = crypto.randomUUID();

        const newMedia: CapturedMedia = {
          id: mediaId,
          type: "audio",
          url: localUrl,
          file,
          uploading: true,
        };
        setMedia((prev) => [...prev, newMedia]);

        // Upload voice note to server
        try {
          const serverUrl = await uploadToServer(file);
          setMedia((prev) =>
            prev.map((m) =>
              m.id === mediaId ? { ...m, serverUrl, uploading: false } : m
            )
          );
        } catch (err: any) {
          setMedia((prev) =>
            prev.map((m) =>
              m.id === mediaId
                ? { ...m, uploading: false, uploadError: err.message }
                : m
            )
          );
        }
      };

      recorder.onerror = (e) => {
        console.error("[RECORD] MediaRecorder error:", e);
        stopRecordingCleanup();
      };

      recorder.start(1000); // Collect data every 1 second
      setIsRecording(true);
      setRecordingDuration(0);
      console.log("[RECORD] Recording started");

      // Timer for duration display
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          const next = d + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            // Auto-stop at max duration
            console.log("[RECORD] Auto-stopping at max duration");
            stopRecordingCleanup();
          }
          return next;
        });
      }, 1000);

      // Auto-stop safety timer
      autoStopTimerRef.current = setTimeout(() => {
        console.log("[RECORD] Safety auto-stop triggered");
        stopRecordingCleanup();
      }, (MAX_RECORDING_SECONDS + 5) * 1000);

    } catch (err: any) {
      console.error("[RECORD] Failed to start:", err.message);
      alert("Microphone access is required. Please allow microphone permission in your browser settings.");
    }
  };

  const stopRecordingCleanup = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      console.log("[RECORD] Stop error (already stopped):", e);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    mediaRecorderRef.current = null;
  };

  const stopRecording = () => {
    stopRecordingCleanup();
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async () => {
    if (!incidentType) return;

    // Check if any media is still uploading
    const uploadingCount = media.filter((m) => m.uploading).length;
    if (uploadingCount > 0) {
      alert(`${uploadingCount} file(s) still uploading. Please wait...`);
      return;
    }

    setSubmitting(true);

    // Use server URLs if available, otherwise local URLs
    const mediaUrls = media.map((m) => ({
      mediaType: m.type as "photo" | "video" | "audio",
      url: m.serverUrl || m.url, // serverUrl is the real uploaded URL
      thumbnail: m.type === "photo" ? m.serverUrl || m.url : undefined,
      fileName: m.file.name,
      fileSize: m.file.size,
    }));

    try {
      await createReport.mutateAsync({
        incidentType,
        lga: lga || "Unknown",
        ward: ward || undefined,
        description: description || undefined,
        // If anonymous, don't send GPS or phone
        latitude: anonymous ? undefined : gps?.lat,
        longitude: anonymous ? undefined : gps?.lng,
        locationAccuracy: anonymous ? undefined : gps?.accuracy,
        locationAddress: anonymous ? undefined : locationAddress || undefined,
        reporterPhone: anonymous ? undefined : reporterPhone || undefined,
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
      });
    } catch {
      // Save to offline queue
      const offlineReport = {
        id: crypto.randomUUID(),
        incidentType,
        lga: lga || "Unknown",
        ward,
        description,
        gps: anonymous ? undefined : gps,
        locationAddress: anonymous ? undefined : locationAddress,
        reporterPhone: anonymous ? undefined : reporterPhone,
        media: mediaUrls,
        submittedAt: new Date().toISOString(),
      };
      const queue = JSON.parse(
        localStorage.getItem("ojutole_offline_queue") || "[]"
      );
      queue.push(offlineReport);
      localStorage.setItem("ojutole_offline_queue", JSON.stringify(queue));
      setSubmitted(true);
      setTimeout(() => navigate("/"), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = incidentType && !submitting;

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-fade-in">
          <Check size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 animate-fade-in">
          {t("common.success")}!
        </h2>
        <p className="text-white/60 text-center animate-fade-in">
          {t("hero.tagline")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              {t("report.title")}
            </h1>
            <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">
              {t("report.ushaf")}
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-full glass"
          >
            <X size={18} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Hotline Banner */}
      <a
        href={`tel:${USHAF_HOTLINE}`}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20"
      >
        <Phone size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-400 font-medium">Need help? Call USHAF Hotline:</span>
        <span className="text-sm text-emerald-300 font-bold">{HOTLINE_DISPLAY}</span>
      </a>

      <div className="px-4 py-6 space-y-6">
        {/* Incident Type */}
        <section>
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 block">
            {t("report.incidentType")} *
          </label>
          <div className="flex flex-wrap gap-2">
            {incidentTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setIncidentType(type.value)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  incidentType === type.value
                    ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30"
                    : "glass text-white/60 hover:text-white"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        {/* LGA & Ward */}
        <section className="space-y-3">
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider block">
            {t("report.location")}
          </label>
          <select
            value={lga}
            onChange={(e) => {
              setLga(e.target.value);
              setWard("");
            }}
            className="w-full h-12 px-4 rounded-xl glass text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
          >
            <option value="" className="bg-[#0A0E27]">
              {t("report.selectLGA")}
            </option>
            {(lgaQuery.data || []).map((l) => (
              <option key={l} value={l} className="bg-[#0A0E27]">
                {l}
              </option>
            ))}
          </select>

          {lga && (
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="w-full h-12 px-4 rounded-xl glass text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
            >
              <option value="" className="bg-[#0A0E27]">
                {t("report.selectWard")}
              </option>
              {(wardQuery.data || []).map((w) => (
                <option key={w} value={w} className="bg-[#0A0E27]">
                  {w}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Media Capture */}
        <section>
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 block">
            {t("report.evidence")}
          </label>

          {/* Media upload buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full border-2 border-[#2563EB] flex items-center justify-center active:scale-90 transition-transform">
                <Camera size={24} className="text-[#2563EB]" />
              </div>
              <span className="text-xs text-white/50">{t("report.photo")}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full border-2 border-[#FF4D6D] flex items-center justify-center active:scale-90 transition-transform">
                <Video size={24} className="text-[#FF4D6D]" />
              </div>
              <span className="text-xs text-white/50">{t("report.video")}</span>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleVideoCapture}
                className="hidden"
              />
            </button>

            {/* Voice Recording Button - Uses onClick toggle to avoid touch/mouse event conflicts */}
            <button
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              className="flex flex-col items-center gap-2 select-none"
              style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
            >
              <div
                className={`w-16 h-16 rounded-full border-2 border-[#F59E0B] flex items-center justify-center transition-all ${
                  isRecording ? "bg-[#F59E0B]/20 scale-110 animate-pulse" : ""
                }`}
              >
                <Mic size={24} className="text-[#F59E0B]" />
              </div>
              <span className="text-xs text-white/50">
                {isRecording ? `${recordingDuration}s / ${MAX_RECORDING_SECONDS}s` : t("report.voice")}
              </span>
            </button>
          </div>

          {isRecording && (
            <div className="mt-3 glass rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-[#FF4D6D] animate-pulse" />
                <span className="text-sm text-[#FF4D6D] font-medium">
                  Recording... Tap mic button to stop
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-[#F59E0B] transition-all duration-1000"
                  style={{ width: `${Math.min((recordingDuration / MAX_RECORDING_SECONDS) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/40 mt-1">
                {recordingDuration}s / {MAX_RECORDING_SECONDS}s max
              </p>
            </div>
          )}

          {/* Media Preview with Upload Status */}
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-square rounded-xl overflow-hidden glass"
                >
                  {m.type === "photo" && (
                    <img
                      src={m.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {m.type === "video" && (
                    <video
                      src={m.url}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {m.type === "audio" && (
                    <div className="w-full h-full flex items-center justify-center bg-[#F59E0B]/10">
                      <Mic size={24} className="text-[#F59E0B]" />
                    </div>
                  )}

                  {/* Upload status overlay */}
                  {m.uploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <Loader2 size={20} className="text-white animate-spin" />
                      <span className="text-[10px] text-white mt-1">
                        Uploading...
                      </span>
                    </div>
                  )}

                  {/* Upload error */}
                  {m.uploadError && (
                    <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center">
                      <AlertTriangle size={16} className="text-red-400" />
                      <span className="text-[10px] text-red-300 mt-1 text-center px-1">
                        Failed
                      </span>
                    </div>
                  )}

                  {/* Uploaded checkmark */}
                  {m.serverUrl && !m.uploading && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-emerald-500/80 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}

                  <button
                    onClick={() => removeMedia(m.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X size={12} className="text-white" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/80 uppercase">
                    {m.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Description */}
        <section>
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 block">
            {t("report.description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("report.descPlaceholder")}
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 rounded-xl glass text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 resize-none"
          />
          <p className="text-xs text-white/30 mt-1 text-right">
            {description.length}/500
          </p>
        </section>

        {/* Anonymous Mode Toggle */}
        <section className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">Report Anonymously</span>
            </div>
            <button
              onClick={() => {
                setAnonymous(!anonymous);
                if (!anonymous) {
                  // Turning ON anonymous - clear GPS and phone
                  setGps(null);
                  setReporterPhone("");
                }
              }}
              className={`w-12 h-6 rounded-full transition-all relative ${
                anonymous ? "bg-emerald-500" : "bg-white/20"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                anonymous ? "left-6" : "left-0.5"
              }`} />
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2">
            {anonymous
              ? "Your phone number and GPS location will NOT be sent. Only the incident type, LGA, ward, description, and attachments will be submitted."
              : "Toggle on to hide your identity from the report."}
          </p>
        </section>

        {/* GPS with Better Error Handling - hidden in anonymous mode */}
        {!anonymous && (
        <section>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              {t("report.gps")}
            </label>
            <button
              onClick={getLocation}
              disabled={gpsLoading}
              className="text-xs text-[#2563EB] font-medium flex items-center gap-1"
            >
              {gpsLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <MapPin size={12} />
              )}
              {gps ? t("report.captured") : t("report.captureGPS")}
            </button>
          </div>

          {/* GPS Status Messages */}
          {gpsStatus === "requesting" && (
            <p className="text-xs text-amber-400 mt-2">
              Please allow location access when prompted...
            </p>
          )}
          {gpsStatus === "denied" && (
            <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-medium">
                Location access denied
              </p>
              <p className="text-xs text-white/40 mt-1">
                Please enable location in your browser settings, or enter the
                polling unit name manually above.
              </p>
            </div>
          )}

          {gps && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-white/40">
                Lat: {gps.lat.toFixed(6)}, Lng: {gps.lng.toFixed(6)}
              </p>
              <p className="text-xs text-white/40">
                Accuracy: ±{Math.round(gps.accuracy)}m
              </p>
              {locationAddress && (
                <p className="text-xs text-emerald-400/80 line-clamp-2">
                  {locationAddress}
                </p>
              )}
              <a
                href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#2563EB] underline"
              >
                View on Google Maps
              </a>
            </div>
          )}
        </section>
        )}

        {/* Phone - hidden in anonymous mode */}
        {!anonymous && (
        <section>
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 block">
            {t("report.phone")}
          </label>
          <div className="relative">
            <Phone
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="tel"
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              placeholder={t("report.phonePlaceholder")}
              className="w-full h-12 pl-10 pr-4 rounded-xl glass text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
            />
          </div>
        </section>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
            canSubmit
              ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/40 active:scale-[0.98]"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Send size={18} /> {t("report.submit")}
            </>
          )}
        </button>

        {!incidentType && (
          <p className="text-xs text-center text-white/30">
            {t("report.selectIncident")}
          </p>
        )}
      </div>
    </div>
  );
}
