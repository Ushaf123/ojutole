/**
 * Simple JSON file-based store for OJÚTÓLÉ.
 * Uses official INEC polling unit data for Osun State.
 * Source: INEC Directory of Polling Units, Revised January 2015
 * 30 LGAs, 332 Wards, 2,834 Polling Units
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Find the PU data JSON file - works both in dev and bundled production
function findPUDataPath(): string {
  // When bundled with esbuild, the code runs from dist/boot.js
  // The osun-pu-data.json is copied to dist/ during build
  const candidates = [
    "./api/osun-pu-data.json",           // Development
    "./dist/osun-pu-data.json",          // Production (from project root)
    "./osun-pu-data.json",               // Same directory as boot.js
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  // Default fallback - will throw a clear error if not found
  return "./dist/osun-pu-data.json";
}

// ============================================================
// POLLING UNIT DATA (Official INEC) - Loaded from JSON at runtime
// ============================================================

interface PUEntry {
  lga: string;
  ward: string;
  units: Array<{ name: string; code: string }>;
}

let _puData: PUEntry[] | null = null;

function loadPUData(): PUEntry[] {
  if (_puData === null) {
    const jsonPath = findPUDataPath();
    console.log("[PU DATA] Loading from:", jsonPath);
    const raw = readFileSync(jsonPath, "utf-8");
    _puData = JSON.parse(raw) as PUEntry[];
    console.log("[PU DATA] Loaded", _puData.length, "LGA/ward entries");
  }
  return _puData;
}

let _flatPollingUnits: Array<{
  id: number;
  name: string;
  lga: string;
  ward: string;
  code: string;
  latitude: number;
  longitude: number;
}> | null = null;

function getFlatPollingUnits() {
  if (_flatPollingUnits === null) {
    _flatPollingUnits = [];
    let id = 1;
    for (const entry of loadPUData()) {
      for (const unit of entry.units) {
        _flatPollingUnits.push({
          id,
          name: unit.name,
          lga: entry.lga,
          ward: entry.ward,
          code: unit.code,
          // Approximate coordinates for Osun State
          latitude: 7.5 + (id * 0.0001),
          longitude: 4.5 + (id * 0.0001),
        });
        id++;
      }
    }
  }
  return _flatPollingUnits;
}

export function getLGAs(): string[] {
  const lgas = new Set<string>();
  for (const entry of loadPUData()) {
    lgas.add(entry.lga);
  }
  return Array.from(lgas).sort();
}

export function getWardsByLGA(lga: string): string[] {
  const wards = new Set<string>();
  for (const entry of loadPUData()) {
    if (entry.lga === lga) {
      wards.add(entry.ward);
    }
  }
  return Array.from(wards).sort();
}

export function getUnitsByLGAAndWard(lga: string, ward?: string) {
  const results = [];
  for (const entry of loadPUData()) {
    if (entry.lga === lga && (!ward || entry.ward === ward)) {
      for (const unit of entry.units) {
        results.push({
          name: unit.name,
          lga: entry.lga,
          ward: entry.ward,
          code: unit.code,
        });
      }
    }
  }
  return results;
}

export function getPollingUnits() {
  return getFlatPollingUnits();
}

export function getPollingUnitById(id: number) {
  return getFlatPollingUnits().find((u) => u.id === id) || null;
}

export function searchPollingUnits(query: string) {
  const q = query.toLowerCase();
  return getFlatPollingUnits().filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.lga.toLowerCase().includes(q) ||
      u.ward.toLowerCase().includes(q)
  );
}

export function getNearbyPollingUnits(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number
) {
  const results = [];
  for (const unit of getFlatPollingUnits()) {
    const dLat = ((unit.latitude - lat) * Math.PI) / 180;
    const dLng = ((unit.longitude - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((unit.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = 6371 * c;
    if (distance <= radiusKm) {
      results.push({ ...unit, distance: Math.round(distance * 100) / 100 });
    }
  }
  results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  return results.slice(0, limit);
}

// Raw data access for stats
export function getRawPUData(): PUEntry[] {
  return loadPUData();
}

// ============================================================
// JSON FILE STORE FOR REPORTS
// ============================================================

const REPORTS_FILE = "/tmp/reports.json";
const USERS_FILE = "/tmp/users.json";

export interface ReportRecord {
  id: number;
  incidentType: string;
  lga: string;
  ward?: string;
  pollingUnit?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  locationAddress?: string;
  status: string;
  syncStatus: string;
  reporterPhone?: string;
  reporterName?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ReportMediaRecord {
  id: number;
  reportId: number;
  mediaType: "photo" | "video" | "audio";
  url: string;
  thumbnail?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

export interface UserRecord {
  id: number;
  unionId: string;
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
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
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  getById(id: number): (ReportRecord & { media: ReportMediaRecord[] }) | undefined {
    const report = loadReports().find((r) => r.id === id);
    if (!report) return undefined;
    const media = loadMedia().filter((m) => m.reportId === id);
    return { ...report, media };
  },

  getMediaByReportId(reportId: number): ReportMediaRecord[] {
    return loadMedia().filter((m) => m.reportId === reportId);
  },

  create(
    data: Omit<
      ReportRecord,
      "id" | "submittedAt" | "updatedAt"
    > & {
      media?: Array<{
        mediaType: "photo" | "video" | "audio";
        url: string;
        thumbnail?: string;
        fileName?: string;
        fileSize?: number;
      }>;
    }
  ): number {
    const now = new Date().toISOString();
    const report: ReportRecord = {
      ...data,
      id: reportsNextId++,
      submittedAt: now,
      updatedAt: now,
    };
    loadReports().push(report);
    saveReports();

    if (data.media && data.media.length > 0) {
      const mediaRecords: ReportMediaRecord[] = data.media.map((m) => ({
        id: mediaNextId++,
        reportId: report.id,
        mediaType: m.mediaType,
        url: m.url,
        thumbnail: m.thumbnail,
        fileName: m.fileName,
        fileSize: m.fileSize,
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
      byStatus: Object.entries(byStatus).map(([status, count]) => ({
        status,
        count,
      })),
      byType: Object.entries(byType).map(([incidentType, count]) => ({
        incidentType,
        count,
      })),
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
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
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

  upsert(data: {
    unionId: string;
    name?: string;
    email?: string;
    avatar?: string;
  }): UserRecord {
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
