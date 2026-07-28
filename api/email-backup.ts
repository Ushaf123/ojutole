/**
 * Email Backup System for OJÚTÓLÉ
 * Sends automated JSON backups via email every 6 hours
 * 
 * SETUP REQUIRED:
 * 1. Enable 2-Factor Authentication on your Gmail
 * 2. Go to Google Account → Security → App passwords
 * 3. Generate app password for "Mail"
 * 4. Set Render environment variables:
 *    SMTP_USER=oloboushafng@gmail.com
 *    SMTP_PASS=your-app-password
 *    BACKUP_EMAIL_TO=oloboushafng@gmail.com
 */

import { createTransport } from "nodemailer";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BACKUP_DIR = "./data/backups";
const LATEST_BACKUP = join(BACKUP_DIR, "ojutole-latest.json");

// SMTP config from environment variables
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const BACKUP_EMAIL_TO = process.env.BACKUP_EMAIL_TO || SMTP_USER || "oloboushafng@gmail.com";

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log("[EMAIL BACKUP] Skipped: SMTP_USER or SMTP_PASS not set");
    return null;
  }
  return createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendBackupEmail(): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[EMAIL BACKUP] Not configured. Set SMTP_USER and SMTP_PASS env vars.");
    return false;
  }

  if (!existsSync(LATEST_BACKUP)) {
    console.log("[EMAIL BACKUP] No backup file found yet");
    return false;
  }

  try {
    const backupContent = readFileSync(LATEST_BACKUP, "utf-8");
    const data = JSON.parse(backupContent);
    const reportCount = data.reports?.length || 0;
    const now = new Date().toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const result = await transporter.sendMail({
      from: `"OJÚTÓLÉ Backup" <${SMTP_USER}>`,
      to: BACKUP_EMAIL_TO,
      subject: `OJÚTÓLÉ Backup - ${now} - ${reportCount} reports`,
      text: `
OJÚTÓLÉ Automatic Backup
========================

Date: ${now}
Total Reports: ${reportCount}
Backup Version: ${data.version || "1.0"}

This backup includes:
- All incident reports
- Media references
- Audit trail (verification history)
- Internal notes

Store this email safely. The attached JSON file contains
your complete OJÚTÓLÉ database for transparency & archive.

---
OJÚTÓLÉ | USHAF Nigeria
Citizen Election-Reporting & Verification Platform
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563EB;">OJÚTÓLÉ Automatic Backup</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Date:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${now}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Total Reports:</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #2563EB; font-weight: bold;">${reportCount}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Backup Version:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.version || "1.0"}</td></tr>
  </table>
  <p style="color: #555;">This backup includes all incident reports, media references, audit trail, and internal notes.</p>
  <p style="color: #555;"><strong>Store this email safely.</strong> The attached JSON file contains your complete OJÚTÓLÉ database for transparency & archive purposes.</p>
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #999;">
    OJÚTÓLÉ | USHAF Nigeria<br>
    Citizen Election-Reporting & Verification Platform
  </p>
</div>
      `.trim(),
      attachments: [
        {
          filename: `ojutole-backup-${new Date().toISOString().split("T")[0]}.json`,
          content: backupContent,
          contentType: "application/json",
        },
      ],
    });

    console.log("[EMAIL BACKUP] Sent to", BACKUP_EMAIL_TO, "Message ID:", result.messageId);
    return true;
  } catch (err: any) {
    console.error("[EMAIL BACKUP] Failed:", err.message);
    return false;
  }
}

export function isEmailBackupConfigured(): boolean {
  return !!(SMTP_USER && SMTP_PASS);
}
