import { NextRequest } from "next/server";
import { requireAgent } from "@/lib/learning/agent-auth";
import { apiError, apiResponse, getLearningSummaries } from "@/lib/learning/service";
export async function GET(request: NextRequest) { const agent = await requireAgent(request, "learning:read"); if (!agent) return apiError("UNAUTHORIZED", "A learning:read API key is required", 401); try { return apiResponse(await getLearningSummaries(agent.supabase, agent.userId)); } catch (error) { return apiError("DATABASE_ERROR", error instanceof Error ? error.message : "Unable to load paths", 500); } }
