import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { pollingUnits } from "@db/schema";
import { eq, like, and, sql } from "drizzle-orm";

export const pollingUnitRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        lga: z.string().optional(),
        ward: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.lga) {
        conditions.push(eq(pollingUnits.lga, input.lga));
      }
      if (input?.ward) {
        conditions.push(eq(pollingUnits.ward, input.ward));
      }
      if (input?.search) {
        conditions.push(like(pollingUnits.name, `%${input.search}%`));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(pollingUnits)
        .where(where)
        .limit(input?.limit || 100)
        .offset(input?.offset || 0);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pollingUnits)
        .where(where);

      return {
        units: results,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(pollingUnits)
        .where(eq(pollingUnits.id, input.id));
      return result[0] || null;
    }),

  getLGAs: publicQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select({ lga: pollingUnits.lga })
      .from(pollingUnits)
      .groupBy(pollingUnits.lga)
      .orderBy(pollingUnits.lga);

    return results.map((r) => r.lga);
  }),

  getWardsByLGA: publicQuery
    .input(z.object({ lga: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db
        .select({ ward: pollingUnits.ward })
        .from(pollingUnits)
        .where(eq(pollingUnits.lga, input.lga))
        .groupBy(pollingUnits.ward)
        .orderBy(pollingUnits.ward);

      return results.map((r) => r.ward);
    }),

  getUnitsByLGAAndWard: publicQuery
    .input(
      z.object({
        lga: z.string(),
        ward: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [eq(pollingUnits.lga, input.lga)];
      if (input.ward) {
        conditions.push(eq(pollingUnits.ward, input.ward));
      }

      return await db
        .select()
        .from(pollingUnits)
        .where(and(...conditions))
        .orderBy(pollingUnits.ward, pollingUnits.name);
    }),

  nearby: publicQuery
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().default(5),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      // Simple bounding box query for nearby units
      const latDelta = input.radiusKm / 111;
      const lngDelta = input.radiusKm / (111 * Math.cos((input.lat * Math.PI) / 180));

      const results = await db
        .select()
        .from(pollingUnits)
        .where(
          and(
            sql`${pollingUnits.latitude} BETWEEN ${(input.lat - latDelta).toFixed(7)} AND ${(input.lat + latDelta).toFixed(7)}`,
            sql`${pollingUnits.longitude} BETWEEN ${(input.lng - lngDelta).toFixed(7)} AND ${(input.lng + lngDelta).toFixed(7)}`
          )
        )
        .limit(input.limit);

      return results;
    }),
});
