import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningNextItem, LearningPathSummary } from "./types";

export async function getLearningSummaries(supabase: SupabaseClient, userId: string): Promise<LearningPathSummary[]> {
  const { data: paths, error } = await supabase.from("learning_paths").select("id,title,summary,status,weekly_minutes_target,version,learning_modules(id,title,position,learning_items(id,title,instructions,estimated_minutes,state,position))").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (paths || []).map((path: any) => {
    const items = (path.learning_modules || []).sort((a: any,b: any) => a.position-b.position).flatMap((module: any) => (module.learning_items || []).sort((a: any,b: any) => a.position-b.position).map((item: any) => ({ ...item, moduleTitle: module.title })));
    const completedItems = items.filter((item: any) => item.state === "completed").length;
    const candidate = items.find((item: any) => item.state === "in_progress") || items.find((item: any) => item.state === "not_started");
    const nextItem: LearningNextItem | null = candidate ? { ...candidate, pathId: path.id, pathTitle: path.title } : null;
    return { id: path.id, title: path.title, summary: path.summary, status: path.status, weekly_minutes_target: path.weekly_minutes_target, version: path.version, completedItems, totalItems: items.length, progressPercent: items.length ? Math.round(completedItems / items.length * 100) : 0, nextItem };
  });
}

export const apiResponse = (data: unknown, status = 200) => Response.json({ api_version: "v1", data }, { status });
export const apiError = (code: string, message: string, status = 400) => Response.json({ api_version: "v1", error: { code, message } }, { status });
