import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const pollingUnits = sqliteTable("polling_units", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  lga: text("lga").notNull(),
  ward: text("ward").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  registrationAreaCode: text("registration_area_code"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type PollingUnit = typeof pollingUnits.$inferSelect;
export type InsertPollingUnit = typeof pollingUnits.$inferInsert;

export const reports = sqliteTable("reports", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  incidentType: text("incident_type", {
    enum: ["vote_buying", "ballot_snatching", "intimidation", "bvas_failure", "overvoting", "late_arrival", "other"],
  }).notNull(),
  lga: text("lga").notNull(),
  ward: text("ward"),
  pollingUnit: text("polling_unit"),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  locationAccuracy: real("location_accuracy"),
  status: text("status", { enum: ["submitted", "pending", "resolved", "escalated"] }).default("submitted").notNull(),
  syncStatus: text("sync_status", { enum: ["synced", "offline_queue", "syncing"] }).default("synced").notNull(),
  reporterPhone: text("reporter_phone"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const reportMedia = sqliteTable("report_media", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  reportId: integer("report_id", { mode: "number" }).notNull(),
  mediaType: text("media_type", { enum: ["photo", "video", "audio"] }).notNull(),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type ReportMedia = typeof reportMedia.$inferSelect;
export type InsertReportMedia = typeof reportMedia.$inferInsert;

export const dailyStats = sqliteTable("daily_stats", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  totalReports: integer("total_reports").default(0).notNull(),
  resolvedReports: integer("resolved_reports").default(0).notNull(),
  activeUsers: integer("active_users").default(0).notNull(),
  pollingUnitsCovered: integer("polling_units_covered").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type DailyStat = typeof dailyStats.$inferSelect;
