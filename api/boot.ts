import { env } from "./lib/env";
import { Hono } from "hono";
import { serveStatic } from "hono/serve-static";
import { HTTPException } from "hono/http-exception";
import { HTTPBindings } from "./lib/http-bindings";
import { bodyLimit } from "hono/body-limit";
import { appRouter } from "./router";
import { Paths } from "@contracts/constants";
import Database from "better-sqlite3";
import { seedDatabase } from "@db/seed";

function bootstrap() {
  const dbPath = env.databaseUrl?.startsWith("file:")
    ? env.databaseUrl.replace("file:", "")
    : env.databaseUrl || "./local.db";

  const client = new Database(dbPath);

  client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unionId TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt INTEGER,
      updatedAt INTEGER,
      lastSignInAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS polling_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lga TEXT NOT NULL,
      ward TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      registration_area_code TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_type TEXT NOT NULL,
      lga TEXT NOT NULL,
      ward TEXT,
      polling_unit TEXT,
      description TEXT,
      latitude REAL,
      longitude REAL,
      location_accuracy REAL,
      status TEXT NOT NULL DEFAULT 'submitted',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      reporter_phone TEXT,
      submitted_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS report_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnail TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total_reports INTEGER NOT NULL DEFAULT 0,
      resolved_reports INTEGER NOT NULL DEFAULT 0,
      active_users INTEGER NOT NULL DEFAULT 0,
      polling_units_covered INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );
  `);

  client.close();

  seedDatabase(dbPath);

  const app = new Hono<{ Bindings: HttpBindings }>();

  app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

  const apiRoutes = appRouter;

  app.route("/api", apiRoutes);

  app.use("/*", serveStatic({ root: "./public" }));

  app.get("/", (ctx) => {
    return ctx.redirect("/index.html");
  });

  app.onError((err, ctx) => {
    if (err instanceof HTTPException) {
      return ctx.json(
        {
          error: err.message,
          code: err.status,
        },
        err.status,
      );
    }

    return ctx.json(
      {
        error: "Internal server error",
        code: 500,
      },
      500,
    );
  });

  return app;
}

export default bootstrap();
