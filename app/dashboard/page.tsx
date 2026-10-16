"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/AppNavbar";
import {
  BookOpen,
  DollarSign,
  Utensils,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Zap,
  Play,
  Check,
  Clock,
} from "lucide-react";
import {
  parseMealInput,
  parseLearningInput,
  parseFinanceInput,
} from "@/lib/parsers";
import { parseDishQuery } from "@/lib/nutrition/parser";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    roadmapsCount: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    dietCaloriesToday: 0,
    activeFocusTask: null as {
      trackId: string;
      trackTitle: string;
      taskId: string;
      title: string;
      notes: string | null;
      next_action: string | null;
      deadline: string | null;
      minutes_spent: number;
    } | null,
    recentLearnings: [] as {
      id: string;
      title: string;
      category: string;
      status: string;
      content: any;
      created_at: string;
    }[],
  });

  // Omnibar State
  const [activeTab, setActiveTab] = useState<"task" | "meal" | "finance">("task");
  const [omnibarInput, setOmnibarInput] = useState("");
  const [isOmnibarSubmitting, setIsOmnibarSubmitting] = useState(false);
  const [recentLogSuccess, setRecentLogSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const loadDashboardData = useCallback(
    async (userId: string) => {
      const [learningsRes, financesRes, dietRes] = await Promise.all([
        supabase
          .from("learnings")
          .select("id, title, category, status, content, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("finances")
          .select("type, amount")
          .eq("user_id", userId),
        supabase
          .from("diet")
          .select("calories, date")
          .eq("user_id", userId),
      ]);

      const learningsData = learningsRes.data || [];
      const financesData = financesRes.data || [];
      const dietData = dietRes.data || [];

      let totalTasks = 0;
      let completedTasks = 0;
      learningsData.forEach((l) => {
        const content = l.content || {};
        if (Array.isArray(content.modules)) {
          content.modules.forEach((m: any) => {
            if (Array.isArray(m.tasks)) {
              totalTasks += m.tasks.length;
              completedTasks += m.tasks.filter((t: any) => t.completed).length;
            }
          });
        } else if (Array.isArray(content.tasks)) {
          totalTasks += content.tasks.length;
          completedTasks += content.tasks.filter((t: any) => t.completed).length;
        }
      });

      let income = 0;
      let expense = 0;
      financesData.forEach((f) => {
        if (f.type === "income") income += Number(f.amount || 0);
        if (f.type === "expense") expense += Number(f.amount || 0);
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      let todayCal = 0;
      dietData.forEach((d) => {
        if (d.date && d.date.startsWith(todayStr)) {
          todayCal += Number(d.calories || 0);
        }
      });

      // Detect current active focus task across learning tracks
      let activeFocusItem: {
        trackId: string;
        trackTitle: string;
        taskId: string;
        title: string;
        notes: string | null;
        next_action: string | null;
        deadline: string | null;
        minutes_spent: number;
      } | null = null;

      for (const l of learningsData) {
        const content = l.content || {};
        const activeTaskId = content.active_task_id;
        const modules = Array.isArray(content.modules) ? content.modules : [];
        const allTasks = modules.flatMap((m: any) => (Array.isArray(m.tasks) ? m.tasks : []));

        if (activeTaskId) {
          const match = allTasks.find((t: any) => t.id === activeTaskId && !t.completed);
          if (match) {
            activeFocusItem = {
              trackId: l.id,
              trackTitle: l.title,
              taskId: match.id,
              title: match.title,
              notes: match.notes || null,
              next_action: match.next_action || null,
              deadline: match.deadline || null,
              minutes_spent: match.minutes_spent || 0,
            };
            break;
          }
        }

        const inProgress = allTasks.find(
          (t: any) => (t.status === "in_progress" || (!t.completed && t.status !== "todo")) && !t.completed
        );
        if (inProgress && !activeFocusItem) {
          activeFocusItem = {
            trackId: l.id,
            trackTitle: l.title,
            taskId: inProgress.id,
            title: inProgress.title,
            notes: inProgress.notes || null,
            next_action: inProgress.next_action || null,
            deadline: inProgress.deadline || null,
            minutes_spent: inProgress.minutes_spent || 0,
          };
          break;
        }

        // If no explicit active or in_progress, fallback to first pending task
        const firstPending = allTasks.find((t: any) => !t.completed);
        if (firstPending && !activeFocusItem) {
          activeFocusItem = {
            trackId: l.id,
            trackTitle: l.title,
            taskId: firstPending.id,
            title: firstPending.title,
            notes: firstPending.notes || null,
            next_action: firstPending.next_action || null,
            deadline: firstPending.deadline || null,
            minutes_spent: firstPending.minutes_spent || 0,
          };
          break;
        }
      }

      setStats({
        roadmapsCount: learningsData.length,
        totalTasksCount: totalTasks,
        completedTasksCount: completedTasks,
        incomeTotal: income,
        expenseTotal: expense,
        dietCaloriesToday: todayCal,
        activeFocusTask: activeFocusItem,
        recentLearnings: learningsData.slice(0, 4),
      });
      setIsLoading(false);
    },
    [supabase]
  );

  const handleCompleteActiveFocus = async () => {
    if (!stats.activeFocusTask || !user) return;
    const { trackId, taskId } = stats.activeFocusTask;

    const { data: trackData } = await supabase
      .from("learnings")
      .select("content")
      .eq("id", trackId)
      .single();

    if (!trackData) return;
    const content = trackData.content || {};
    const modules = content.modules || [];

    const updatedModules = modules.map((m: any) => ({
      ...m,
      tasks: (m.tasks || []).map((t: any) => {
        if (t.id === taskId) {
          return {
            ...t,
            completed: true,
            status: "completed",
            completed_at: new Date().toISOString(),
          };
        }
        return t;
      }),
    }));

    await supabase
      .from("learnings")
      .update({
        content: {
          ...content,
          active_task_id: null,
          modules: updatedModules,
        },
      })
      .eq("id", trackId);

    // Reload stats
    await loadDashboardData(user.id);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchSessionAndStats() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) router.push("/login");
        return;
      }

      if (isMounted) {
        setUser(session.user);
        loadDashboardData(session.user.id);
      }
    }

    fetchSessionAndStats();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase, loadDashboardData]);

  const omnibarPreview = useMemo(() => {
    if (!omnibarInput.trim()) return null;
    if (activeTab === "task") return parseLearningInput(omnibarInput);
    if (activeTab === "meal") return parseMealInput(omnibarInput);
    if (activeTab === "finance") return parseFinanceInput(omnibarInput);
    return null;
  }, [omnibarInput, activeTab]);

  const handleOmnibarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !omnibarInput.trim()) return;

    setIsOmnibarSubmitting(true);
    let successMsg = "";

    try {
      if (activeTab === "task") {
        const parsed = parseLearningInput(omnibarInput);
        const { error } = await supabase.from("learnings").insert({
          user_id: user.id,
          title: parsed.title,
          category: parsed.category,
          status: parsed.status,
          content: {
            modules: [
              {
                id: `mod_${Date.now()}`,
                title: "Phase 1: Foundations",
                tasks: [
                  {
                    id: `task_${Date.now()}`,
                    title: parsed.title,
                    type: "theory",
                    completed: false,
                    created_at: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        });
        if (!error) successMsg = `Captured: ${parsed.title}`;
      } else if (activeTab === "meal") {
        const dishText = omnibarInput.trim();
        const parsed = parseDishQuery(dishText);
        const newId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `diet_${Date.now()}`;
        const nowIso = new Date().toISOString();

        const { error } = await supabase.from("diet").insert({
          id: newId,
          user_id: user.id,
          meal_type: parsed.mealType || "lunch",
          food_name: dishText,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          notes: JSON.stringify({ isCalculating: true, dishRaw: dishText }),
          date: nowIso,
        });

        if (!error) {
          successMsg = `Logged: ${dishText} (calculating USDA nutrients...)`;
          // Background calculation
          fetch("/api/nutrition/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entryId: newId,
              dish: dishText,
              mealType: parsed.mealType || "lunch",
            }),
          }).then(() => {
            loadDashboardData(user.id);
          });
        }
      } else if (activeTab === "finance") {
        const parsed = parseFinanceInput(omnibarInput);
        if (parsed.amount > 0) {
          const { error } = await supabase.from("finances").insert({
            user_id: user.id,
            type: parsed.type,
            amount: parsed.amount,
            currency: "USD",
            category: parsed.category,
            description: parsed.description,
            date: new Date().toISOString(),
          });
          if (!error) successMsg = `Recorded ${parsed.type}: $${parsed.amount}`;
        }
      }

      if (successMsg) {
        setOmnibarInput("");
        setRecentLogSuccess(successMsg);
        setTimeout(() => setRecentLogSuccess(null), 3500);
        await loadDashboardData(user.id);
      }
    } finally {
      setIsOmnibarSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black font-sans">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-2 w-2 rounded-full bg-black dark:bg-white animate-pulse" />
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const netSavings = stats.incomeTotal - stats.expenseTotal;
  const username = user.email?.split("@")[0] || "user";

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <AppNavbar userEmail={user.email} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Clean Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
              Welcome back, {username}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              Personal Command Center
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/learnings"
              className="px-3.5 py-2 rounded-lg bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-xs font-semibold shadow-xs"
            >
              Open Learning Studio
            </Link>
          </div>
        </div>

        {/* CURRENT ACTIVE FOCUS TASK CARD */}
        {stats.activeFocusTask && (
          <div className="rounded-2xl border border-zinc-800 bg-black p-6 sm:p-7 space-y-4 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold truncate">
                CURRENT FOCUS · {stats.activeFocusTask.trackTitle}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>In progress</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                {stats.activeFocusTask.title}
              </h3>
              {stats.activeFocusTask.notes && (
                <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
                  {stats.activeFocusTask.notes}
                </p>
              )}
            </div>

            {stats.activeFocusTask.next_action && (
              <div className="space-y-1 pt-1 border-t border-zinc-900/90">
                <span className="text-2xs uppercase tracking-wider text-zinc-500 font-bold block">
                  NEXT ACTION
                </span>
                <p className="text-sm font-semibold text-zinc-200">
                  {stats.activeFocusTask.next_action}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-0.5">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span>
                {stats.activeFocusTask.deadline ? `Due: ${stats.activeFocusTask.deadline}` : "No deadline"} ·{" "}
                {stats.activeFocusTask.minutes_spent || 0} minutes logged
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/dashboard/learnings"
                className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                <span>Continue task</span>
              </Link>

              <button
                type="button"
                onClick={handleCompleteActiveFocus}
                className="px-6 py-2.5 rounded-full border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900 text-white text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Mark complete</span>
              </button>
            </div>
          </div>
        )}

        {/* Instant Quick-Capture Bar */}
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <Zap className="h-4 w-4 text-black dark:text-white" />
              <span>Instant Quick-Capture</span>
            </div>

            {/* Mode switch tabs */}
            <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 bg-white dark:bg-zinc-900 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("task")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === "task"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-500 hover:text-black dark:hover:text-white"
                }`}
              >
                Curriculum Task
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("meal")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === "meal"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-500 hover:text-black dark:hover:text-white"
                }`}
              >
                Meal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("finance")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === "finance"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-500 hover:text-black dark:hover:text-white"
                }`}
              >
                Finance
              </button>
            </div>
          </div>

          <form onSubmit={handleOmnibarSubmit} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={omnibarInput}
                onChange={(e) => setOmnibarInput(e.target.value)}
                placeholder={
                  activeTab === "task"
                    ? "Type action item: Master Next.js 16 proxy.ts patterns, Read Raft consensus paper..."
                    : activeTab === "meal"
                    ? "Type meal: Chicken bowl 600 cal 45g pro, 2 eggs toast, Coffee..."
                    : "Type expense: $45 Dinner, -18 Uber ride, +3500 Freelance client..."
                }
                className="w-full px-3.5 py-2.5 pr-24 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-sm focus:outline-none focus:border-black dark:focus:border-white placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={isOmnibarSubmitting || !omnibarInput.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
              >
                {isOmnibarSubmitting ? "..." : "Capture"}
              </button>
            </div>

            {/* Dynamic preview */}
            {omnibarPreview && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-500">
                <span>Detected:</span>
                {"title" in omnibarPreview && "category" in omnibarPreview && (
                  <>
                    <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-medium">
                      Category: {omnibarPreview.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-medium">
                      Status: {omnibarPreview.status}
                    </span>
                  </>
                )}
                {"meal_type" in omnibarPreview && (
                  <>
                    <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 capitalize font-medium">
                      {omnibarPreview.meal_type}
                    </span>
                    {omnibarPreview.calories > 0 && (
                      <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-semibold">
                        {omnibarPreview.calories} kcal
                      </span>
                    )}
                  </>
                )}
                {"amount" in omnibarPreview && (
                  <>
                    <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-semibold">
                      {omnibarPreview.type.toUpperCase()}: ${omnibarPreview.amount.toFixed(2)}
                    </span>
                    <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 capitalize font-medium">
                      {omnibarPreview.category}
                    </span>
                  </>
                )}
              </div>
            )}

            {recentLogSuccess && (
              <div className="p-2.5 rounded-lg border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{recentLogSuccess}</span>
              </div>
            )}
          </form>
        </div>

        {/* 3 Pillars Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Learnings & Roadmaps */}
          <Link
            href="/dashboard/learnings"
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-black dark:hover:border-white transition-colors group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                  Learning Studio
                </span>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Active Curriculum</h2>
              <p className="text-zinc-500 text-xs mt-1">
                Phased roadmaps, reading library, and concept notes.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-baseline justify-between text-xs">
              <span className="text-zinc-400 font-medium">Milestones Completed</span>
              <span className="text-lg font-bold">
                {stats.completedTasksCount} of {stats.totalTasksCount}
              </span>
            </div>
          </Link>

          {/* Finance */}
          <Link
            href="/dashboard/finance"
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-black dark:hover:border-white transition-colors group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                  Financial Ledger
                </span>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Cash Flow</h2>
              <p className="text-zinc-500 text-xs mt-1">
                Income streams, overhead, and net reserves.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-baseline justify-between text-xs">
              <span className="text-zinc-400 font-medium">Net Balance</span>
              <span className="text-lg font-bold">
                ${netSavings.toLocaleString()}
              </span>
            </div>
          </Link>

          {/* Diet */}
          <Link
            href="/dashboard/diet"
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-black dark:hover:border-white transition-colors group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                  Fuel & Nutrition
                </span>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Diet Tracking</h2>
              <p className="text-zinc-500 text-xs mt-1">
                Caloric intake, macros, and nutrition log.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-baseline justify-between text-xs">
              <span className="text-zinc-400 font-medium">Calories Today</span>
              <span className="text-lg font-bold">
                {stats.dietCaloriesToday} <span className="text-xs font-normal text-zinc-400">kcal</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Recent Roadmaps Snapshot */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Active Learning Tracks
            </h3>
            <Link
              href="/dashboard/learnings"
              className="text-xs text-zinc-500 hover:text-black dark:hover:text-white transition-colors font-medium"
            >
              View studio →
            </Link>
          </div>

          {stats.recentLearnings.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No learning tracks initialized yet. Use quick-capture above or go to Learning Studio to create one.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {stats.recentLearnings.map((item) => {
                const content = item.content || {};
                let tasksCount = 0;
                let doneCount = 0;
                if (Array.isArray(content.modules)) {
                  content.modules.forEach((m: any) => {
                    if (Array.isArray(m.tasks)) {
                      tasksCount += m.tasks.length;
                      doneCount += m.tasks.filter((t: any) => t.completed).length;
                    }
                  });
                } else if (Array.isArray(content.tasks)) {
                  tasksCount = content.tasks.length;
                  doneCount = content.tasks.filter((t: any) => t.completed).length;
                }

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xs capitalize px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
                          {item.category}
                        </span>
                        <Link
                          href="/dashboard/learnings"
                          className="text-sm font-semibold hover:underline"
                        >
                          {item.title}
                        </Link>
                      </div>
                      <span className="text-xs text-zinc-400 block">
                        {tasksCount} milestones ({doneCount} completed)
                      </span>
                    </div>

                    <span className="text-xs capitalize px-2.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}