import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { analyticsRouter } from "./routers/analyticsRouter";
import { pollingUnitRouter } from "./routers/pollingUnitRouter";
import { reportRouter } from "./routers/reportRouter";
import { adminAuthRouter } from "./routers/adminAuthRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  pollingUnit: pollingUnitRouter,
  report: reportRouter,
  adminAuth: adminAuthRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
