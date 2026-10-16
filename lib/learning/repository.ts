import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurriculumImport } from "./schema";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function importCurriculum(supabase: SupabaseClient, userId: string, input: CurriculumImport, actor = "agent") {
  const slug = input.slug || slugify(input.title);
  const existing = input.externalSourceId ? await supabase.from("learning_paths").select("id,version").eq("user_id", userId).eq("external_source_id", input.externalSourceId).maybeSingle() : null;
  if (existing?.data && input.expectedVersion && existing.data.version !== input.expectedVersion) throw new Error("VERSION_CONFLICT");
  const pathValues = { user_id: userId, external_source_id: input.externalSourceId || null, title: input.title, slug, summary: input.summary || null, category: input.category || "general", desired_outcome: input.desiredOutcome || null, target_date: input.targetDate || null, weekly_minutes_target: input.weeklyMinutesTarget || null, status: "active", created_by: actor, version: existing?.data ? existing.data.version + 1 : 1 };
  const pathResult = existing?.data ? await supabase.from("learning_paths").update(pathValues).eq("id", existing.data.id).select().single() : await supabase.from("learning_paths").insert(pathValues).select().single();
  if (pathResult.error || !pathResult.data) throw new Error(pathResult.error?.message || "PATH_CREATE_FAILED");
  const path = pathResult.data;
  if (existing?.data) await supabase.from("learning_modules").delete().eq("path_id", path.id);
  for (const [modulePosition, module] of input.modules.entries()) {
    const moduleResult = await supabase.from("learning_modules").insert({ path_id: path.id, external_id: module.externalId || null, title: module.title, purpose: module.purpose || null, position: modulePosition, estimated_minutes: module.estimatedMinutes || null, success_criteria: module.successCriteria || null, prerequisites: module.prerequisites || [] }).select().single();
    if (moduleResult.error || !moduleResult.data) throw new Error(moduleResult.error?.message || "MODULE_CREATE_FAILED");
    if (module.items.length) {
      const itemResult = await supabase.from("learning_items").insert(module.items.map((item, position) => ({ module_id: moduleResult.data.id, external_id: item.externalId || null, title: item.title, instructions: item.instructions || null, kind: item.kind, position, estimated_minutes: item.estimatedMinutes || null, priority: item.priority || 2, evidence_required: item.evidenceRequired || false, due_date: item.dueDate || null })));
      if (itemResult.error) throw new Error(itemResult.error.message);
    }
  }
  return path;
}
