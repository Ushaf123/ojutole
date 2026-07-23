import { env } from "./lib/env";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { HTTPBindings } from "./lib/http-bindings";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, resolve, basename } from "path";
import { randomUUID } from "crypto";

// ============================================================
// File Upload & Storage
// ============================================================

const UPLOAD_DIR = "./data/uploads";

// Ensure upload directory exists
try {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log("[UPLOAD] Created upload directory:", UPLOAD_DIR);
  }
} catch (err: any) {
  console.error("[UPLOAD] Failed to create upload directory:", err.message);
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
