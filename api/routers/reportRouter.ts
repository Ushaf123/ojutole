import { z } from "zod";
import { createRouter, publicQuery, verifierQuery, supervisorQuery } from "../middleware";
import { reportStore, WORKFLOW_STATUSES, type WorkflowStatus } from "../json-store";

export const reportRouter = createRouter({
  // Public: list reports (reporter identity REDACTED)
  list: publicQuery
    .input(
      z
        .object({
          status: z.string().optional(),
          lga: z.string().optional(),
          incidentType: z
            .enum([
              "vote_buying",
              "ballot_snatching",
              "intimidation",
              "bvas_failure",
              "overvoting",
              "late_arrival",
              "other",
            ])
            .optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(({ input }) => {
      return reportStore.filter({
        status: input?.status,
        lga: input?.lga,
        incidentType: input?.incidentType,
        limit: input?.limit,
        offset: input?.offset,
        includeMedia: true,
        redactReporter: true, // PUBLIC: hide reporter identity
      });
    }),

  // Public: get single report by ID (REDACTED)
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      const report = reportStore.getById(input.id);
      if (!report) return null;
      // Redact reporter identity for public
      return {
        ...report,
        reporterPhone: undefined,
        reporterName: undefined,
        latitude: report.anonymous ? undefined : report.latitude,
        longitude: report.anonymous ? undefined : report.longitude,
        locationAccuracy: report.anonymous ? undefined : report.locationAccuracy,
        locationAddress: report.anonymous ? undefined : report.locationAddress,
      };
    }),

  // Public: get report by case ID (for reporters to check status)
  getByCaseId: publicQuery
    .input(z.object({ caseId: z.string() }))
    .query(({ input }) => {
      const report = reportStore.getByCaseId(input.caseId);
      if (!report) return null;
      // Public view: redacted
      return {
        id: report.id,
        caseId: report.caseId,
        incidentType: report.incidentType,
        lga: report.lga,
        ward: report.ward,
        pollingUnit: report.pollingUnit,
        description: report.description,
        status: report.status,
        confidence: report.confidence,
        submittedAt: report.submittedAt,
        updatedAt: report.updatedAt,
        triagedAt: report.triagedAt,
        verifiedAt: report.verifiedAt,
        escalatedAt: report.escalatedAt,
        closedAt: report.closedAt,
        media: report.media,
      };
    }),

  // Public: create report
  create: publicQuery
    .input(
      z.object({
        incidentType: z.enum([
          "vote_buying",
          "ballot_snatching",
          "intimidation",
          "bvas_failure",
          "overvoting",
          "late_arrival",
          "other",
        ]),
        lga: z.string(),
        ward: z.string().optional(),
        pollingUnit: z.string().optional(),
        description: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        locationAccuracy: z.number().optional(),
        locationAddress: z.string().optional(),
        reporterPhone: z.string().optional(),
        reporterName: z.string().optional(),
        media: z
          .array(
            z.object({
              mediaType: z.enum(["photo", "video", "audio"]),
              url: z.string(),
              thumbnail: z.string().optional(),
              fileName: z.string().optional(),
              fileSize: z.number().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(({ input }) => {
      const { media, ...reportData } = input;

      const result = reportStore.create({
        ...reportData,
        syncStatus: "synced",
        media,
      });

      return { id: result.id, caseId: result.caseId, success: true };
    }),

  // ============================================================
  // VERIFIER ROUTES (triage, review, add notes)
  // ============================================================

  // Verifier: list ALL reports (with reporter info)
  listAdmin: verifierQuery
    .input(
      z
        .object({
          status: z.string().optional(),
          lga: z.string().optional(),
          incidentType: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(({ input }) => {
      return reportStore.filter({
        status: input?.status,
        lga: input?.lga,
        incidentType: input?.incidentType,
        limit: input?.limit,
        offset: input?.offset,
        includeMedia: true,
        redactReporter: false, // ADMIN: show full info
      });
    }),

  // Verifier: get full report with audit trail
  getByIdAdmin: verifierQuery
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      const report = reportStore.getById(input.id);
      if (!report) return null;
      const auditLog = reportStore.getAuditLog(input.id);
      const notes = reportStore.getNotes(input.id);
      return { ...report, auditLog, notes };
    }),

  // Verifier: add internal note
  addNote: verifierQuery
    .input(
      z.object({
        reportId: z.number(),
        note: z.string().min(1).max(1000),
      })
    )
    .mutation(({ input, ctx }) => {
      const user = ctx.user!;
      const entry = reportStore.addNote({
        reportId: input.reportId,
        note: input.note,
        authorRole: user.role,
        authorName: user.name || user.role,
      });
      return { success: true, note: entry };
    }),

  // Verifier: triage (move received → triaged)
  triage: verifierQuery
    .input(
      z.object({
        id: z.number(),
        note: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const user = ctx.user!;
      const result = reportStore.updateStatus({
        id: input.id,
        status: "triaged",
        operatorRole: user.role,
        operatorName: user.name || `${user.role}`,
        note: input.note,
      });
      return result;
    }),

  // Verifier: move to under verification
  startVerification: verifierQuery
    .input(
      z.object({
        id: z.number(),
        note: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const user = ctx.user!;
      return reportStore.updateStatus({
        id: input.id,
        status: "under_verification",
        operatorRole: user.role,
        operatorName: user.name || `${user.role}`,
        note: input.note,
      });
    }),

  // ============================================================
  // SUPERVISOR ROUTES (verify, escalate, close)
  // Two-person rule: these require supervisor role
  // ============================================================

  // Supervisor: mark verified
  verify: supervisorQuery
    .input(
      z.object({
        id: z.number(),
        note: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const user = ctx.user!;
      return reportStore.updateStatus({
        id: input.id,
        status: "verified",
        operatorRole: user.role,
        operatorName: user.name || `${user.role}`,
        note: input.note,
      });
    }),

  // Supervisor: mark unverified
  markUnverified: supervisorQuery
    .input(
      z.object({
        id: z.number(),
        note: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const user = ctx.user!;
      return reportStore.updateStatus({
        id: input.id,
        status: "unverified",
        operatorRole: user.role,
        operatorName: user.name || `${user.role}`,
        note: input.note,
      });
    }),

  // Supervisor: escalate
  escalate: supervisorQuery
    .input(
      z.object({
        id: z.number(),
        note: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const user = ctx.user!;
      return reportStore.updateStatus({
        id: input.id,
        status: "escalated",
        operatorRole: user.role,
        operatorName: user.name || `${user.role}`,
        note: input.note,
      });
    }),

  // Supervisor: close
  close: supervisorQuery
    .input(
      z.object({
        id: z.number(),
        note: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const user = ctx.user!;
      return reportStore.updateStatus({
        id: input.id,
        status: "closed",
        operatorRole: user.role,
        operatorName: user.name || `${user.role}`,
        note: input.note,
      });
    }),

  // Public: stats (used on home page)
  getStats: publicQuery.query(() => {
    return reportStore.getStats();
  }),

  // Public: recent reports (REDACTED)
  getRecent: publicQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(({ input }) => {
      const reports = reportStore
        .getAll()
        .slice(0, input?.limit || 10)
        .map((r) => ({
          id: r.id,
          caseId: r.caseId,
          incidentType: r.incidentType,
          lga: r.lga,
          ward: r.ward,
          status: r.status,
          confidence: r.confidence,
          submittedAt: r.submittedAt,
          mediaCount: 0,
        }));
      return reports;
    }),

  // Verifier: get audit log for a report
  getAuditLog: verifierQuery
    .input(z.object({ reportId: z.number() }))
    .query(({ input }) => {
      return reportStore.getAuditLog(input.reportId);
    }),
});
