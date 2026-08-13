/**
 * Simple JSON file-based store for OJÚTÓLÉ.
 * Uses official INEC polling unit data for Osun State.
 * Source: INEC Directory of Polling Units, Revised January 2015
 * 30 LGAs, 332 Wards, 3,763 Polling Units
 *
 * CRITICAL TIER FEATURES:
 * - Full verification workflow: received → triaged → under_verification → verified/unverified/escalated → closed
 * - Audit trail: every status change logged with operator, timestamp, reason
 * - Confidence grading: auto-calculated based on source quality + media + GPS
 * - Reporter identity wall: reporter details separated from report content
 * - Case IDs: human-readable reference numbers (OJT-XXXXX)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

// Find the PU data JSON file - works both in dev and bundled production
function findPUDataPath(): string {
  const candidates = [
    "./api/osun-pu-data.json",
    "./dist/osun-pu-data.json",
    "./osun-pu-data.json",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
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

export function getRawPUData(): PUEntry[] {
  return loadPUData();
}

// ============================================================
// FULL VERIFICATION WORKFLOW STATUS ENUM
// ============================================================
export const WORKFLOW_STATUSES = [
  "received",
  "triaged",
  "under_verification",
  "verified",
  "unverified",
  "escalated",
  "closed",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

// ============================================================
// CONFIDENCE GRADING
// ============================================================
export type ConfidenceLevel = "high" | "medium" | "low";

export function calculateConfidence(data: {
  reporterName?: string;
  reporterPhone?: string;
  mediaCount: number;
  hasGps: boolean;
  anonymous: boolean;
}): ConfidenceLevel {
  let score = 0;

  // Known reporter (trained/community reporter)
  if (data.reporterName && data.reporterPhone && !data.anonymous) score += 3;
  // Has media evidence
  if (data.mediaCount >= 2) score += 3;
  else if (data.mediaCount === 1) score += 2;
  // Has GPS
  if (data.hasGps) score += 2;
  // Anonymous = lower confidence
  if (data.anonymous) score -= 2;
  // Single source = baseline
  score += 1;

  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

// ============================================================
// CASE ID GENERATION — Permanent sequential counter
// Counter persists in file, never resets. Format: OJT-XXXXXX
// Defined after DATA_DIR to ensure correct path
// ============================================================
let caseIdCounter = 0;
let counterFilePath = "";

function initCounter(dataDir: string) {
  counterFilePath = join(dataDir, "case_counter.json");
  try {
    if (existsSync(counterFilePath)) {
      const data = JSON.parse(readFileSync(counterFilePath, "utf-8"));
      caseIdCounter = data.counter || 0;
    }
  } catch { /* ignore */ }
}

function saveCounter(value: number) {
  try {
    if (counterFilePath) {
      writeFileSync(counterFilePath, JSON.stringify({ counter: value, lastUpdated: new Date().toISOString() }, null, 2));
    }
  } catch { /* ignore */ }
}

function generateCaseId(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  caseIdCounter++;
  saveCounter(caseIdCounter);
  return `OJT-${dateStr}-${String(caseIdCounter).padStart(6, "0")}`;
}

// ============================================================
// FILE PATHS — use absolute path based on project root
// ============================================================

const DATA_DIR = process.env.DATA_DIR || (existsSync("./data") ? "./data" : existsSync("/data") ? "/data" : "./data");

// Initialize the permanent case counter
initCounter(DATA_DIR);

const REPORTS_FILE = join(DATA_DIR, "reports.json");
const USERS_FILE = join(DATA_DIR, "users.json");
const AUDIT_LOG_FILE = join(DATA_DIR, "audit_log.json");
const NOTES_FILE = join(DATA_DIR, "report_notes.json");

console.log("[DATA] Using data directory:", DATA_DIR);

// ============================================================
// REPORT RECORD (with new fields)
// ============================================================

