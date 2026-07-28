import { env } from "./lib/env";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { HTTPBindings } from "./lib/http-bindings";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from "fs";
import { join, resolve, basename } from "path";
import { randomUUID } from "crypto";
import { reportStore } from "./json-store";
import { sendBackupEmail, isEmailBackupConfigured } from "./email-backup";

// ============================================================
// File Upload & Storage
// ============================================================

// Use consistent data directory (same as json-store)
const DATA_DIR = process.env.DATA_DIR || "./data";
const UPLOAD_DIR = join(DATA_DIR, "uploads");
const BACKUP_DIR = join(DATA_DIR, "backups");

// Ensure directories exist
try {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  console.log("[DATA] Directories ensured:", { data: DATA_DIR, uploads: UPLOAD_DIR, backups: BACKUP_DIR });
} catch (err: any) {
  console.error("[DATA] Failed to create directories:", err.message);
}

// Clean up old files (older than 30 days) - runs on startup
function cleanupOldUploads() {
  try {
    const files = readdirSync(UPLOAD_DIR);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let cleaned = 0;
    for (const file of files) {
      const filepath = join(UPLOAD_DIR, file);
      const stats = statSync(filepath);
      if (stats.mtimeMs < thirtyDaysAgo) {
        // Skip - keep all files for now during election period
      }
    }
    if (cleaned > 0) console.log("[UPLOAD] Cleaned up", cleaned, "old files");
  } catch {
    // Ignore cleanup errors
  }
}
cleanupOldUploads();

// ============================================================
// SCHEDULED BACKUP SYSTEM
// Creates automatic JSON backups every 24 hours
// Keeps last 30 backups for permanent archive
// ============================================================

