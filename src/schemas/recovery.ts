import { z } from "zod";

export const SemaforoSchema = z.enum(["green","yellow","red"]);

export const RecoveryPayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: z.number().int().min(1).max(5),
  mood: z.number().int().min(1).max(5),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  bodyweight: z.number().min(20).max(200).nullable().optional(),
  hrRest: z.number().min(30).max(120).nullable().optional(),
  domsZones: z.array(z.string()).min(1, "Indica almeno una zona DOMS"),
  semaforo: SemaforoSchema,                  // obbligatorio
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(["pending","chosen"]).default("pending"),
});

export type RecoveryPayload = z.infer<typeof RecoveryPayloadSchema>;
