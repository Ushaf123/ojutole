import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Lang = "en" | "yo";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.report": "Report",
    "nav.locator": "Locator",
    "nav.myReports": "My Reports",
    "nav.more": "More",

    // Hero
    "hero.tagline": "The Eye That Watches",
    "hero.title": "Your Vote,",
    "hero.subtitle": "Your Voice",
    "hero.description": "Report electoral irregularities in real-time across Osun State.",
    "hero.live": "Live: Election Monitoring Active",
    "hero.cta": "MAKE A REPORT",
    "hero.poweredBy": "Powered by",

    // Stats
    "stats.reports": "Reports Today",
    "stats.lgas": "LGAs Covered",
    "stats.citizens": "Citizens Engaged",

    // How It Works
    "hiw.title": "How It Works",
    "hiw.step1.title": "Capture Evidence",
    "hiw.step1.desc": "Snap photos, record videos, or voice notes at your polling unit",
    "hiw.step2.title": "Submit Report",
    "hiw.step2.desc": "Fill in the incident type and your location is auto-captured",
    "hiw.step3.title": "Track Impact",
    "hiw.step3.desc": "Monitor resolution in real-time and see your impact",

    // Recent Activity
    "recent.title": "Recent Activity",
    "recent.viewAll": "View All",
    "recent.empty": "Be the first to report from your polling unit",
    "recent.emptyCta": "Make a Report",

    // Report Page
    "report.title": "New Report",
    "report.ushaf": "OJÚTÓLÉ · USHAF Nigeria",
    "report.incidentType": "Incident Type",
    "report.location": "Location",
    "report.selectLGA": "Select LGA",
    "report.selectWard": "Select Ward",
    "report.evidence": "Evidence",
    "report.photo": "Photo",
    "report.video": "Video",
    "report.voice": "Voice",
    "report.recording": "Recording...",
    "report.description": "Description",
    "report.descPlaceholder": "Describe what you witnessed...",
    "report.gps": "GPS Location",
    "report.captureGPS": "Capture",
    "report.captured": "Captured",
    "report.phone": "Phone (Optional)",
    "report.phonePlaceholder": "080XXXXXXXX",
    "report.submit": "SUBMIT REPORT",
    "report.selectIncident": "Select an incident type to continue",

    // Incident types
    "incident.vote_buying": "Vote Buying",
    "incident.ballot_snatching": "Ballot Snatching",
    "incident.intimidation": "Intimidation",
    "incident.bvas_failure": "BVAS Failure",
    "incident.overvoting": "Overvoting",
    "incident.late_arrival": "Late Arrival",
    "incident.other": "Other",

    // Locator
    "locator.title": "Polling Unit Locator",
    "locator.searchPlaceholder": "Search polling unit or LGA...",
    "locator.lga": "LGA",
    "locator.allLGAs": "All 30 LGAs",
    "locator.unitsFound": "polling unit(s) found",
    "locator.acrossOsun": "across Osun State",
    "locator.in": "in",
    "locator.noResults": "No polling units found",
    "locator.tryAdjusting": "Try adjusting your search or filter",

    // My Reports
    "myReports.title": "My Reports",
    "myReports.filter.all": "All",
    "myReports.filter.submitted": "Submitted",
    "myReports.filter.pending": "Pending",
    "myReports.filter.resolved": "Resolved",
    "myReports.filter.offline": "Offline",
    "myReports.offlineWaiting": "report(s) waiting to sync",
    "myReports.noReports": "No reports yet",
    "myReports.noReportsDesc": "Tap the camera button to make your first report",
    "myReports.noFiltered": "No reports with this status",

    // Status
    "status.submitted": "Submitted",
    "status.pending": "Pending",
    "status.resolved": "Resolved",
    "status.escalated": "Escalated",

    // Settings
    "settings.title": "Settings",
    "settings.poweredBy": "Powered by USHAF Nigeria",
    "settings.appData": "App Data",
    "settings.information": "Information",
    "settings.settings": "Settings",
    "settings.support": "Support",
    "settings.legal": "Legal",

    "about.title": "About OJÚTÓLÉ",
    "about.desc": "Learn about our mission for electoral transparency",
    "howToReport.title": "How to Report",
    "howToReport.desc": "Step-by-step guide to making effective reports",
    "safetyTips.title": "Safety Tips",
    "safetyTips.desc": "Stay safe while monitoring elections",
    "offlineMode.title": "Offline Mode",
    "offlineMode.desc": "Save reports for later submission",
    "notifications.title": "Notifications",
    "notifications.desc": "Get updates on your reports",
    "language.title": "Language",
    "language.desc": "English / Yorùbá",
    "contact.title": "Contact Support",
    "contact.desc": "Get help with the app",
    "partner.title": "Partner With Us",
    "partner.desc": "NGOs, CSOs, and election bodies",
    "visit.title": "Visit USHAF Nigeria",
    "visit.desc": "Learn more about our work",

    "privacyPolicy.title": "Privacy Policy",
    "terms.title": "Terms of Service",

    // Admin
    "admin.title": "OJÚTÓLÉ Admin",
    "admin.subtitle": "USHAF Nigeria · Election Monitoring Center",
    "admin.totalReports": "Total Reports",
    "admin.activeToday": "Active Today",
    "admin.resolved": "Resolved",
    "admin.pending": "Pending",
    "admin.byType": "Reports by Type",
    "admin.topLGAs": "Top LGAs by Reports",
    "admin.recentReports": "Recent Reports",

    // Common
    "common.close": "Close",
    "common.back": "Back",
    "common.yes": "Yes",
    "common.no": "No",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.saved": "Saved",
    "common.error": "Error",
    "common.success": "Success",
    "common.loading": "Loading...",
    "common.retry": "Retry",
    "common.offline": "Offline",
    "common.online": "Online",
    "common.anonymous": "Anonymous User",
    "common.citizenReporter": "Citizen Reporter",

    // Version
    "version.text": "OJÚTÓLÉ v1.0.0 · Pilot Release",
    "version.innovation": "An Innovation of USHAF Nigeria",
    "logout": "Log Out",
  },
  yo: {
    // Navigation
    "nav.home": "Ilé",
    "nav.report": "Kéde",
    "nav.locator": "Àwáàrí",
    "nav.myReports": "Àwọn Ìròyìn Mi",
    "nav.more": "Ìmírán",

    // Hero
    "hero.tagline": "Ojú Tó ń Tẹ́lè",
    "hero.title": "Ìdìbò Rẹ,",
    "hero.subtitle": "Ohùn Rẹ",
    "hero.description": "Kéde àwọn àìtọ́ nígbà ìdìbò ní ọ̀nà àìdáǹdégbé kàkiri Ìpínlẹ̀ Osun.",
    "hero.live": "Láàárín: Ìmójútó Ìdìbò ń Ṣiṣẹ́",
    "hero.cta": "KÉDE Ọ̀RÀN",
    "hero.poweredBy": "Nípasẹ̀",

    // Stats
    "stats.reports": "Àwọn Ìròyìn Lónìí",
    "stats.lgas": "Àwọn LGA Tí A Kójú",
    "stats.citizens": "Àwọn Aráàlú Tó Kópa",

    // How It Works
    "hiw.title": "Bí Ó Ṣe N Ṣiṣẹ́",
    "hiw.step1.title": "Gba Ẹ̀rí",
    "hiw.step1.desc": "Yà àwòrán, fídíò, tàbí ohùn ní ibi ìdìbò rẹ",
    "hiw.step2.title": "Rán Ìròyìn",
    "hiw.step2.desc": "Yàn irú ọ̀ràn náà, àti ibi rẹ yóò jẹ́ ìdáǹdégbé",
    "hiw.step3.title": "Tẹ̀lé Ìdáhùn",
    "hiw.step3.desc": "Tẹ̀lé àtúnṣe ní ọ̀nà àìdáǹdégbé wo àgbára rẹ",

    // Recent Activity
    "recent.title": "Àwọn Ìròyìn Tuntun",
    "recent.viewAll": "Wo Gbogbo",
    "recent.empty": "Jẹ́ kí o rí i àkọ́kọ́ láti kéde láti ibi ìdìbò rẹ",
    "recent.emptyCta": "Kéde Ọ̀ràn",

    // Report Page
    "report.title": "Ìròyìn Tuntun",
    "report.ushaf": "OJÚTÓLÉ · USHAF Nigeria",
    "report.incidentType": "Irú Ọ̀ràn",
    "report.location": "Ibi",
    "report.selectLGA": "Yàn LGA",
    "report.selectWard": "Yàn Ward",
    "report.evidence": "Ẹ̀rí",
    "report.photo": "Àwòrán",
    "report.video": "Fídíò",
    "report.voice": "Ohùn",
    "report.recording": "Ń Gbà...",
    "report.description": "Àlàyé",
    "report.descPlaceholder": "Àlàyé ohun tí o rí...",
    "report.gps": "Ibi GPS",
    "report.captureGPS": "Gba",
    "report.captured": "A Gbà",
    "report.phone": "Nọ́mbà Fóònù (Kò Pọndandan)",
    "report.phonePlaceholder": "080XXXXXXXX",
    "report.submit": "RÁN ÌRÒYÌN",
    "report.selectIncident": "Yàn irú ọ̀ràn láti tẹ̀síwájú",

    // Incident types
    "incident.vote_buying": "Rá Ìdìbò",
    "incident.ballot_snatching": "Jí Bálọ̀tù",
    "incident.intimidation": "Ìdẹ́rùbà",
    "incident.bvas_failure": "Àṣìṣe BVAS",
    "incident.overvoting": "Púpọ̀ Jù",
    "incident.late_arrival": "Ìwáde Lẹ́yìn Àsìkò",
    "incident.other": "Èlòmíràn",

    // Locator
    "locator.title": "Àwáàrí Ibi Ìdìbò",
    "locator.searchPlaceholder": "Wá ibi ìdìbò tàbí LGA...",
    "locator.lga": "LGA",
    "locator.allLGAs": "Àwọn LGA 30",
    "locator.unitsFound": "ibi ìdìbò tí a rí",
    "locator.acrossOsun": "kàkiri Ìpínlẹ̀ Osun",
    "locator.in": "ní",
    "locator.noResults": "Kò sí ibi ìdìbò tí a rí",
    "locator.tryAdjusting": "Gbìyànjú láti tún wá",

    // My Reports
    "myReports.title": "Àwọn Ìròyìn Mi",
    "myReports.filter.all": "Gbogbo",
    "myReports.filter.submitted": "A Rán",
    "myReports.filter.pending": "Nílò Àtúnṣe",
    "myReports.filter.resolved": "A Yanjú",
    "myReports.filter.offline": "Láìní Òǹtẹ̀",
    "myReports.offlineWaiting": "ìròyìn ń retì ìsòro",
    "myReports.noReports": "Kò sí ìròyìn síi",
    "myReports.noReportsDesc": "Tẹ́ bọ́tìnì kámẹ́rà láti kéde ìròyìn àkọ́kọ́ rẹ",
    "myReports.noFiltered": "Kò sí ìròyìn pẹ̀lú ipò yìí",

    // Status
    "status.submitted": "A Rán",
    "status.pending": "Nílò Àtúnṣe",
    "status.resolved": "A Yanjú",
    "status.escalated": "A Gbé Sókè",

    // Settings
    "settings.title": "Ètò",
    "settings.poweredBy": "Nípasẹ̀ USHAF Nigeria",
    "settings.appData": "Dátà Àp",
    "settings.information": "Àlàyé",
    "settings.settings": "Ètò",
    "settings.support": "Ìrànlọ́wọ́",
    "settings.legal": "Òfin",

    "about.title": "Nípa OJÚTÓLÉ",
    "about.desc": "Kọ́ nípa iṣẹ́ wa fún òtítọ́ ìdìbò",
    "howToReport.title": "Bí A Ṣe ń Kéde",
    "howToReport.desc": "Ìtọ́nisọ́nà láti kéde dáadáa",
    "safetyTips.title": "Ìmọ̀ràn Ààbò",
    "safetyTips.desc": "Wà láàbò nígbà ìmójútó ìdìbò",
    "offlineMode.title": "Ìṣe Láìní Òǹtẹ̀",
    "offlineMode.desc": "Fipamọ́ àwọn ìròyìn fún ìfiránsẹ́ tó yóò tẹ̀wá",
    "notifications.title": "Ìkìlọ̀",
    "notifications.desc": "Gba àwọn ìmúdójúìwọ̀n lórí àwọn ìròyìn rẹ",
    "language.title": "Èdè",
    "language.desc": "Èdè Gẹ̀ẹ́sì / Yorùbá",
    "contact.title": "Kàn Sí Ìrànlọ́wọ́",
    "contact.desc": "Gbà ìrànlọ́wọ́ pẹ̀lú àp",
    "partner.title": "Bá A Ṣiṣẹ́ Pọ̀",
    "partner.desc": "Àwọn ẹgbẹ́ àìfọwóyí, CSOs, àti àwọn ilé ìdìbò",
    "visit.title": "Ṣàbẹ̀wò USHAF Nigeria",
    "visit.desc": "Kọ́ síi nípa iṣẹ́ wa",

    "privacyPolicy.title": "Òfin Àṣírí",
    "terms.title": "Ìlànà Ìlò",

    // Admin
    "admin.title": "OJÚTÓLÉ Alákòóso",
    "admin.subtitle": "USHAF Nigeria · Ilé Ìmójútó Ìdìbò",
    "admin.totalReports": "Àpapọ̀ Àwọn Ìròyìn",
    "admin.activeToday": "Ń Ṣiṣẹ́ Lónìí",
    "admin.resolved": "A Yanjú",
    "admin.pending": "Nílò Àtúnṣe",
    "admin.byType": "Àwọn Ìròyìn Lórí Irú",
    "admin.topLGAs": "Àwọn LGA Púpọ̀ Jùlọ",
    "admin.recentReports": "Àwọn Ìròyìn Tuntun",

    // Common
    "common.close": "Pa",
    "common.back": "Padà",
    "common.yes": "Bẹ́ẹ̀ni",
    "common.no": "Rárá",
    "common.cancel": "Fagilé",
    "common.save": "Fipamọ́",
    "common.saved": "A Fipamọ́",
    "common.error": "Àṣìṣe",
    "common.success": "Aṣeyọrí",
    "common.loading": "Ń kójọ àwọn...",
    "common.retry": "Gbìyànjú Tuntun",
    "common.offline": "Láìní Òǹtẹ̀",
    "common.online": "Lórí Òǹtẹ̀",
    "common.anonymous": "Aṣáájú Àìmọ̀",
    "common.citizenReporter": "Alábòójútó Aráàlú",

    // Version
    "version.text": "OJÚTÓLÉ v1.0.0 · Ìdáhùn Ìgbéyàwó",
    "version.innovation": "Ìmúrasílẹ̀ USHAF Nigeria",
    "logout": "Jáde",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("ojutole_language");
    return (saved === "yo" ? "yo" : "en") as Lang;
  });

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("ojutole_language", l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string) => {
      return translations[lang][key] || key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
