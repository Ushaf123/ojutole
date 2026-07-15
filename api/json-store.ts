/**
 * Simple JSON file-based store for OJUTOLÉ.
 * Replaces SQLite with pure JavaScript that works reliably on Render free tier.
 * No native modules, no compilation needed.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// All 30 Osun State LGAs with their wards and polling units
export const OSUN_LGAS = [
  "Aiyedaade", "Aiyedire", "Atakunmosa East", "Atakunmosa West",
  "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore",
  "Ejigbo", "Ife Central", "Ife East", "Ife North", "Ife South",
  "Ifedayo", "Ifelodun", "Ila", "Ilesa East", "Ilesa West",
  "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun",
  "Odo-Otin", "Ola-Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo",
];

const PU_TEMPLATES = [
  "St. Peter's Pry Sch", "Baptist Day Sch", "Community Pry Sch",
  "Town Hall", "Market Square", "L.A. Pry Sch", "N.U.D. Pry Sch",
  "Methodist Pry Sch", "C.A.C. Pry Sch", "Health Centre",
  "Anglican Pry Sch", "Catholic Pry Sch", "Muslim Pry Sch",
  "Oba's Palace", "Village Square", "A.U.D. Pry Sch",
];

// Generate static polling units
function generatePollingUnits() {
  const units: Array<{
    id: number;
    name: string;
    lga: string;
    ward: string;
    latitude: number;
    longitude: number;
    registrationAreaCode: string;
  }> = [];

  let id = 1;
  for (let i = 0; i < OSUN_LGAS.length; i++) {
    const lga = OSUN_LGAS[i];
    const wardCount = 3 + (i % 3); // 3-5 wards per LGA
    for (let w = 0; w < wardCount; w++) {
      const unitCount = 3 + ((i + w) % 4); // 3-6 units per ward
      for (let u = 0; u < unitCount; u++) {
        const wardName = `Ward ${w + 1}`;
        const puName = `${PU_TEMPLATES[(i + w + u) % PU_TEMPLATES.length]}, ${lga} ${wardName}`;
        const lat = 7.5 + (i * 0.015) + (w * 0.003) + (Math.random() * 0.002);
        const lng = 4.2 + (w * 0.015) + (u * 0.003) + (Math.random() * 0.002);
        units.push({
          id,
          name: puName,
          lga,
          ward: wardName,
          latitude: Math.round(lat * 1000000) / 1000000,
          longitude: Math.round(lng * 1000000) / 1000000,
          registrationAreaCode: `${String(i + 1).padStart(2, "0")}-${String(w + 1).padStart(2, "0")}-${String(u + 1).padStart(3, "0")}`,
        });
        id++;
      }
    }
  }
  return units;
}

// Static polling units — generated once, never changes
const POLLING_UNITS = generatePollingUnits();

export function getPollingUnits() {
  return POLLING_UNITS;
}

export function getLGAs(): string[] {
  return [...OSUN_LGAS];
}

export function getWardsByLGA(lga: string): string[] {
  const wards = new Set<string>();
  for (const unit of POLLING_UNITS) {
    if (unit.lga === lga) {
      wards.add(unit.ward);
    }
  }
  return Array.from(wards).sort();
}

export function getUnitsByLGAAndWard(lga: string, ward?: string) {
  return POLLING_UNITS.filter(
    (u) => u.lga === lga && (!ward || u.ward === ward)
  );
}

export function searchPollingUnits(query: string) {
  const q = query.toLowerCase();
  return POLLING_UNITS.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.lga.toLowerCase().includes(q) ||
      u.ward.toLowerCase().includes(q)
  );
}

export function getPollingUnitById(id: number) {
  return POLLING_UNITS.find((u) => u.id === id) || null;
}

export function getNearbyPollingUnits(lat: number, lng: number, radiusKm: number, limit: number) {
  const results = [];
  for (const unit of POLLING_UNITS) {
    const dLat = ((unit.latitude - lat) * Math.PI) / 180;
    const dLng = ((unit.longitude - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((unit.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = 6371 * c; // Earth's radius in km
    if (distance <= radiusKm) {
      results.push({ ...unit, distance: Math.round(distance * 100) / 100 });
    }
  }
  results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  return results.slice(0, limit);
}

// ============================================================
// JSON FILE STORE FOR REPORTS
// ============================================================

const REPORTS_FILE = "/tmp/reports.json";
const USERS_FILE = "/tmp/users.json";

interface ReportRecord {
  id: number;
  incidentType: string;
  lga: string;
  ward?: string;
  pollingUnit?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  status: string;
  syncStatus: string;
  reporterPhone?: string;
  submittedAt: string;
  updatedAt: string;
}

interface ReportMediaRecord {
  id: number;
  reportId: number;
  mediaType: string;
  url: string;
  thumbnail?: string;
  createdAt: string;
}

interface UserRecord {
  id: number;
  unionId: string;
  name?: string;
  email?: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string;
}

function ensureDir(path: string) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile<T>(path: string, defaultValue: T): T {
  try {
    if (!existsSync(path)) return defaultValue;
    const data = readFileSync(path, "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile<T>(path: string, data: T) {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

// Reports store
let reportsCache: ReportRecord[] | null = null;
let reportsNextId = 1;

function loadReports(): ReportRecord[] {
  if (reportsCache === null) {
    reportsCache = readJsonFile<ReportRecord[]>(REPORTS_FILE, []);
    // Find next ID
    for (const r of reportsCache) {
      if (r.id >= reportsNextId) reportsNextId = r.id + 1;
    }
  }
  return reportsCache;
}

function saveReports() {
  if (reportsCache !== null) {
    writeJsonFile(REPORTS_FILE, reportsCache);
  }
}

// Media store
let mediaCache: ReportMediaRecord[] | null = null;
let mediaNextId = 1;

function loadMedia(): ReportMediaRecord[] {
  if (mediaCache === null) {
    mediaCache = readJsonFile<ReportMediaRecord[]>("/tmp/report_media.json", []);
    for (const m of mediaCache) {
      if (m.id >= mediaNextId) mediaNextId = m.id + 1;
    }
  }
  return mediaCache;
}

function saveMedia() {
  if (mediaCache !== null) {
    writeJsonFile("/tmp/report_media.json", mediaCache);
  }
}

// Users store
let usersCache: UserRecord[] | null = null;
let usersNextId = 1;

function loadUsers(): UserRecord[] {
  if (usersCache === null) {
    usersCache = readJsonFile<UserRecord[]>(USERS_FILE, []);
    for (const u of usersCache) {
      if (u.id >= usersNextId) usersNextId = u.id + 1;
    }
  }
  return usersCache;
}

function saveUsers() {
  if (usersCache !== null) {
    writeJsonFile(USERS_FILE, usersCache);
  }
}

// Public API
export const reportStore = {
  getAll(): ReportRecord[] {
    return [...loadReports()].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  getById(id: number): ReportRecord | undefined {
    return loadReports().find((r) => r.id === id);
  },

  getMediaByReportId(reportId: number): ReportMediaRecord[] {
    return loadMedia().filter((m) => m.reportId === reportId);
  },

  create(data: Omit<ReportRecord, "id" | "submittedAt" | "updatedAt"> & { media?: Array<{ mediaType: string; url: string; thumbnail?: string }> }): number {
    const now = new Date().toISOString();
    const report: ReportRecord = {
      ...data,
      id: reportsNextId++,
      submittedAt: now,
      updatedAt: now,
    };
    loadReports().push(report);
    saveReports();

    // Save media if provided
    if (data.media && data.media.length > 0) {
      const mediaRecords: ReportMediaRecord[] = data.media.map((m) => ({
        id: mediaNextId++,
        reportId: report.id,
        mediaType: m.mediaType,
        url: m.url,
        thumbnail: m.thumbnail,
        createdAt: now,
      }));
      loadMedia().push(...mediaRecords);
      saveMedia();
    }

    return report.id;
  },

  updateStatus(id: number, status: string): boolean {
    const reports = loadReports();
    const report = reports.find((r) => r.id === id);
    if (!report) return false;
    report.status = status;
    report.updatedAt = new Date().toISOString();
    saveReports();
    return true;
  },

  getStats() {
    const all = loadReports();
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byLGA: Record<string, number> = {};

    for (const r of all) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.incidentType] = (byType[r.incidentType] || 0) + 1;
      byLGA[r.lga] = (byLGA[r.lga] || 0) + 1;
    }

    return {
      total: all.length,
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byType: Object.entries(byType).map(([incidentType, count]) => ({ incidentType, count })),
      byLGA: Object.entries(byLGA)
        .map(([lga, count]) => ({ lga, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  },

  filter(options: {
    status?: string;
    lga?: string;
    incidentType?: string;
    limit?: number;
    offset?: number;
  }) {
    let results = loadReports();

    if (options.status) {
      results = results.filter((r) => r.status === options.status);
    }
    if (options.lga) {
      results = results.filter((r) => r.lga === options.lga);
    }
    if (options.incidentType) {
      results = results.filter((r) => r.incidentType === options.incidentType);
    }

    results.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    const total = results.length;
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    results = results.slice(offset, offset + limit);

    return { reports: results, total };
  },
};

export const userStore = {
  getAll(): UserRecord[] {
    return loadUsers();
  },

  getByUnionId(unionId: string): UserRecord | undefined {
    return loadUsers().find((u) => u.unionId === unionId);
  },

  getById(id: number): UserRecord | undefined {
    return loadUsers().find((u) => u.id === id);
  },

  upsert(data: { unionId: string; name?: string; email?: string; avatar?: string }): UserRecord {
    const users = loadUsers();
    const existing = users.find((u) => u.unionId === data.unionId);
    const now = new Date().toISOString();

    if (existing) {
      existing.name = data.name || existing.name;
      existing.email = data.email || existing.email;
      existing.avatar = data.avatar || existing.avatar;
      existing.lastSignInAt = now;
      existing.updatedAt = now;
      saveUsers();
      return existing;
    }

    const newUser: UserRecord = {
      id: usersNextId++,
      unionId: data.unionId,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignInAt: now,
    };
    users.push(newUser);
    saveUsers();
    return newUser;
  },
};

// User type for auth
export type User = UserRecord;
