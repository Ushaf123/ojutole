import { useState } from "react";
import type { ReactNode, ComponentType } from "react";
import {
  Info, Shield, Phone, Globe, Bell, Database,
  ChevronRight, ExternalLink, BookOpen, Heart, WifiOff,
  Check, ChevronLeft, Mail
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

type ModalView = null | "about" | "howToReport" | "safetyTips" | "language" | "partner" | "contact" | "privacy" | "terms";

interface MenuItemAction {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
  action: () => void;
  extra?: ReactNode;
}

interface MenuItemToggle {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
  toggle: true;
  value: boolean;
  onToggle: () => void;
}

type MenuItem = MenuItemAction | MenuItemToggle;

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function More() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [offlineMode, setOfflineMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [modal, setModal] = useState<ModalView>(null);

  const menuSections: MenuSection[] = [
    {
      title: t("settings.information"),
      items: [
        {
          icon: Info,
          label: t("about.title"),
          desc: t("about.desc"),
          action: () => setModal("about"),
        },
        {
          icon: BookOpen,
          label: t("howToReport.title"),
          desc: t("howToReport.desc"),
          action: () => setModal("howToReport"),
        },
        {
          icon: Shield,
          label: t("safetyTips.title"),
          desc: t("safetyTips.desc"),
          action: () => setModal("safetyTips"),
        },
      ],
    },
    {
      title: t("settings.settings"),
      items: [
        {
          icon: WifiOff,
          label: t("offlineMode.title"),
          desc: t("offlineMode.desc"),
          toggle: true,
          value: offlineMode,
          onToggle: () => setOfflineMode(!offlineMode),
        },
        {
          icon: Bell,
          label: t("notifications.title"),
          desc: t("notifications.desc"),
          toggle: true,
          value: notifications,
          onToggle: () => setNotifications(!notifications),
        },
        {
          icon: Globe,
          label: t("language.title"),
          desc: t("language.desc"),
          action: () => setModal("language"),
          extra: (
            <span className="text-xs text-[#F59E0B] font-medium mr-1">
              {lang === "en" ? "English" : "Yorùbá"}
            </span>
          ),
        },
      ],
    },
    {
      title: t("settings.support"),
      items: [
        {
          icon: Phone,
          label: t("contact.title"),
          desc: t("contact.desc"),
          action: () => setModal("contact"),
        },
        {
          icon: Heart,
          label: t("partner.title"),
          desc: t("partner.desc"),
          action: () => setModal("partner"),
        },
        {
          icon: ExternalLink,
          label: t("visit.title"),
          desc: t("visit.desc"),
          action: () => window.open("mailto:ushafnigeria@gmail.com?subject=Partnering%20with%20OJUT%C3%93L%C3%89", "_blank"),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <img src="/ojutole-logo.png" alt="OJÚTÓLÉ" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              OJÚTÓLÉ
            </h1>
            <p className="text-[10px] text-[#F59E0B] uppercase tracking-wider">{t("settings.poweredBy")}</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2563EB] to-[#F59E0B] flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{user?.name || t("common.citizenReporter")}</p>
            <p className="text-sm text-white/50">{user?.email || t("common.anonymous")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* App Stats */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Database size={16} className="text-[#2563EB]" />
            <span className="text-sm font-semibold text-white/60">{t("settings.appData")}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-[#F59E0B]">30</p>
              <p className="text-[10px] text-white/40 uppercase">LGAs</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#2563EB]">480+</p>
              <p className="text-[10px] text-white/40 uppercase">{t("locator.unitsFound")}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">7</p>
              <p className="text-[10px] text-white/40 uppercase">{lang === "en" ? "Incident Types" : "Irú Ọ̀ràn"}</p>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={"action" in item ? item.action : undefined}
                  className="w-full glass rounded-xl p-3 flex items-center gap-3 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon size={16} className="text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-white/40">{item.desc}</p>
                  </div>
                  {"extra" in item && item.extra}
                  {"toggle" in item ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onToggle();
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                        item.value ? "bg-[#2563EB]" : "bg-white/20"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          item.value ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  ) : (
                    <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Legal */}
        <section>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 px-1">
            {t("settings.legal")}
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => setModal("privacy")}
              className="w-full glass rounded-xl p-3 text-left text-sm text-white/60 hover:text-white transition-colors"
            >
              {t("privacyPolicy.title")}
            </button>
            <button
              onClick={() => setModal("terms")}
              className="w-full glass rounded-xl p-3 text-left text-sm text-white/60 hover:text-white transition-colors"
            >
              {t("terms.title")}
            </button>
          </div>
        </section>

        {/* Version */}
        <div className="text-center pt-4 space-y-1">
          <p className="text-xs text-white/20">{t("version.text")}</p>
          <p className="text-[10px] text-[#F59E0B]/60 uppercase tracking-wider">{t("version.innovation")}</p>
        </div>

        {user && (
          <button
            onClick={() => logout()}
            className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
          >
            {t("logout")}
          </button>
        )}
      </div>

      {/* ===== MODALS ===== */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          {/* Sheet */}
          <div className="relative w-full max-h-[85vh] bg-[#0A0E27] rounded-t-3xl overflow-y-auto no-scrollbar animate-slide-up border-t border-white/10">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 glass border-b border-white/10 px-4 py-4 flex items-center gap-3">
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full glass flex items-center justify-center">
                <ChevronLeft size={16} className="text-white/60" />
              </button>
              <h2 className="text-lg font-bold text-white">
                {modal === "about" && t("about.title")}
                {modal === "howToReport" && t("howToReport.title")}
                {modal === "safetyTips" && t("safetyTips.title")}
                {modal === "language" && t("language.title")}
                {modal === "partner" && t("partner.title")}
                {modal === "contact" && t("contact.title")}
                {modal === "privacy" && t("privacyPolicy.title")}
                {modal === "terms" && t("terms.title")}
              </h2>
            </div>

            <div className="px-4 py-6 space-y-4">
              {/* ABOUT */}
              {modal === "about" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-4">
                    <img src="/ojutole-logo.png" alt="OJÚTÓLÉ" className="w-24 h-24 object-contain" />
                  </div>
                  <h3 className="text-xl font-black text-center text-gradient">OJÚTÓLÉ</h3>
                  <p className="text-center text-sm text-white/50">{t("hero.tagline")}</p>
                  <div className="glass rounded-2xl p-4 space-y-3">
                    <p className="text-sm text-white/70 leading-relaxed">
                      {lang === "en"
                        ? "OJÚTÓLÉ (The Eye That Watches) is a civic tech innovation from USHAF Nigeria, designed to empower citizens to report electoral irregularities in real-time. Built for the Osun State gubernatorial election, it strengthens electoral transparency, civic engagement, and credible participation."
                        : "OJÚTÓLÉ (Ojú Tó ń Tẹ́lè) jẹ́ ìmúrasílẹ̀ ìmọ̀ ẹ̀rọ ọ̀rọ̀ àwùjọ láti USHAF Nigeria, tí a ṣe láti fún àwọn aráàlú ní agbára láti kéde àwọn àìtọ́ ìdìbò ní ọ̀nà àìdáǹdégbé. A kọ́ ọ fún ìdìbò gómìnà Ìpínlẹ̀ Osun, ó mú òtítọ́ ìdìbò, ìkópa àwọn aráàlú, àti ìdíje tó yẹ kí ó wáyé."
                      }
                    </p>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-2">
                      {lang === "en" ? "Our Mission" : "Iṣẹ́ Wa"}
                    </h4>
                    <ul className="space-y-2">
                      {(lang === "en" ? [
                        "Encourage informed participation of youth and women in elections",
                        "Strengthen electoral transparency across Nigeria",
                        "Provide real-time evidence-based reporting tools",
                        "Empower citizens as election monitors",
                      ] : [
                        "Ìdásílà àwọn ọ̀dọ́ àti obìnrin nínú ìdìbò",
                        "Ìmú òtítọ́ ìdìbò kàkiri Nàìjíríà",
                        "Ìpèsè àwọn irinṣẹ́ kéde tó dá lórí ẹ̀rí",
                        "Ìfún àwọn aráàlú ní agbára gẹ́gẹ́ bí alábòójútó ìdìbò",
                      ]).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                          <Check size={14} className="text-[#2563EB] mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass-inner rounded-xl p-3 text-center">
                    <p className="text-xs text-[#F59E0B] uppercase tracking-wider font-semibold">
                      {t("version.innovation")}
                    </p>
                  </div>
                </div>
              )}

              {/* HOW TO REPORT */}
              {modal === "howToReport" && (
                <div className="space-y-4">
                  {(lang === "en" ? [
                    { step: "1", title: "Select Incident Type", desc: "Choose from 7 categories: Vote Buying, Ballot Snatching, Intimidation, BVAS Failure, Overvoting, Late Arrival, or Other." },
                    { step: "2", title: "Choose Location", desc: "Select your Local Government Area (LGA) and Ward from the dropdown menus." },
                    { step: "3", title: "Capture Evidence", desc: "Tap the camera for photos, video icon for recordings, or hold the mic button for voice notes." },
                    { step: "4", title: "Add Description", desc: "Write a brief description of what you witnessed (max 500 characters)." },
                    { step: "5", title: "Capture GPS", desc: "Tap 'Capture' to include your exact location with the report." },
                    { step: "6", title: "Submit", desc: "Tap 'Submit Report'. If offline, it will be saved and sent automatically when you're back online." },
                  ] : [
                    { step: "1", title: "Yàn Irú Ọ̀ràn", desc: "Yàn láti inú ẹ̀yà 7: Rá Ìdìbò, Jí Bálọ̀tù, Ìdẹ́rùbà, Àṣìṣe BVAS, Púpọ̀ Jù, Ìwáde Lẹ́yìn Àsìkò, tàbí Èlòmíràn." },
                    { step: "2", title: "Yàn Ibi", desc: "Yàn Agbègbè Ìjọba ìbílẹ̀ (LGA) àti Ward rẹ nínú àtòkò àwọn àsàyàn." },
                    { step: "3", title: "Gba Ẹ̀rí", desc: "Tẹ́ bọ́tìnì kámẹ́rà fún àwòrán, àmì fídíò fún àwọn igbàsí, tàbí túbọ̀ mì bọ́tìnì màík fún àwọn ìròyìn ohùn." },
                    { step: "4", title: "Fi Àlàyé Kún", desc: "Kọ àlàyé kúkúrú nípa ohun tí o rí (tó pọ̀ jùlọ lẹ́tà 500)." },
                    { step: "5", title: "Gba GPS", desc: "Tẹ́ 'Gba' láti fi ibi rẹ pátó mọ́ ìròyìn náà." },
                    { step: "6", title: "Rán", desc: "Tẹ́ 'Rán Ìròyìn'. Tí òǹtẹ̀ bá lọ, a óò fipamọ́ ó sì yóò rán ara rẹ nígbà tí o bá padà sórí òǹtẹ̀." },
                  ]).map((s, i) => (
                    <div key={i} className="flex items-start gap-4 glass rounded-2xl p-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold">
                        {s.step}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{s.title}</h4>
                        <p className="text-sm text-white/60 mt-1">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SAFETY TIPS */}
              {modal === "safetyTips" && (
                <div className="space-y-3">
                  <div className="glass rounded-2xl p-4 bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20">
                    <p className="text-sm text-red-300 font-medium text-center">
                      {lang === "en" ? "Your safety is more important than any report." : "Ààbò rẹ ga jù ìròyìn kan lọ."}
                    </p>
                  </div>
                  {(lang === "en" ? [
                    { title: "Stay Anonymous", desc: "You can report without providing your phone number. Your identity is always protected." },
                    { title: "Keep Distance", desc: "Do not confront violators. Report from a safe distance using your phone discreetly." },
                    { title: "Have an Exit Plan", desc: "Before reporting, know how you will leave the area safely if needed." },
                    { title: "Use Discretion", desc: "Be subtle when using the app. Don't draw attention to yourself." },
                    { title: "Report After Leaving", desc: "If the situation is dangerous, leave first, then submit your report from a safe location." },
                    { title: "Team Up", desc: "Whenever possible, monitor elections in pairs or groups for mutual safety." },
                    { title: "Emergency Contacts", desc: "Save local security and INEC hotline numbers before election day." },
                    { title: "Trust Your Instincts", desc: "If a situation feels unsafe, leave immediately. No report is worth your life." },
                  ] : [
                    { title: "Wà Láìmọ̀", desc: "O lè kéde láìfi nọ́mbà fóònù rẹ. Orúkọ rẹ máa wà ní ìpamọ́ nígbà gbogbo." },
                    { title: "Dúró Ní ìhín", desc: "Má ṣe dojú kọ àwọn àwàdà. Kéde láti inú ìhín ààbò lòótọ́ pẹ̀lú lílò fóònù rẹ." },
                    { title: "Ní Ìpinnu Ìjáde", desc: "Kí o tó kéde, mọ̀ bí o ṣe máa fi agbègbè náà sílẹ̀ láìsí wahala tí ó bá ṣeéṣe." },
                    { title: "Lò Ní ìhín", desc: "Jẹ́ kí o máa ṣe àfihàn nígbà tí o bá ń lò àp. Má ṣe mú ìtẹ́tí sí ara rẹ." },
                    { title: "Kéde Lẹ́yìn Ìjáde", desc: "Tí ipò bá lewu, kọjá sílẹ̀ kíákíá, lẹ́yìn náà rán ìròyìn rẹ láti ibi ààbò." },
                    { title: "Dá Pọ̀", desc: "Nígbàkúgbà tí ó ṣeéṣe, ṣàyẹ̀wò ìdìbò pẹ̀lú àwọn ẹlòmíràn fún ààbò." },
                    { title: "Àwọn Olùbáàsǫ̀ràn Àìsàn", desc: "Fipamọ́ àwọn nọ́mbà ààbò àti INEC ṣáájú ọjọ́ ìdìbò." },
                    { title: "Gbọ́kàn Lé Òye Rẹ", desc: "Tí ipò bá dà bíi pé ó lewu, kọjá sílẹ̀ kíákíá. Kò sí ìròyìn tó tó ìyè rẹ." },
                  ]).map((tip, i) => (
                    <div key={i} className="glass rounded-xl p-4">
                      <h4 className="font-bold text-white text-sm">{tip.title}</h4>
                      <p className="text-sm text-white/50 mt-1">{tip.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* LANGUAGE SELECTOR */}
              {modal === "language" && (
                <div className="space-y-3">
                  <p className="text-sm text-white/50 text-center mb-4">
                    {lang === "en" ? "Choose your preferred language" : "Yàn èdè tí o fẹ́"}
                  </p>
                  {(["en", "yo"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`w-full glass rounded-2xl p-4 flex items-center gap-4 transition-all ${
                        lang === l ? "border-[#2563EB] bg-[#2563EB]/10" : ""
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        lang === l ? "bg-[#2563EB] text-white" : "bg-white/10 text-white/50"
                      }`}>
                        {l === "en" ? "EN" : "YO"}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-white">{l === "en" ? "English" : "Yorùbá"}</p>
                        <p className="text-xs text-white/40">{l === "en" ? "English (UK)" : "Èdè Yorùbá"}</p>
                      </div>
                      {lang === l && (
                        <div className="w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                  <p className="text-xs text-white/30 text-center mt-4">
                    {lang === "en"
                      ? "More languages coming soon."
                      : "Àwọn èdè mìíràn yóò dé láìpẹ́."}
                  </p>
                </div>
              )}

              {/* PARTNER */}
              {modal === "partner" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2563EB] to-[#F59E0B] flex items-center justify-center">
                      <Heart size={32} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-center text-white">
                    {lang === "en" ? "Partner With Us" : "Bá A Ṣiṣẹ́ Pọ̀"}
                  </h3>
                  <p className="text-sm text-white/60 text-center">
                    {lang === "en"
                      ? "OJÚTÓLÉ is open for partnerships with NGOs, CSOs, election observation groups, and civic organizations."
                      : "OJÚTÓLÉ wà fún àwọn ajọṣepọ̀ pẹ̀lú àwọn NGO, CSO, àwọn ẹgbẹ́ ìmójútó ìdìbò, àti àwọn ilé àwùjọ."}
                  </p>
                  <div className="glass rounded-2xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-white">
                      {lang === "en" ? "Who Can Partner" : "Tí Ó Lè Bá A Ṣiṣẹ́ Pọ̀"}
                    </h4>
                    {(lang === "en" ? [
                      "Civil Society Organizations (CSOs)",
                      "Non-Governmental Organizations (NGOs)",
                      "Election Observation Groups",
                      "Youth and Women's Organizations",
                      "Media Organizations",
                      "International Development Partners",
                    ] : [
                      "Àwọn Ilé Àwùjọ Àwọn Aráàlú (CSOs)",
                      "Àwọn Ilé Àjọ Àìjọba (NGOs)",
                      "Àwọn Ẹgbẹ́ Ìmójútó Ìdìbò",
                      "Àwọn Ẹgbẹ́ Ọ̀dọ́ àti Obìnrin",
                      "Àwọn Ilé Mídíà",
                      "Àwọn Alábàáṣiṣẹ́ Ìdàgbàsókè Àgbáyé",
                    ]).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                        <Check size={14} className="text-[#2563EB] flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <a
                    href="mailto:ushafnigeria@gmail.com?subject=Partnering%20with%20OJUT%C3%93L%C3%89"
                    className="w-full py-4 rounded-2xl bg-[#2563EB] text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Mail size={18} />
                    {lang === "en" ? "Email USHAF Nigeria" : "Rán Íméèlì sí USHAF Nigeria"}
                  </a>
                </div>
              )}

              {/* CONTACT */}
              {modal === "contact" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-4">
                    <div className="w-20 h-20 rounded-full bg-[#2563EB]/20 flex items-center justify-center">
                      <Phone size={32} className="text-[#2563EB]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-center text-white">
                    {lang === "en" ? "Contact Support" : "Kàn Sí Ìrànlọ́wọ́"}
                  </h3>
                  <div className="glass rounded-2xl p-4 space-y-4">
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Email</p>
                      <a href="mailto:ushafnigeria@gmail.com" className="text-sm text-[#2563EB] font-medium">
                        ushafnigeria@gmail.com
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                        {lang === "en" ? "Response Time" : "Àsìkò Ìdáhùn"}
                      </p>
                      <p className="text-sm text-white/60">
                        {lang === "en" ? "Within 24 hours" : "Láàárín wákàtí 24"}
                      </p>
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-2">
                      {lang === "en" ? "Common Issues" : "Àwọn Ọ̀ràn Gbogbogbò"}
                    </h4>
                    <ul className="space-y-2">
                      {(lang === "en" ? [
                        "GPS not capturing location",
                        "Report not submitting",
                        "Offline queue not syncing",
                        "Camera not opening",
                      ] : [
                        "GPS kò gba ibi",
                        "Ìròyìn kò lè rán",
                        "Ìròyìn láìsí òǹtẹ̀ kò lè sòro",
                        "Kámẹ́rà kò lè sí",
                      ]).map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                          <span className="text-[#2563EB]">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* PRIVACY POLICY */}
              {modal === "privacy" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">{t("privacyPolicy.title")}</h3>
                  <div className="glass rounded-2xl p-4 space-y-3 text-sm text-white/60 leading-relaxed">
                    <p>
                      OJÚTÓLÉ by USHAF Nigeria is committed to protecting your privacy.
                      This policy explains how we collect, use, and safeguard your information.
                    </p>
                    <h4 className="font-bold text-white">1. Information We Collect</h4>
                    <p>We collect: incident reports, optional photos/videos/audio, GPS coordinates (fuzzed to ~100m for public display), and optional phone number.</p>
                    <h4 className="font-bold text-white">2. How We Use It</h4>
                    <p>Data is used solely for election monitoring, incident verification, and generating anonymized public reports. We never sell your data.</p>
                    <h4 className="font-bold text-white">3. Data Protection</h4>
                    <p>All media uploads are reviewed. Exact GPS locations are only visible to authorized admin personnel. Phone numbers are stored securely.</p>
                    <h4 className="font-bold text-white">4. Your Rights</h4>
                    <p>You can report anonymously. You may request deletion of your data by contacting ushafnigeria@gmail.com.</p>
                  </div>
                  <p className="text-[10px] text-[#F59E0B]/60 uppercase tracking-wider text-center">
                    {t("version.innovation")}
                  </p>
                </div>
              )}

              {/* TERMS OF SERVICE */}
              {modal === "terms" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">{t("terms.title")}</h3>
                  <div className="glass rounded-2xl p-4 space-y-3 text-sm text-white/60 leading-relaxed">
                    <p>
                      By using OJÚTÓLÉ, you agree to these terms. OJÚTÓLÉ is an innovation of USHAF Nigeria,
                      developed to strengthen electoral transparency and civic engagement.
                    </p>
                    <h4 className="font-bold text-white">1. Responsible Use</h4>
                    <p>You agree to use OJÚTÓLÉ responsibly for reporting genuine electoral irregularities only. False or malicious reports may be flagged and removed.</p>
                    <h4 className="font-bold text-white">2. Accuracy</h4>
                    <p>You are responsible for the accuracy of the information you submit. Do not submit fabricated evidence or misleading reports.</p>
                    <h4 className="font-bold text-white">3. Safety</h4>
                    <p>Always prioritize your personal safety. Do not use OJÚTÓLÉ in situations that could endanger you or others.</p>
                    <h4 className="font-bold text-white">4. Content</h4>
                    <p>By submitting media (photos, videos, audio), you grant USHAF Nigeria permission to use this content for election monitoring and reporting purposes.</p>
                    <h4 className="font-bold text-white">5. Changes</h4>
                    <p>USHAF Nigeria reserves the right to update these terms. Continued use after changes constitutes acceptance.</p>
                  </div>
                  <p className="text-[10px] text-[#F59E0B]/60 uppercase tracking-wider text-center">
                    {t("version.innovation")}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom spacer */}
            <div className="h-8" />
          </div>
        </div>
      )}
    </div>
  );
}
