/**
 * Admin Authentication - Role-Based Access Control
 * Two-person rule: Verifier and Supervisor roles
 *
 * Role passwords are set server-side.
 * When an admin logs in with a role + password, we issue a JWT-like token
 * stored in the session and returned to the client.
 */

import { randomBytes, createHash } from "crypto";

// ============================================================
// ROLE PASSWORDS (set these for your team)
// ============================================================
// VERIFIER: can triage, review, add notes, move to under_verification
// SUPERVISOR: can verify, escalate, close (two-person rule)

const ROLE_PASSWORDS: Record<string, string> = {
  verifier: "725289",   // Current admin password becomes verifier
  supervisor: "725290", // Different password for supervisor
};

// In-memory session store (clears on restart - acceptable for single-server)
const sessions = new Map<string, { role: string; name: string; createdAt: number }>();

// Clean old sessions every hour
setInterval(() => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > oneDay) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

// ============================================================
// ADMIN USER TYPE
// ============================================================
export interface AdminUser {
  id: number;
  unionId: string;
  name: string;
  email?: string;
  role: "verifier" | "supervisor" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string;
  phone?: string;
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================

/**
 * Login with role + password
 */
export function adminLogin(role: string, password: string): { token: string; user: AdminUser } | null {
  const expectedPassword = ROLE_PASSWORDS[role.toLowerCase()];
  if (!expectedPassword || expectedPassword !== password) {
    return null;
  }

  // Create session token
  const token = randomBytes(32).toString("hex");

  const now = new Date().toISOString();
  const user: AdminUser = {
    id: role === "supervisor" ? 1 : 2,
    unionId: `admin_${role}`,
    name: role === "supervisor" ? "Verification Supervisor" : "Desk Verifier",
    role: role.toLowerCase() as "verifier" | "supervisor" | "admin",
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
  };

  sessions.set(token, { role: user.role, name: user.name, createdAt: Date.now() });

  return { token, user };
}

/**
 * Validate token and return user
 */
export function validateAdminToken(token: string): AdminUser | null {
  const session = sessions.get(token);
  if (!session) return null;

  return {
    id: session.role === "supervisor" ? 1 : 2,
    unionId: `admin_${session.role}`,
    name: session.name,
    role: session.role as "verifier" | "supervisor" | "admin",
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignInAt: new Date().toISOString(),
  };
}

/**
 * Logout (invalidate token)
 */
export function adminLogout(token: string): void {
  sessions.delete(token);
}

/**
 * Get all active sessions count
 */
export function getActiveSessionCount(): number {
  return sessions.size;
}

/**
 * Change role password (for admin use)
 */
export function setRolePassword(role: string, password: string): void {
  ROLE_PASSWORDS[role.toLowerCase()] = password;
}

/**
 * Get available roles
 */
export function getAvailableRoles(): { role: string; label: string }[] {
  return [
    { role: "verifier", label: "Desk Verifier" },
    { role: "supervisor", label: "Verification Supervisor" },
  ];
}
