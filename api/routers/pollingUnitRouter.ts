import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import {
  getLGAs,
  getWardsByLGA,
  getUnitsByLGAAndWard,
  getNearbyPollingUnits,
  getPollingUnitById,
  searchPollingUnits,
  getPollingUnits,
} from "../json-store";

export const pollingUnitRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          lga: z.string().optional(),
          ward: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(500).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(({ input }) => {
      let units = getPollingUnits();

      if (input?.search) {
        units = searchPollingUnits(input.search);
      } else {
        if (input?.lga) {
          units = units.filter((u) => u.lga === input.lga);
        }
        if (input?.ward) {
          units = units.filter((u) => u.ward === input.ward);
        }
      }

      const total = units.length;
      const limit = input?.limit || 100;
      const offset = input?.offset || 0;
      units = units.slice(offset, offset + limit);

      return { units, total };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      return getPollingUnitById(input.id);
    }),

  getLGAs: publicQuery.query(() => {
    return getLGAs();
  }),

  getWardsByLGA: publicQuery
    .input(z.object({ lga: z.string() }))
    .query(({ input }) => {
      return getWardsByLGA(input.lga);
    }),

  getUnitsByLGAAndWard: publicQuery
    .input(
      z.object({
        lga: z.string(),
        ward: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return getUnitsByLGAAndWard(input.lga, input.ward);
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
    .query(({ input }) => {
      return getNearbyPollingUnits(input.lat, input.lng, input.radiusKm, input.limit);
    }),
});
