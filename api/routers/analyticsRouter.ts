/**
 * Analytics Router - Real-time election data aggregation
 * Provides aggregated statistics for dashboards and public displays
 * Read-only: does not modify any report data
 */

import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { reportStore } from "../json-store";

export const analyticsRouter = createTRPCRouter({
  // ============================================================
  // OVERVIEW STATS - Key numbers for the dashboard
  // ============================================================
  overview: publicQuery.query(() => {
    const reports = reportStore.getAll();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const total = reports.length;
    const received = reports.filter((r) => r.status === "received").length;
    const triaged = reports.filter((r) => r.status === "triaged").length;
    const underVerification = reports.filter((r) => r.status === "under_verification").length;
    const verified = reports.filter((r) => r.status === "verified").length;
    const unverified = reports.filter((r) => r.status === "unverified").length;
    const escalated = reports.filter((r) => r.status === "escalated").length;
    const closed = reports.filter((r) => r.status === "closed").length;

    // Today's reports
    const todayReports = reports.filter((r) => r.submittedAt.startsWith(today));

    // Confidence breakdown
    const highConfidence = reports.filter((r) => r.confidence === "high").length;
    const mediumConfidence = reports.filter((r) => r.confidence === "medium").length;
    const lowConfidence = reports.filter((r) => r.confidence === "low").length;

    // Pending = received + triaged + under_verification
    const pending = received + triaged + underVerification;

    // Average verification time (for verified reports)
    let avgVerificationMinutes = 0;
    const verifiedWithTime = reports.filter((r) => r.status === "verified" && r.verifiedAt && r.submittedAt);
    if (verifiedWithTime.length > 0) {
      const totalMinutes = verifiedWithTime.reduce((sum, r) => {
        const submitted = new Date(r.submittedAt).getTime();
        const verified = new Date(r.verifiedAt!).getTime();
        return sum + (verified - submitted) / (1000 * 60);
      }, 0);
      avgVerificationMinutes = Math.round(totalMinutes / verifiedWithTime.length);
    }

    return {
      total,
      today: todayReports.length,
      received,
      triaged,
      underVerification,
      verified,
      unverified,
      escalated,
      closed,
      pending,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      avgVerificationMinutes,
    };
  }),

  // ============================================================
  // BY LGA - Reports per Local Government Area
  // ============================================================
  byLGA: publicQuery.query(() => {
    const reports = reportStore.getAll();
    const lgaMap = new Map<string, { total: number; verified: number; escalated: number; pending: number }>();

    for (const r of reports) {
      const lga = r.lga || "Unknown";
      if (!lgaMap.has(lga)) {
        lgaMap.set(lga, { total: 0, verified: 0, escalated: 0, pending: 0 });
      }
      const entry = lgaMap.get(lga)!;
      entry.total++;
      if (r.status === "verified") entry.verified++;
      if (r.status === "escalated") entry.escalated++;
      if (["received", "triaged", "under_verification"].includes(r.status)) entry.pending++;
    }

    // Sort by total descending
    const sorted = Array.from(lgaMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, counts]) => ({ name, ...counts }));

    return { lgAs: sorted };
  }),

  // ============================================================
  // BY INCIDENT TYPE - Breakdown of report categories
  // ============================================================
  byIncidentType: publicQuery.query(() => {
    const reports = reportStore.getAll();
    const typeMap = new Map<string, number>();

    for (const r of reports) {
      const type = r.incidentType || "other";
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    }

    const sorted = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return { types: sorted };
  }),

  // ============================================================
  // BY HOUR - Hourly report volume timeline
  // ============================================================
  byHour: publicQuery.query(() => {
    const reports = reportStore.getAll();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Hour buckets for today (0-23)
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      count: 0,
      verified: 0,
      escalated: 0,
    }));

    for (const r of reports) {
      if (!r.submittedAt.startsWith(today)) continue;
      const h = new Date(r.submittedAt).getHours();
      if (h >= 0 && h < 24) {
        hourly[h].count++;
        if (r.status === "verified") hourly[h].verified++;
        if (r.status === "escalated") hourly[h].escalated++;
      }
    }

    return { hourly };
  }),

  // ============================================================
  // HOTSPOTS - Top wards/polling units with most reports
  // ============================================================
  hotspots: publicQuery.query(() => {
    const reports = reportStore.getAll();
    const locationMap = new Map<string, { lga: string; ward: string; pollingUnit: string; total: number; escalated: number }>();

    for (const r of reports) {
      const key = `${r.lga}||${r.ward || "Unknown"}||${r.pollingUnit || "Unknown"}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          lga: r.lga || "Unknown",
          ward: r.ward || "Unknown",
          pollingUnit: r.pollingUnit || "Unknown",
          total: 0,
          escalated: 0,
        });
      }
      const entry = locationMap.get(key)!;
      entry.total++;
      if (r.status === "escalated") entry.escalated++;
    }

    const sorted = Array.from(locationMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
      .map((loc) => ({
        location: `${loc.lga} — ${loc.ward}${loc.pollingUnit !== "Unknown" ? ` (${loc.pollingUnit})` : ""}`,
        total: loc.total,
        escalated: loc.escalated,
      }));

    return { hotspots: sorted };
  }),

  // ============================================================
  // EMERGING PATTERNS - Alerts for unusual activity
  // ============================================================
  patterns: publicQuery.query(() => {
    const reports = reportStore.getAll();
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const thirtyMinAgo = now - 30 * 60 * 1000;

    const alerts: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      message: string;
      count: number;
      location?: string;
    }> = [];

    // Pattern 1: Multiple reports from same LGA in last hour
    const recentByLGA = new Map<string, number>();
    for (const r of reports) {
      if (new Date(r.submittedAt).getTime() > oneHourAgo) {
        recentByLGA.set(r.lga, (recentByLGA.get(r.lga) || 0) + 1);
      }
    }
    for (const [lga, count] of recentByLGA.entries()) {
      if (count >= 3) {
        alerts.push({
          type: "location_spike",
          severity: count >= 5 ? "high" : "medium",
          message: `${count} reports from ${lga} in the last hour`,
          count,
          location: lga,
        });
      }
    }

    // Pattern 2: Multiple escalations in last 30 minutes
    const recentEscalations = reports.filter(
      (r) => r.status === "escalated" && r.escalatedAt && new Date(r.escalatedAt).getTime() > thirtyMinAgo
    );
    if (recentEscalations.length >= 2) {
      alerts.push({
        type: "escalation_spike",
        severity: "high",
        message: `${recentEscalations.length} reports escalated in the last 30 minutes`,
        count: recentEscalations.length,
      });
    }

    // Pattern 3: Sudden spike in incident type
    const recentByType = new Map<string, number>();
    for (const r of reports) {
      if (new Date(r.submittedAt).getTime() > oneHourAgo) {
        recentByType.set(r.incidentType, (recentByType.get(r.incidentType) || 0) + 1);
      }
    }
    for (const [type, count] of recentByType.entries()) {
      if (count >= 3) {
        alerts.push({
          type: "incident_spike",
          severity: "medium",
          message: `${count} ${type.replace(/_/g, " ")} reports in the last hour`,
          count,
        });
      }
    }

    // Pattern 4: High number of unverified reports (possible false reports)
    const recentUnverified = reports.filter(
      (r) => r.status === "unverified" && new Date(r.submittedAt).getTime() > oneHourAgo
    );
    if (recentUnverified.length >= 3) {
      alerts.push({
        type: "false_report_spike",
        severity: "low",
        message: `${recentUnverified.length} reports marked unverified in the last hour`,
        count: recentUnverified.length,
      });
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return { alerts };
  }),

  // ============================================================
  // CONFIDENCE TREND - Verification quality over time
  // ============================================================
  confidenceTrend: publicQuery.query(() => {
    const reports = reportStore.getAll();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      high: 0,
      medium: 0,
      low: 0,
    }));

    for (const r of reports) {
      if (!r.submittedAt.startsWith(today)) continue;
      const h = new Date(r.submittedAt).getHours();
      if (h >= 0 && h < 24) {
        if (r.confidence === "high") hourly[h].high++;
        if (r.confidence === "medium") hourly[h].medium++;
        if (r.confidence === "low") hourly[h].low++;
      }
    }

    return { hourly };
  }),
});
