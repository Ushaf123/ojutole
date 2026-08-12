import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { adminLogin, adminLogout, validateAdminToken, getAvailableRoles, getAdminActivityLog } from "../admin-auth";
import { supervisorQuery } from "../middleware";

export const adminAuthRouter = createRouter({
  // Login with role + password
  login: publicQuery
    .input(
      z.object({
        role: z.enum(["verifier", "supervisor"]),
        password: z.string().min(1),
      })
    )
    .mutation(({ input, ctx }) => {
      const result = adminLogin(input.role, input.password, ctx.req);
      if (!result) {
        return { success: false, error: "Invalid role or password" };
      }
      return {
        success: true,
        token: result.token,
        user: {
          name: result.user.name,
          role: result.user.role,
        },
      };
    }),

  // Validate token (check if still logged in)
  me: publicQuery
    .input(z.object({ token: z.string() }).optional())
    .query(({ input }) => {
      if (!input?.token) return { authenticated: false };
      const user = validateAdminToken(input.token);
      if (!user) return { authenticated: false };
      return {
        authenticated: true,
        user: {
          name: user.name,
          role: user.role,
        },
      };
    }),

  // Get available roles
  roles: publicQuery.query(() => {
    return getAvailableRoles();
  }),

  // Logout
  logout: publicQuery
    .input(z.object({ token: z.string() }))
    .mutation(({ input, ctx }) => {
      adminLogout(input.token, ctx.req);
      return { success: true };
    }),

  // Get admin activity log (supervisors only)
  activityLog: supervisorQuery
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }).optional())
    .query(({ input }) => {
      const log = getAdminActivityLog(input?.limit || 100);
      return log;
    }),
});