export interface ReportRecord {
  id: number;
  caseId: string;
  incidentType: string;
  lga: string;
  ward?: string;
  pollingUnit?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  locationAddress?: string;
  status: WorkflowStatus;
  syncStatus: string;
  reporterPhone?: string;
  reporterName?: string;
  confidence: ConfidenceLevel;
  anonymous: boolean;
  submittedAt: string;
  updatedAt: string;
  triagedAt?: string;
  verifiedAt?: string;
  escalatedAt?: string;
  closedAt?: string;
  triagedBy?: string;
  verifiedBy?: string;
  escalatedBy?: string;
  closedBy?: string;
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

export interface AuditLogRecord {
  id: number;
  reportId: number;
  caseId: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  operatorRole: string;
  operatorName: string;
  note?: string;
  timestamp: string;
}

export interface ReportNoteRecord {
  id: number;
  reportId: number;
  note: string;
  authorRole: string;
  authorName: string;
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

// ============================================================
// REPORTS STORE
// ============================================================

let reportsCache: ReportRecord[] | null = null;
let reportsNextId = 1;

function loadReports(): ReportRecord[] {
  if (reportsCache === null) {
    reportsCache = readJsonFile<ReportRecord[]>(REPORTS_FILE, []);
    for (const r of reportsCache) {
      if (r.id >= reportsNextId) reportsNextId = r.id + 1;
      // Migrate old reports to new workflow
      const oldStatus = r.status as any;
      if (oldStatus === "submitted" || oldStatus === "pending") {
        r.status = "received";
      } else if (oldStatus === "resolved") {
        r.status = "closed";
      }
      // "escalated" stays as "escalated"
      // Ensure caseId exists
      if (!r.caseId) {
        r.caseId = `OJT-LEGACY-${String(r.id).padStart(5, "0")}`;
      }
      // Ensure confidence exists
      if (!r.confidence) {
        r.confidence = "low";
      }
      // Ensure anonymous exists
      if (r.anonymous === undefined) {
        r.anonymous = !r.reporterPhone;
      }
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
    mediaCache = readJsonFile<ReportMediaRecord[]>("./data/report_media.json", []);
    for (const m of mediaCache) {
      if (m.id >= mediaNextId) mediaNextId = m.id + 1;
    }
  }
  return mediaCache;
}

function saveMedia() {
  if (mediaCache !== null) {
    writeJsonFile("./data/report_media.json", mediaCache);
  }
}

// Audit log store
let auditCache: AuditLogRecord[] | null = null;
let auditNextId = 1;

function loadAuditLog(): AuditLogRecord[] {
  if (auditCache === null) {
    auditCache = readJsonFile<AuditLogRecord[]>(AUDIT_LOG_FILE, []);
    for (const a of auditCache) {
      if (a.id >= auditNextId) auditNextId = a.id + 1;
    }
  }
  return auditCache;
}

function saveAuditLog() {
  if (auditCache !== null) {
    writeJsonFile(AUDIT_LOG_FILE, auditCache);
  }
}

// Notes store
let notesCache: ReportNoteRecord[] | null = null;
let notesNextId = 1;

function loadNotes(): ReportNoteRecord[] {
  if (notesCache === null) {
    notesCache = readJsonFile<ReportNoteRecord[]>(NOTES_FILE, []);
    for (const n of notesCache) {
      if (n.id >= notesNextId) notesNextId = n.id + 1;
    }
  }
  return notesCache;
}

function saveNotes() {
  if (notesCache !== null) {
    writeJsonFile(NOTES_FILE, notesCache);
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

// ============================================================
// AUDIT LOG HELPER
// ============================================================

export function logAudit(params: {
  reportId: number;
  caseId: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  operatorRole: string;
  operatorName: string;
  note?: string;
}) {
  const entry: AuditLogRecord = {
    id: auditNextId++,
    ...params,
    timestamp: new Date().toISOString(),
  };
  loadAuditLog().push(entry);
  saveAuditLog();
  return entry;
}

// ============================================================
// PUBLIC API
// ============================================================

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

  getByCaseId(caseId: string): (ReportRecord & { media: ReportMediaRecord[] }) | undefined {
    const report = loadReports().find((r) => r.caseId === caseId);
    if (!report) return undefined;
    const media = loadMedia().filter((m) => m.reportId === report.id);
    return { ...report, media };
  },

  getMediaByReportId(reportId: number): ReportMediaRecord[] {
    return loadMedia().filter((m) => m.reportId === reportId);
  },

  getAuditLog(reportId: number): AuditLogRecord[] {
    return loadAuditLog()
      .filter((a) => a.reportId === reportId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  getNotes(reportId: number): ReportNoteRecord[] {
    return loadNotes()
      .filter((n) => n.reportId === reportId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  addNote(params: {
    reportId: number;
    note: string;
    authorRole: string;
    authorName: string;
  }) {
    const entry: ReportNoteRecord = {
      id: notesNextId++,
      ...params,
      createdAt: new Date().toISOString(),
    };
    loadNotes().push(entry);
    saveNotes();
    return entry;
  },

  create(
    data: Omit<
      ReportRecord,
      "id" | "caseId" | "submittedAt" | "updatedAt" | "status" | "confidence" | "anonymous"
    > & {
      media?: Array<{
        mediaType: "photo" | "video" | "audio";
        url: string;
        thumbnail?: string;
        fileName?: string;
        fileSize?: number;
      }>;
    }
  ): { id: number; caseId: string } {
    const now = new Date().toISOString();
    const caseId = generateCaseId();

    // Calculate confidence
    const hasGps = !!data.latitude && !!data.longitude;
    const mediaCount = data.media?.length || 0;
    const isAnonymous = !data.reporterPhone;

    const confidence = calculateConfidence({
      reporterName: data.reporterName,
      reporterPhone: data.reporterPhone,
      mediaCount,
      hasGps,
      anonymous: isAnonymous,
    });

    const report: ReportRecord = {
      ...data,
      id: reportsNextId++,
      caseId,
      status: "received",
      confidence,
      anonymous: isAnonymous,
      submittedAt: now,
      updatedAt: now,
    };
    loadReports().push(report);
    saveReports();

    // Log creation
    logAudit({
      reportId: report.id,
      caseId,
      action: "report_created",
      newStatus: "received",
      operatorRole: "system",
      operatorName: "Auto-Intake",
      note: `Report received. Confidence: ${confidence}. Media: ${mediaCount}. GPS: ${hasGps ? "yes" : "no"}.`,
    });

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

    return { id: report.id, caseId };
  },

  updateStatus(params: {
    id: number;
    status: WorkflowStatus;
    operatorRole: string;
    operatorName: string;
    note?: string;
  }): { success: boolean; twoPersonRequired?: boolean } {
    const { id, status, operatorRole, operatorName, note } = params;
    const reports = loadReports();
    const report = reports.find((r) => r.id === id);
    if (!report) return { success: false };

    const oldStatus = report.status;

    // WORKFLOW VALIDATION: enforce valid transitions
    const validTransitions: Record<string, WorkflowStatus[]> = {
      received: ["triaged", "escalated"],
      triaged: ["under_verification", "escalated"],
      under_verification: ["verified", "unverified", "escalated"],
      verified: ["escalated", "closed"],
      unverified: ["closed"],
      escalated: ["closed"],
      closed: [],
    };

    const allowed = validTransitions[oldStatus] || [];
    if (!allowed.includes(status)) {
      return { success: false };
    }

    // TWO-PERSON RULE: verified/escalated/closed requires supervisor
    const supervisorOnly: WorkflowStatus[] = ["verified", "escalated", "closed"];
    if (supervisorOnly.includes(status) && operatorRole !== "supervisor") {
      return { success: false, twoPersonRequired: true };
    }

    report.status = status;
    report.updatedAt = new Date().toISOString();

    // Set role-specific timestamps
    if (status === "triaged") {
      report.triagedAt = report.updatedAt;
      report.triagedBy = operatorName;
    }
    if (status === "verified") {
      report.verifiedAt = report.updatedAt;
      report.verifiedBy = operatorName;
    }
    if (status === "escalated") {
      report.escalatedAt = report.updatedAt;
      report.escalatedBy = operatorName;
    }
    if (status === "closed") {
      report.closedAt = report.updatedAt;
      report.closedBy = operatorName;
    }

    saveReports();

    // Log to audit trail
    logAudit({
      reportId: id,
      caseId: report.caseId,
      action: "status_changed",
      oldStatus,
      newStatus: status,
      operatorRole,
      operatorName,
      note: note || undefined,
    });

    return { success: true };
  },

  getStats() {
    const all = loadReports();
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byLGA: Record<string, number> = {};
    const byConfidence: Record<string, number> = {};

    for (const r of all) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.incidentType] = (byType[r.incidentType] || 0) + 1;
      byLGA[r.lga] = (byLGA[r.lga] || 0) + 1;
      byConfidence[r.confidence] = (byConfidence[r.confidence] || 0) + 1;
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
      byConfidence: Object.entries(byConfidence).map(([level, count]) => ({
        level,
        count,
      })),
    };
  },

  filter(options: {
    status?: string;
    lga?: string;
    incidentType?: string;
    caseId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
    includeMedia?: boolean;
    redactReporter?: boolean;
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
    if (options.caseId) {
      const q = options.caseId.toLowerCase().trim();
      results = results.filter((r) =>
        r.caseId.toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
    }
    if (options.fromDate) {
      const from = new Date(options.fromDate).getTime();
      results = results.filter((r) => new Date(r.submittedAt).getTime() >= from);
    }
    if (options.toDate) {
      const to = new Date(options.toDate);
      to.setHours(23, 59, 59, 999);
      results = results.filter((r) => new Date(r.submittedAt).getTime() <= to.getTime());
    }

    results.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    const total = results.length;
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    results = results.slice(offset, offset + limit);

    // Include media for each report if requested
    if (options.includeMedia !== false) {
      const allMedia = loadMedia();
      results = results.map((r) => ({
        ...r,
        media: allMedia.filter((m) => m.reportId === r.id),
      })) as (ReportRecord & { media: ReportMediaRecord[] })[];
    }

    // REDACT reporter identity from public queries
    if (options.redactReporter) {
      results = results.map((r) => ({
        ...r,
        reporterPhone: undefined,
        reporterName: undefined,
        latitude: r.anonymous ? undefined : r.latitude,
        longitude: r.anonymous ? undefined : r.longitude,
        locationAccuracy: r.anonymous ? undefined : r.locationAccuracy,
        locationAddress: r.anonymous ? undefined : r.locationAddress,
      })) as (ReportRecord & { media: ReportMediaRecord[] })[];
    }

    return { reports: results, total };
  },

  // Backup: export all data as JSON
  backup() {
    return {
      reports: loadReports(),
      media: loadMedia(),
      auditLog: loadAuditLog(),
      notes: loadNotes(),
      exportedAt: new Date().toISOString(),
      version: "2.0",
    };
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
