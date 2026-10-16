import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { LearningTask, DetailedLearningContent as LearningContent } from "@/lib/types/learning";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/learnings/[id]/tasks - Add task
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, notes } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    // Fetch existing content
    const { data: learning, error: fetchErr } = await supabase
      .from("learnings")
      .select("content")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !learning) {
      return NextResponse.json({ error: "Learning not found" }, { status: 404 });
    }

    const currentContent: LearningContent = (learning.content as LearningContent) || {};
    const currentTasks: LearningTask[] = Array.isArray(currentContent.tasks)
      ? currentContent.tasks
      : [];

    const newTask: LearningTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      completed: false,
      notes: notes?.trim() || null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    const updatedTasks = [...currentTasks, newTask];
    const updatedContent = {
      ...currentContent,
      tasks: updatedTasks,
    };

    const { data: updatedLearning, error: updateErr } = await supabase
      .from("learnings")
      .update({ content: updatedContent })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ task: newTask, learning: updatedLearning }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}

// PATCH /api/learnings/[id]/tasks - Update or toggle task
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { taskId, completed, title, notes } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const { data: learning, error: fetchErr } = await supabase
      .from("learnings")
      .select("content")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !learning) {
      return NextResponse.json({ error: "Learning not found" }, { status: 404 });
    }

    const currentContent: LearningContent = (learning.content as LearningContent) || {};
    const currentTasks: LearningTask[] = Array.isArray(currentContent.tasks)
      ? currentContent.tasks
      : [];

    let targetFound = false;
    const updatedTasks = currentTasks.map((t) => {
      if (t.id === taskId) {
        targetFound = true;
        const isNowCompleted = completed !== undefined ? completed : t.completed;
        return {
          ...t,
          completed: isNowCompleted,
          title: title !== undefined ? title : t.title,
          notes: notes !== undefined ? notes : t.notes,
          completed_at:
            isNowCompleted && !t.completed
              ? new Date().toISOString()
              : !isNowCompleted
              ? null
              : t.completed_at,
        };
      }
      return t;
    });

    if (!targetFound) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedContent = {
      ...currentContent,
      tasks: updatedTasks,
    };

    const { data: updatedLearning, error: updateErr } = await supabase
      .from("learnings")
      .update({ content: updatedContent })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ learning: updatedLearning });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}

// DELETE /api/learnings/[id]/tasks - Delete task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    let taskId = searchParams.get("taskId");

    if (!taskId) {
      try {
        const body = await request.json();
        taskId = body.taskId;
      } catch {
        // no body
      }
    }

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const { data: learning, error: fetchErr } = await supabase
      .from("learnings")
      .select("content")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !learning) {
      return NextResponse.json({ error: "Learning not found" }, { status: 404 });
    }

    const currentContent: LearningContent = (learning.content as LearningContent) || {};
    const currentTasks: LearningTask[] = Array.isArray(currentContent.tasks)
      ? currentContent.tasks
      : [];

    const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
    const updatedContent = {
      ...currentContent,
      tasks: updatedTasks,
    };

    const { data: updatedLearning, error: updateErr } = await supabase
      .from("learnings")
      .update({ content: updatedContent })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, learning: updatedLearning });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
