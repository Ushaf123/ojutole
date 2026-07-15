import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { reportStore } from "../json-store";

export const reportRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          status: z
            .enum(["submitted", "pending", "resolved", "escalated"])
            .optional(),
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
      });
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      return reportStore.getById(input.id);
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

      const id = reportStore.create({
        ...reportData,
        status: "submitted",
        syncStatus: "synced",
        media,
      });

      return { id, success: true };
    }),

  updateStatus: adminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["submitted", "pending", "resolved", "escalated"]),
      })
    )
    .mutation(({ input }) => {
      reportStore.updateStatus(input.id, input.status);
      return { success: true };
    }),

  getStats: publicQuery.query(() => {
    return reportStore.getStats();
  }),

  getRecent: publicQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(({ input }) => {
      return reportStore.getAll().slice(0, input?.limit || 10);
    }),
});
