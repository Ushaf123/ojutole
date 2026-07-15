import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  int,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Polling Units across Osun State's 30 LGAs
export const pollingUnits = mysqlTable("polling_units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  ward: varchar("ward", { length: 100 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  registrationAreaCode: varchar("registration_area_code", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PollingUnit = typeof pollingUnits.$inferSelect;
export type InsertPollingUnit = typeof pollingUnits.$inferInsert;

// Election Irregularity Reports
export const reports = mysqlTable("reports", {
  id: serial("id").primaryKey(),
  incidentType: mysqlEnum("incident_type", [
    "vote_buying",
    "ballot_snatching",
    "intimidation",
    "bvas_failure",
    "overvoting",
    "late_arrival",
    "other",
  ]).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  ward: varchar("ward", { length: 100 }),
  pollingUnit: varchar("polling_unit", { length: 255 }),
  description: text("description"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  locationAccuracy: decimal("location_accuracy", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["submitted", "pending", "resolved", "escalated"])
    .default("submitted")
    .notNull(),
  syncStatus: mysqlEnum("sync_status", ["synced", "offline_queue", "syncing"])
    .default("synced")
    .notNull(),
  reporterPhone: varchar("reporter_phone", { length: 20 }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// Media attached to reports
export const reportMedia = mysqlTable("report_media", {
  id: serial("id").primaryKey(),
  reportId: bigint("report_id", { mode: "number", unsigned: true }).notNull(),
  mediaType: mysqlEnum("media_type", ["photo", "video", "audio"]).notNull(),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReportMedia = typeof reportMedia.$inferSelect;
export type InsertReportMedia = typeof reportMedia.$inferInsert;

// Analytics / Stats tracking
export const dailyStats = mysqlTable("daily_stats", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  totalReports: int("total_reports").default(0).notNull(),
  resolvedReports: int("resolved_reports").default(0).notNull(),
  activeUsers: int("active_users").default(0).notNull(),
  pollingUnitsCovered: int("polling_units_covered").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DailyStat = typeof dailyStats.$inferSelect;
