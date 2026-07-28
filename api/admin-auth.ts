/**
 * Admin Authentication - Role-Based Access Control
 * Two-person rule: Verifier and Supervisor roles
 *
 * Tokens are DETERMINISTIC (based on role + password hash)
 * This means tokens SURVIVE server restarts - critical for Render deployment
 */

import { createHash } from "crypto";

// ============================================================
// ROLE PASSWORDS (set these for your team)
// ============================================================
const ROLE_PASSWORDS: Record<string, string> = {
  verifier: "725289",
  supervisor: "725290",
};

// Simple secret for token hashing (not for security, just for consistency)
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || "ojutole-admin-v1";

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
// DETERMINISTIC TOKEN (survives server restarts)
// ============================================================

function generateToken(role: string, password: string): string {
  // Deterministic: same role + password always produces same token
  return createHash("sha256")
    .update(`${TOKEN_SECRET}:${role.toLowerCase()}:${password}`)
    .digest("hex")
    .substring(0, 48);
}

function validateTokenFormat(token: string, role: string): boolean {
  // Check if token matches what we'd generate for this role
  const password = ROLE_PASSWORDS[role.toLowerCase()];
  if (!password) return false;
  const expected = generateToken(role, password);
  return token === expected;
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

  // Deterministic token - survives server restarts!
  const token = generateToken(role, password);

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

  return { token, user };
}

/**
 * Validate token and return user
 * Works even after server restart because tokens are deterministic
 */
export function validateAdminToken(token: string): AdminUser | null {
  // Try each role to see if token matches
  for (const role of ["supervisor", "verifier"]) {
    if (validateTokenFormat(token, role)) {
      const name = role === "supervisor" ? "Verification Supervisor" : "Desk Verifier";
      return {
        id: role === "supervisor" ? 1 : 2,
        unionId: `admin_${role}`,
        name,
        role: role as "verifier" | "supervisor" | "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSignInAt: new Date().toISOString(),
      };
    }
  }
  return null;
}

/**
 * Logout (client-side only with deterministic tokens)
 */
export function adminLogout(_token: string): void {
  // With deterministic tokens, logout is client-side only
  // The token remains valid but the client removes it from localStorage
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

/**
 * Change role password (for admin use)
 */
export function setRolePassword(role: string, password: string): void {
  ROLE_PASSWORDS[role.toLowerCase()] = password;
}

/**
 * Check if email backup is configured
 */
export function isEmailBackupConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}
