import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { reports, reportMedia } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const reportRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        status: z.enum(["submitted", "pending", "resolved", "escalated"]).optional(),
        lga: z.string().optional(),
        incidentType: z.enum([
          "vote_buying",
          "ballot_snatching",
          "intimidation",
          "bvas_failure",
          "overvoting",
          "late_arrival",
          "other",
        ]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(reports.status, input.status));
      }
      if (input?.lga) {
        conditions.push(eq(reports.lga, input.lga));
      }
      if (input?.incidentType) {
        conditions.push(eq(reports.incidentType, input.incidentType));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(reports)
        .where(where)
        .orderBy(desc(reports.submittedAt))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(where);

      return {
        reports: results,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const reportResult = await db
        .select()
        .from(reports)
        .where(eq(reports.id, input.id));

      if (!reportResult[0]) return null;

      const mediaResult = await db
        .select()
        .from(reportMedia)
        .where(eq(reportMedia.reportId, input.id));

      return {
        ...reportResult[0],
        media: mediaResult,
      };
    }),

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
        reporterPhone: z.string().optional(),
        media: z
          .array(
            z.object({
              mediaType: z.enum(["photo", "video", "audio"]),
              url: z.string(),
              thumbnail: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const { media, latitude, longitude, locationAccuracy, ...reportData } = input;

      const result = await db.insert(reports).values({
        ...reportData,
        syncStatus: "synced",
        latitude: latitude != null ? String(latitude) : null,
        longitude: longitude != null ? String(longitude) : null,
        locationAccuracy: locationAccuracy != null ? String(locationAccuracy) : null,
      });

      const reportId = Number(result[0].insertId);

      // Insert associated media
      if (media && media.length > 0) {
        await db.insert(reportMedia).values(
          media.map((m) => ({
            reportId,
            mediaType: m.mediaType,
            url: m.url,
            thumbnail: m.thumbnail,
          }))
        );
      }

      return { id: reportId, success: true };
    }),

  updateStatus: adminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["submitted", "pending", "resolved", "escalated"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(reports)
        .set({ status: input.status })
        .where(eq(reports.id, input.id));

      return { success: true };
    }),

  getStats: publicQuery.query(async () => {
    const db = getDb();

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports);

    const statusBreakdown = await db
      .select({
        status: reports.status,
        count: sql<number>`count(*)`,
      })
      .from(reports)
      .groupBy(reports.status);

    const typeBreakdown = await db
      .select({
        incidentType: reports.incidentType,
        count: sql<number>`count(*)`,
      })
      .from(reports)
      .groupBy(reports.incidentType);

    const lgaBreakdown = await db
      .select({
        lga: reports.lga,
        count: sql<number>`count(*)`,
      })
      .from(reports)
      .groupBy(reports.lga)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return {
      total: totalResult[0]?.count || 0,
      byStatus: statusBreakdown,
      byType: typeBreakdown,
      byLGA: lgaBreakdown,
    };
  }),

  getRecent: publicQuery
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      return await db
        .select()
        .from(reports)
        .orderBy(desc(reports.submittedAt))
        .limit(input?.limit || 10);
    }),
});