// BACKUP_DIR already defined at top of file

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function createBackup() {
  try {
    ensureBackupDir();
    const data = reportStore.backup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `ojutole-backup-${timestamp}.json`;
    const filepath = join(BACKUP_DIR, filename);
    writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log("[BACKUP] Created:", filename);

    // Also copy to latest
    const latestPath = join(BACKUP_DIR, "ojutole-latest.json");
    writeFileSync(latestPath, JSON.stringify(data, null, 2));

    // Keep only last 30 backups
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("ojutole-backup-"))
      .map((f) => ({ name: f, path: join(BACKUP_DIR, f), time: statSync(join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 30) {
      for (const f of files.slice(30)) {
        try {
          // Use rmSync to delete old backups
          const { rmSync } = require("node:fs");
          rmSync(f.path);
        } catch {
          // ignore
        }
      }
    }
  } catch (err: any) {
    console.error("[BACKUP] Failed:", err.message);
  }
}

// Create backup on startup + send first email
ensureBackupDir();
createBackup();
// Send startup email backup (async - don't block)
sendBackupEmail().then((sent) => {
  if (sent) console.log("[EMAIL BACKUP] Startup email sent");
});

// Schedule backup + email every 6 hours (6 * 60 * 60 * 1000 ms)
const BACKUP_INTERVAL = 6 * 60 * 60 * 1000;
setInterval(() => {
  createBackup();
  sendBackupEmail().then((sent) => {
    if (sent) console.log("[EMAIL BACKUP] Scheduled email sent");
  });
}, BACKUP_INTERVAL);
console.log("[BACKUP] Disk backup every 6 hours. Keeps last 30 backups.");
console.log("[EMAIL BACKUP] Email delivery:", isEmailBackupConfigured() ? "CONFIGURED" : "NOT CONFIGURED - Set SMTP_USER and SMTP_PASS env vars");

// ============================================================
// Static File Handler (for frontend + uploads)
// ============================================================

function serveStaticFiles(root: string) {
  return async (c: any) => {
    const url = new URL(c.req.url);
    let filepath = join(root, url.pathname === "/" ? "/index.html" : url.pathname);

    // Security: prevent directory traversal
    const fullPath = resolve(filepath);
    const rootPath = resolve(root);
    if (!fullPath.startsWith(rootPath)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (!existsSync(filepath)) {
      filepath = join(root, "index.html");
      if (!existsSync(filepath)) {
        return c.json({ error: "Not found" }, 404);
      }
    }

    try {
      const content = readFileSync(filepath);
      const ext = filepath.split(".").pop()?.toLowerCase() || "";
      const mimeTypes: Record<string, string> = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        webm: "video/webm",
        mp4: "video/mp4",
        webp: "image/webp",
        woff: "font/woff",
        woff2: "font/woff2",
        ttf: "font/ttf",
        otf: "font/otf",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      return new Response(content, {
        headers: { "Content-Type": contentType },
      });
    } catch {
      return c.json({ error: "Failed to read file" }, 500);
    }
  };
}

// Serve uploaded files from /uploads/:filename
function serveUploads(c: any) {
  const filename = c.req.param("filename");
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return c.json({ error: "Invalid filename" }, 400);
  }

  const filepath = join(UPLOAD_DIR, basename(filename));
  if (!existsSync(filepath)) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const content = readFileSync(filepath);
    const ext = filepath.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      webm: "video/webm",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    return new Response(content, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return c.json({ error: "Failed to read file" }, 500);
  }
}

// ============================================================
// App Factory
// ============================================================

function createApp() {
  try {
    console.log("[BOOT] Starting OJÚTÓLÉ...");
    console.log("[BOOT] Environment:", env.isProduction ? "production" : "development");
    console.log("[BOOT] CWD:", process.cwd());
    console.log("[BOOT] DATA_DIR:", DATA_DIR);
    console.log("[BOOT] Upload dir:", UPLOAD_DIR);
    console.log("[BOOT] Backup dir:", BACKUP_DIR);

    const app = new Hono<{ Bindings: HTTPBindings }>();
    app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
    console.log("[BOOT] Hono app created");

    // File upload endpoint - POST /api/upload
    app.post("/api/upload", async (c) => {
      try {
        const body = await c.req.parseBody({ all: false });
        const file = body.file;

        if (!file || !(file instanceof File)) {
          return c.json({ error: "No file provided" }, 400);
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
          return c.json({ error: "File too large (max 20MB)" }, 400);
        }

        // Validate file type
        const allowedTypes = [
          "image/", "video/", "audio/",
          "application/octet-stream",
        ];
        const isAllowed = allowedTypes.some((t) => file.type.startsWith(t));
        if (!isAllowed) {
          return c.json({ error: "Invalid file type: " + file.type }, 400);
        }

        // Generate unique filename
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const safeExt = ["jpg", "jpeg", "png", "gif", "webp", "webm", "mp4", "mp3", "wav", "ogg"].includes(ext) ? ext : "bin";
        const uuid = randomUUID();
        const filename = `${uuid}.${safeExt}`;
        const filepath = join(UPLOAD_DIR, filename);

        // Save file
        const buffer = Buffer.from(await file.arrayBuffer());
        writeFileSync(filepath, buffer);

        // Return public URL
        const publicUrl = `/uploads/${filename}`;
        console.log("[UPLOAD] Saved", filename, `(${(file.size / 1024).toFixed(1)}KB)`);

        return c.json({
          success: true,
          url: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });
      } catch (err: any) {
        console.error("[UPLOAD] Error:", err.message);
        return c.json({ error: "Upload failed: " + err.message }, 500);
      }
    });
    console.log("[BOOT] File upload endpoint registered at POST /api/upload");

    // Serve uploaded files - GET /uploads/:filename
    app.get("/uploads/:filename", serveUploads);
    console.log("[BOOT] File serving registered at GET /uploads/:filename");

    // Mount tRPC API using fetch adapter
    app.all("/api/trpc/*", async (c) => {
      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: c.req.raw,
        router: appRouter,
        createContext,
      });
      return response;
    });
    console.log("[BOOT] tRPC API routes registered at /api/trpc");

    // OAuth callback handler
    app.get("/api/oauth/callback", async (c) => {
      const { createOAuthCallbackHandler } = await import("./kimi/auth");
      const handler = createOAuthCallbackHandler();
      return handler(c);
    });
    console.log("[BOOT] OAuth callback registered");

    // Backup download endpoint - GET /api/backup/download/:filename
    app.get("/api/backup/download/:filename", (c) => {
      const filename = c.req.param("filename");
      if (!filename || filename.includes("..") || filename.includes("/")) {
        return c.json({ error: "Invalid filename" }, 400);
      }
      const filepath = join(BACKUP_DIR, basename(filename));
      if (!existsSync(filepath)) {
        return c.json({ error: "Backup not found" }, 404);
      }
      try {
        const content = readFileSync(filepath, "utf-8");
        return new Response(content, {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } catch {
        return c.json({ error: "Failed to read backup" }, 500);
      }
    });

    // Backup list endpoint - GET /api/backup/list
    app.get("/api/backup/list", (c) => {
      try {
        ensureBackupDir();
        const files = readdirSync(BACKUP_DIR)
          .filter((f) => f.startsWith("ojutole-backup-"))
          .map((f) => {
            const s = statSync(join(BACKUP_DIR, f));
            return { name: f, size: s.size, created: s.mtime.toISOString() };
          })
          .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        return c.json({ backups: files, count: files.length });
      } catch {
        return c.json({ backups: [], count: 0 });
      }
    });
    console.log("[BOOT] Backup endpoints registered");

    // Static files - use custom Node.js handler
    const staticRoot = env.isProduction ? "./dist/public" : "./public";
    app.use("/*", serveStaticFiles(staticRoot));
    console.log("[BOOT] Static files registered from", staticRoot);

    app.onError((err, c) => {
      console.error("[ERROR]", err);
      if (err instanceof HTTPException) {
        return c.json({ error: err.message, code: err.status }, err.status);
      }
      return c.json({ error: "Internal server error", code: 500 }, 500);
    });

    console.log("[BOOT] OJÚTÓLÉ ready!");
    return app;

  } catch (err: any) {
    console.error("[BOOT FAILED]", err.message);
    console.error("[STACK]", err.stack);

    const app = new Hono<{ Bindings: HTTPBindings }>();
    app.all("/*", (c) => c.json({ error: "Server startup failed: " + err.message, status: "down" }, 500));
    return app;
  }
}

const app = createApp();

// Start the server
const PORT = Number(process.env.PORT || 3000);

if (typeof Bun !== "undefined") {
  Bun.serve({ fetch: app.fetch, port: PORT });
  console.log(`[BOOT] Server running on http://localhost:${PORT}`);
} else {
  import("@hono/node-server").then(({ serve: nodeServe }) => {
    nodeServe({ fetch: app.fetch, port: PORT });
    console.log(`[BOOT] Server running on http://localhost:${PORT}`);
  }).catch((err) => {
    console.error("[BOOT] Failed to start Node server:", err.message);
    process.exit(1);
  });
}

export default app;
