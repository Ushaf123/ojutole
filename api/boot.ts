import { env } from "./lib/env";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { HTTPBindings } from "./lib/http-bindings";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// Simple Node.js static file handler (replaces hono/serve-static)
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
      // Try index.html for SPA routes
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

function createApp() {
  try {
    console.log("[BOOT] Starting OJUTOLÉ...");
    console.log("[BOOT] Environment:", env.isProduction ? "production" : "development");

    const app = new Hono<{ Bindings: HTTPBindings }>();
    app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
    console.log("[BOOT] Hono app created");

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

    console.log("[BOOT] OJUTOLÉ ready!");
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
