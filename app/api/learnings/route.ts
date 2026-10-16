import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";

export interface LearningTask {
  id: string;
  title: string;
  completed: boolean;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface LearningContent {
  roadmap?: string;
  tasks?: LearningTask[];
}

// GET /api/learnings
export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  let query = supabase
    .from("learnings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/learnings
export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, category, status, roadmap, initialTasks } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const tasks: LearningTask[] = Array.isArray(initialTasks)
      ? initialTasks.map((t: string | { title: string; notes?: string }, idx: number) => ({
          id: `task_${Date.now()}_${idx}`,
          title: typeof t === "string" ? t.trim() : t.title.trim(),
          completed: false,
          notes: typeof t === "object" ? t.notes : null,
          created_at: new Date().toISOString(),
        }))
      : [];

    const content: LearningContent = {
      roadmap: roadmap || "",
      tasks,
    };

    const { data, error } = await supabase
      .from("learnings")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || "general",
        status: status || "in_progress",
        content,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
