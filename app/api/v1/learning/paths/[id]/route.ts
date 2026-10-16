import { NextRequest } from "next/server";
import { requireAgent } from "@/lib/learning/agent-auth";
import { apiError, apiResponse, getLearningSummaries } from "@/lib/learning/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) { const agent = await requireAgent(request, "learning:read"); if (!agent) return apiError("UNAUTHORIZED", "A learning:read API key is required", 401); const { id } = await params; const summary = (await getLearningSummaries(agent.supabase, agent.userId)).find((path) => path.id === id); if (!summary) return apiError("NOT_FOUND", "Path not found", 404); const { data: curriculum } = await agent.supabase.from("learning_modules").select("*,learning_items(*),learning_resources(*)").eq("path_id", id).order("position"); return apiResponse({ ...summary, modules: curriculum || [] }); }
