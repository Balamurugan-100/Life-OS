"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/components/AppNavbar";
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { parseFinanceInput } from "@/lib/parsers";

interface FinanceItem {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
  category: string;
  date: string;
  created_at: string;
}

const FINANCE_PRESETS = [
  { label: "Coffee (-$4.50)", text: "-4.50 Coffee" },
  { label: "Lunch (-$15)", text: "-15 Lunch" },
  { label: "Ride (-$22)", text: "-22 Uber ride" },
  { label: "Groceries (-$65)", text: "-65 Groceries" },
  { label: "Client (+$500)", text: "+500 Freelance client payment" },
];

export default function FinancePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [finances, setFinances] = useState<FinanceItem[]>([]);

  // Instant quick-log state
  const [quickInput, setQuickInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual fallback form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState<"income" | "expense">("expense");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCategory, setManualCategory] = useState("general");
  const [manualDescription, setManualDescription] = useState("");
  const [manualDate, setManualDate] = useState("");

  const supabase = createClient();

  const parsedPreview = useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseFinanceInput(quickInput);
  }, [quickInput]);

  const loadFinances = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("finances")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (!error && data) {
        setFinances(data as FinanceItem[]);
      }
    },
    [supabase]
  );

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) router.push("/login");
        return;
      }

      if (isMounted) {
        setUser(session.user);
        setIsLoading(false);
        loadFinances(session.user.id);
      }
    }

    checkAuth();

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
  }, [router, loadFinances, supabase]);

  // Instant Quick Log
  const handleQuickLog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !quickInput.trim()) return;

    const parsed = parseFinanceInput(quickInput);
    if (!parsed.amount || parsed.amount <= 0) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("finances").insert({
      user_id: user.id,
      type: parsed.type,
      amount: parsed.amount,
      currency: "USD",
      category: parsed.category,
      description: parsed.description,
      date: new Date().toISOString(),
    });

    if (!error) {
      setQuickInput("");
      loadFinances(user.id);
    }
    setIsSubmitting(false);
  };

  const handlePresetClick = (text: string) => {
    setQuickInput(text);
  };

  // Manual Add Form
  const handleManualAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualAmount || isNaN(Number(manualAmount))) return;

    setIsSubmitting(true);
    const targetDate = manualDate || new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("finances").insert({
      user_id: user.id,
      type: manualType,
      amount: parseFloat(manualAmount),
      currency: "USD",
      category: manualCategory,
      description: manualDescription.trim() || null,
      date: new Date(targetDate).toISOString(),
    });

    if (!error) {
      setManualAmount("");
      setManualDescription("");
      setShowManualForm(false);
      loadFinances(user.id);
    }
    setIsSubmitting(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("finances").delete().eq("id", id);
    if (!error) {
      setFinances((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const totalIncome = finances
    .filter((f) => f.type === "income")
    .reduce((acc, f) => acc + Number(f.amount), 0);

  const totalExpense = finances
    .filter((f) => f.type === "expense")
    .reduce((acc, f) => acc + Number(f.amount), 0);

  const netBalance = totalIncome - totalExpense;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black font-mono">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-2 w-2 bg-black dark:bg-white animate-pulse" />
          <span>LOADING FINANCIAL LEDGER...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <AppNavbar userEmail={user?.email} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
              Capital & Cash Flow
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              Financial Ledger
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm">
              Frictionless expense logging and net cash flow control.
            </p>
          </div>
        </div>

        {/* Financial Metrics in B&W */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <span className="text-xs text-zinc-400 uppercase font-medium block">Net Balance</span>
            <span className="text-2xl font-bold mt-1 block">
              ${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <span className="text-xs text-zinc-400 uppercase font-medium block">Total Inflow</span>
            <span className="text-2xl font-bold mt-1 block">
              +${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <span className="text-xs text-zinc-400 uppercase font-medium block">Total Outflow</span>
            <span className="text-2xl font-bold mt-1 block">
              -${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Instant Transaction Log Bar */}
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Instant Expense & Income Log
            </span>
            <span className="text-xs text-zinc-400">
              Prefix + for income, - for expense
            </span>
          </div>

          <form onSubmit={handleQuickLog} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="e.g. '$45 Dinner with team', '-18 Uber', '+3500 Freelance client'..."
                className="w-full px-3.5 py-2.5 pr-24 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-xs sm:text-sm focus:outline-none focus:border-black dark:focus:border-white"
              />
              <button
                type="submit"
                disabled={isSubmitting || !quickInput.trim() || !parsedPreview?.amount}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded bg-black text-white dark:bg-white dark:text-black text-xs uppercase font-bold hover:opacity-90 disabled:opacity-30 cursor-pointer"
              >
                {isSubmitting ? "..." : "Record"}
              </button>
            </div>

            {parsedPreview && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-2xs">
                <span className="text-zinc-400 uppercase">Parsed:</span>
                <span className="px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold uppercase">
                  {parsedPreview.type}
                </span>
                {parsedPreview.amount > 0 && (
                  <span className="px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold">
                    ${parsedPreview.amount.toFixed(2)}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                  {parsedPreview.category}
                </span>
                <span className="px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-400">
                  {parsedPreview.description}
                </span>
              </div>
            )}
          </form>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-2xs text-zinc-400 uppercase block mb-1.5">
              1-Tap Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FINANCE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset.text)}
                  className="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-2xs hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Collapsible Manual Form */}
        <div className="flex justify-end font-mono">
          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="text-2xs text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            {showManualForm ? <ChevronUp className="h-3 3" /> : <ChevronDown className="h-3 w-3" />}
            {showManualForm ? "Hide manual form" : "Manual transaction form"}
          </button>
        </div>

        {showManualForm && (
          <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4 font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Manual Transaction</h3>
            <form onSubmit={handleManualAddTransaction} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Type</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black uppercase"
                  >
                    <option value="expense">expense</option>
                    <option value="income">income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="45.00"
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black"
                  >
                    <option value="general">general</option>
                    <option value="food">food</option>
                    <option value="transportation">transportation</option>
                    <option value="housing">housing</option>
                    <option value="entertainment">entertainment</option>
                    <option value="shopping">shopping</option>
                    <option value="income">income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !manualAmount}
                  className="px-3 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transaction History in Clean B&W List */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-semibold text-zinc-500">Transaction History</span>
            <span className="text-zinc-400">{finances.length} records</span>
          </div>

          {finances.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-400">
              No transactions recorded yet. Use the instant input above to record your first entry.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900 font-mono">
              {finances.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs uppercase px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold">
                        {item.description || item.category}
                      </span>
                    </div>
                    <span className="text-2xs text-zinc-400 block">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold">
                      {item.type === "income" ? "+" : "-"}${Number(item.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeleteTransaction(item.id)}
                      className="p-1 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}