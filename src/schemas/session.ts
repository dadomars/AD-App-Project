// =============================================
// File: src/schemas/session.ts (Zod schema lato client/server)
// =============================================
import { z } from "zod";

export const RunMetricsSchema = z.object({
  totalDistanceKm: z.number().optional(),
  totalTimeSec: z.number().optional(),
  avgPace: z.string().optional(),
  avgHr: z.number().optional(),
}).catchall(z.any());

export const SessionPayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["Corsa","WOD","Forza","Altro"]),
  runMetrics: RunMetricsSchema.nullable().optional(),
  blocks: z.any().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  source: z.enum(["manual","device","import"]).default("manual"),
  status: z.enum(["saved","draft"]).default("saved"),
  calories_equivalent: z.number().nullable().optional(),
});

export type SessionPayloadZ = z.infer<typeof SessionPayloadSchema>;

