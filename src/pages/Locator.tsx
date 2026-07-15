import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import { Search, MapPin, ChevronDown, X, Navigation, List, Grid } from "lucide-react";

export default function Locator() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedLGA, setSelectedLGA] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const lgaQuery = trpc.pollingUnit.getLGAs.useQuery();
  const unitsQuery = trpc.pollingUnit.list.useQuery(
    {
      lga: selectedLGA || undefined,
      search: search || undefined,
      limit: 100,
    },
    { enabled: true }
  );

  const units = unitsQuery.data?.units || [];
  const lgas = lgaQuery.data || [];

  const grouped = units.reduce<Record<string, typeof units>>((acc, unit) => {
    if (!acc[unit.lga]) acc[unit.lga] = [];
    acc[unit.lga].push(unit);
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black uppercase tracking-tight text-white">
            {t("locator.title")}
          </h1>
          <span className="text-[10px] text-[#F59E0B] uppercase tracking-wider">OJÚTÓLÉ</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("locator.searchPlaceholder")}
              className="w-full h-10 pl-9 pr-4 rounded-xl glass text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-white/30" /></button>}
          </div>
          <button onClick={() => setShowFilter(!showFilter)}
            className={`h-10 px-3 rounded-xl glass flex items-center gap-1 text-sm transition-colors ${selectedLGA ? "text-[#2563EB] border-[#2563EB]/30" : "text-white/50"}`}>
            <ChevronDown size={14} />
            {t("locator.lga")}
          </button>
          <button onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="h-10 w-10 rounded-xl glass flex items-center justify-center text-white/50">
            {viewMode === "list" ? <Grid size={16} /> : <List size={16} />}
          </button>
        </div>

        {showFilter && (
          <div className="mt-3 p-3 rounded-xl glass-inner max-h-48 overflow-y-auto no-scrollbar animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/60 uppercase">{t("locator.lga")}</span>
              {selectedLGA && <button onClick={() => setSelectedLGA("")} className="text-xs text-[#2563EB]">Clear</button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lgas.map((lga) => (
                <button key={lga} onClick={() => setSelectedLGA(lga === selectedLGA ? "" : lga)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedLGA === lga ? "bg-[#2563EB] text-white" : "glass text-white/50 hover:text-white"
                  }`}>{lga}</button>
              ))}
            </div>
          </div>
        )}

        {selectedLGA && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#2563EB]/20 text-[#2563EB] text-xs">
              {selectedLGA}
              <button onClick={() => setSelectedLGA("")}><X size={10} /></button>
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <p className="text-xs text-white/40 mb-4">
          {units.length} {t("locator.unitsFound")}
          {selectedLGA ? ` ${t("locator.in")} ${selectedLGA}` : ` ${t("locator.acrossOsun")}`}
        </p>

        {!selectedLGA && !search && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">{t("locator.allLGAs")}</h2>
            <div className="flex flex-wrap gap-1.5">
              {lgas.map((lga) => (
                <button key={lga} onClick={() => { setSelectedLGA(lga); setShowFilter(false); }}
                  className="px-3 py-1.5 rounded-full glass text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all">{lga}</button>
              ))}
            </div>
          </section>
        )}

        {unitsQuery.isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl shimmer" />)}
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-12">
            <MapPin size={40} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/50">{t("locator.noResults")}</p>
            <p className="text-sm text-white/30 mt-1">{t("locator.tryAdjusting")}</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-4">
            {Object.entries(grouped).map(([lgaName, lgaUnits]) => (
              <div key={lgaName}>
                <h3 className="text-sm font-bold text-[#2563EB] mb-2 flex items-center gap-1">
                  <MapPin size={12} /> {lgaName}
                </h3>
                <div className="space-y-2">
                  {lgaUnits.map((unit) => (
                    <div key={unit.id} className="glass rounded-xl p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin size={14} className="text-[#2563EB]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{unit.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{unit.ward} {unit.registrationAreaCode && `· ${unit.registrationAreaCode}`}</p>
                      </div>
                      <button onClick={() => {
                          if (unit.latitude && unit.longitude) window.open(`https://www.google.com/maps?q=${unit.latitude},${unit.longitude}`, "_blank");
                        }} className="w-8 h-8 rounded-full glass flex items-center justify-center flex-shrink-0" title="Open in Maps">
                        <Navigation size={14} className="text-[#2563EB]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {units.map((unit) => (
              <div key={unit.id} className="glass rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 flex items-center justify-center mb-2">
                  <MapPin size={14} className="text-[#2563EB]" />
                </div>
                <p className="text-xs font-medium text-white line-clamp-2">{unit.name}</p>
                <p className="text-[10px] text-white/40 mt-1">{unit.ward}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
