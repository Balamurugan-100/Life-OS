import { z } from "zod";

const url = z.string().url().optional().nullable();
export const apiScopes = z.enum(["learning:read", "learning:write", "learning:progress"]);
export const curriculumItemSchema = z.object({
  externalId: z.string().min(1).max(120).optional(), title: z.string().min(1).max(240),
  instructions: z.string().max(12000).optional(), kind: z.enum(["lesson", "reading", "exercise", "project", "review"]).default("lesson"),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(), priority: z.number().int().min(1).max(3).optional(),
  evidenceRequired: z.boolean().optional(), dueDate: z.string().date().optional(),
});
export const curriculumModuleSchema = z.object({
  externalId: z.string().min(1).max(120).optional(), title: z.string().min(1).max(240), purpose: z.string().max(4000).optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(), successCriteria: z.string().max(4000).optional(),
  prerequisites: z.array(z.string().min(1)).max(20).optional(), items: z.array(curriculumItemSchema).max(100).default([]),
});
export const curriculumImportSchema = z.object({
  externalSourceId: z.string().min(1).max(120).optional(), title: z.string().min(1).max(240), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
  summary: z.string().max(4000).optional(), category: z.string().min(1).max(100).optional(), desiredOutcome: z.string().max(4000).optional(),
  targetDate: z.string().date().optional(), weeklyMinutesTarget: z.number().int().min(1).max(10080).optional(), expectedVersion: z.number().int().positive().optional(),
  modules: z.array(curriculumModuleSchema).max(50).default([]),
});
export type CurriculumImport = z.infer<typeof curriculumImportSchema>;
export const apiKeyCreateSchema = z.object({ name: z.string().min(1).max(100), scopes: z.array(apiScopes).min(1), expiresAt: z.string().datetime().optional() });
export const itemUpdateSchema = z.object({ state: z.enum(["not_started", "in_progress", "completed", "skipped"]) });
export const sessionCreateSchema = z.object({ pathId: z.string().uuid(), itemId: z.string().uuid().optional(), durationMinutes: z.number().int().min(1).max(1440), note: z.string().max(4000).optional(), occurredAt: z.string().datetime().optional() });
export const evidenceCreateSchema = z.object({ pathId: z.string().uuid(), itemId: z.string().uuid().optional(), kind: z.enum(["note", "link", "submission", "reflection"]).default("note"), title: z.string().max(240).optional(), body: z.string().max(12000).optional(), url }).refine((value) => value.body || value.url, "Evidence needs a note or URL");
