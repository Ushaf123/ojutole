import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "./json-store";
import { authenticateRequest } from "./kimi/auth";
import { validateAdminToken } from "./admin-auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try admin auth first (x-admin-token header)
  try {
    const adminToken = opts.req.headers.get("x-admin-token");
    if (adminToken) {
      const adminUser = validateAdminToken(adminToken);
      if (adminUser) {
        // Map AdminUser to User shape for compatibility
        ctx.user = {
          id: adminUser.id,
          unionId: adminUser.unionId,
          name: adminUser.name,
          email: adminUser.email,
          avatar: undefined,
          phone: undefined,
          role: adminUser.role,
          createdAt: adminUser.createdAt,
          updatedAt: adminUser.updatedAt,
          lastSignInAt: adminUser.lastSignInAt,
        };
        return ctx;
      }
    }
  } catch {
    // Admin auth failed, try OAuth
  }

  // Fall back to OAuth
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional
  }

  return ctx;
}
