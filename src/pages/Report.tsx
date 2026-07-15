import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  Camera, Video, Mic, MapPin, X, Check, Send,
  Loader2, Phone
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

type IncidentType = "vote_buying" | "ballot_snatching" | "intimidation" | "bvas_failure" | "overvoting" | "late_arrival" | "other";

interface CapturedMedia {
  id: string;
  type: "photo" | "video" | "audio";
  url: string;
  file: File;
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

  const getLocation = useCallback(() => {
    setGpsLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGpsLoading(false);
        },
        () => {
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsLoading(false);
    }
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMedia((prev) => [...prev, { id: crypto.randomUUID(), type: "photo", url, file }]);
    e.target.value = "";
  };

  const handleVideoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMedia((prev) => [...prev, { id: crypto.randomUUID(), type: "video", url, file }]);
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const file = new File([blob], `recording_${Date.now()}.webm`, { type: "audio/webm" });
        setMedia((prev) => [...prev, { id: crypto.randomUUID(), type: "audio", url, file }]);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      alert("Microphone access is required for voice recording.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async () => {
    if (!incidentType) return;
    setSubmitting(true);

    const mediaUrls = media.map((m) => ({
      mediaType: m.type as "photo" | "video" | "audio",
      url: m.url,
    }));

    try {
      await createReport.mutateAsync({
        incidentType,
        lga: lga || "Unknown",
        ward: ward || undefined,
        description: description || undefined,
        latitude: gps?.lat,
        longitude: gps?.lng,
        locationAccuracy: gps?.accuracy,
        reporterPhone: reporterPhone || undefined,
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
      });
    } catch {
      const offlineReport = {
        id: crypto.randomUUID(),
        incidentType,
        lga: lga || "Unknown",
        ward,
        description,
        gps,
        reporterPhone,
        media: mediaUrls,
        submittedAt: new Date().toISOString(),
      };
      const queue = JSON.parse(localStorage.getItem("ojutole_offline_queue") || "[]");
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
        <h2 className="text-2xl font-black text-white mb-2 animate-fade-in">{t("common.success")}!</h2>
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
            <h1 className="text-xl font-black uppercase tracking-tight text-white">{t("report.title")}</h1>
            <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">{t("report.ushaf")}</p>
          </div>
          <button onClick={() => navigate("/")} className="w-8 h-8 flex items-center justify-center rounded-full glass">
            <X size={18} className="text-white/60" />
          </button>
        </div>
      </div>

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
            onChange={(e) => { setLga(e.target.value); setWard(""); }}
            className="w-full h-12 px-4 rounded-xl glass text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
          >
            <option value="" className="bg-[#0A0E27]">{t("report.selectLGA")}</option>
            {(lgaQuery.data || []).map((l) => (
              <option key={l} value={l} className="bg-[#0A0E27]">{l}</option>
            ))}
          </select>

          {lga && (
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="w-full h-12 px-4 rounded-xl glass text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
            >
              <option value="" className="bg-[#0A0E27]">{t("report.selectWard")}</option>
              {(wardQuery.data || []).map((w) => (
                <option key={w} value={w} className="bg-[#0A0E27]">{w}</option>
              ))}
            </select>
          )}
        </section>

        {/* Media Capture */}
        <section>
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 block">
            {t("report.evidence")}
          </label>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full border-2 border-[#2563EB] flex items-center justify-center active:scale-90 transition-transform">
                <Camera size={24} className="text-[#2563EB]" />
              </div>
              <span className="text-xs text-white/50">{t("report.photo")}</span>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full border-2 border-[#FF4D6D] flex items-center justify-center active:scale-90 transition-transform">
                <Video size={24} className="text-[#FF4D6D]" />
              </div>
              <span className="text-xs text-white/50">{t("report.video")}</span>
              <input ref={videoInputRef} type="file" accept="video/*" capture="environment" onChange={handleVideoCapture} className="hidden" />
            </button>

            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className="flex flex-col items-center gap-2"
            >
              <div className={`w-16 h-16 rounded-full border-2 border-[#F59E0B] flex items-center justify-center transition-all ${
                  isRecording ? "bg-[#F59E0B]/20 scale-110" : ""
                }`}>
                <Mic size={24} className="text-[#F59E0B]" />
              </div>
              <span className="text-xs text-white/50">
                {isRecording ? `${recordingDuration}s` : t("report.voice")}
              </span>
            </button>
          </div>

          {isRecording && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF4D6D] animate-pulse-glow" />
              <span className="text-sm text-[#FF4D6D] font-medium">{t("report.recording")}</span>
              <span className="text-sm text-white/40">{recordingDuration}s</span>
            </div>
          )}

          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {media.map((m) => (
                <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden glass">
                  {m.type === "photo" && <img src={m.url} alt="" className="w-full h-full object-cover" />}
                  {m.type === "video" && <video src={m.url} className="w-full h-full object-cover" />}
                  {m.type === "audio" && (
                    <div className="w-full h-full flex items-center justify-center bg-[#F59E0B]/10">
                      <Mic size={24} className="text-[#F59E0B]" />
                    </div>
                  )}
                  <button onClick={() => removeMedia(m.id)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                    <X size={12} className="text-white" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/80 uppercase">{m.type}</span>
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
          <p className="text-xs text-white/30 mt-1 text-right">{description.length}/500</p>
        </section>

        {/* GPS */}
        <section>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white/60 uppercase tracking-wider">{t("report.gps")}</label>
            <button onClick={getLocation} disabled={gpsLoading} className="text-xs text-[#2563EB] font-medium flex items-center gap-1">
              {gpsLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
              {gps ? t("report.captured") : t("report.captureGPS")}
            </button>
          </div>
          {gps && (
            <p className="text-xs text-white/40 mt-2">
              {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (±{Math.round(gps.accuracy)}m)
            </p>
          )}
        </section>

        {/* Phone */}
        <section>
          <label className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 block">
            {t("report.phone")}
          </label>
          <div className="relative">
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="tel" value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)}
              placeholder={t("report.phonePlaceholder")}
              className="w-full h-12 pl-10 pr-4 rounded-xl glass text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50" />
          </div>
        </section>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={!canSubmit}
          className={`w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
            canSubmit ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/40 active:scale-[0.98]" : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}>
          {submitting ? <Loader2 size={20} className="animate-spin" /> : <><Send size={18} /> {t("report.submit")}</>}
        </button>

        {!incidentType && <p className="text-xs text-center text-white/30">{t("report.selectIncident")}</p>}
      </div>
    </div>
  );
}
