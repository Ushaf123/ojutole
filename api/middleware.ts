import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// ============================================================
// ROLE-BASED ACCESS CONTROL
// Two-person rule: Verifier + Supervisor
// ============================================================

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

function requireAnyRole(roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Insufficient privileges for this operation.",
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

// Standard authed query
export const authedQuery = t.procedure.use(requireAuth);

// Admin-only (supervisor) — for sensitive operations
export const adminQuery = authedQuery.use(requireRole("admin"));

// Supervisor role — can verify, escalate, close
export const supervisorQuery = authedQuery.use(requireAnyRole(["admin", "supervisor"]));

// Verifier role — can triage and review, but NOT verify/escalate/close alone
export const verifierQuery = authedQuery.use(requireAnyRole(["admin", "supervisor", "verifier"]));
