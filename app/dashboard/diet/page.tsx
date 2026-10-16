"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/components/AppNavbar";
import {
  Utensils,
  Plus,
  Trash2,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  Loader2,
  Info,
  ExternalLink,
  X,
  Check,
  Sparkles,
  Database,
} from "lucide-react";
import {
  parseMealInput,
  getDefaultMealType,
  MEAL_PRESETS,
} from "@/lib/parsers";
import { parseDishQuery } from "@/lib/nutrition/parser";
import {
  FoodSearchResult,
  NormalizedFood,
  DietEntryNotesMetadata,
} from "@/lib/nutrition/types";

interface DietItem {
  id: string;
  user_id: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
  date: string;
  created_at: string;
}

const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function DietPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diet, setDiet] = useState<DietItem[]>([]);

  // Instant dish quick-log state with lazy loading
  const [quickInput, setQuickInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatingIds, setCalculatingIds] = useState<Set<string>>(new Set());

  // USDA Food Finder Modal State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearchingUsda, setIsSearchingUsda] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [selectedFoodDetails, setSelectedFoodDetails] = useState<NormalizedFood | null>(null);
  const [searchQuantity, setSearchQuantity] = useState("1");
  const [searchUnit, setSearchUnit] = useState("item");
  const [searchMealType, setSearchMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [isAddingFromSearch, setIsAddingFromSearch] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Nutrition Sheet Modal (Detailed Micronutrient Breakdown)
  const [activeNutrientSheet, setActiveNutrientSheet] = useState<{
    foodName: string;
    item: DietItem;
    meta?: DietEntryNotesMetadata;
  } | null>(null);

  // Manual fallback state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualMealType, setManualMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualDate, setManualDate] = useState("");

  const supabase = createClient();

  const parsedPreview = useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseDishQuery(quickInput);
  }, [quickInput]);

  const loadDiet = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("diet")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (!error && data) {
        setDiet(data as DietItem[]);
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
        loadDiet(session.user.id);
        const defaultMeal = getDefaultMealType();
        setManualMealType(defaultMeal);
        setSearchMealType(defaultMeal);
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
  }, [router, loadDiet, supabase]);

  // LAZY-LOAD NUTRITION CALCULATION WORKER
  const triggerLazyNutrientCalculation = useCallback(
    async (entryId: string, dishText: string, mealType: "breakfast" | "lunch" | "dinner" | "snack") => {
      setCalculatingIds((prev) => new Set(prev).add(entryId));

      try {
        const res = await fetch("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId,
            dish: dishText,
            mealType,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.calculated) {
            setDiet((prev) =>
              prev.map((item) => {
                if (item.id === entryId) {
                  return {
                    ...item,
                    food_name: data.calculated.dish || item.food_name,
                    calories: data.calculated.nutrients.calories,
                    protein: data.calculated.nutrients.protein,
                    carbs: data.calculated.nutrients.carbs,
                    fat: data.calculated.nutrients.fat,
                    notes: JSON.stringify({
                      isCalculating: false,
                      source: data.calculated.source,
                      fdcId: data.calculated.fdcId,
                      dataType: data.calculated.dataType,
                      portionUsed: data.calculated.portionUsed,
                      quantityGrams: data.calculated.quantityGrams,
                      fiber: data.calculated.nutrients.fiber,
                      sodium: data.calculated.nutrients.sodium,
                      sugars: data.calculated.nutrients.sugars,
                      matchedDescription: data.calculated.matchedDescription,
                    }),
                  };
                }
                return item;
              })
            );
          }
        }
      } catch (err) {
        console.error("Lazy nutrition lookup error:", err);
      } finally {
        setCalculatingIds((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
      }
    },
    []
  );

  // Auto-heal any uncalculated items loaded from database
  useEffect(() => {
    diet.forEach((item) => {
      if (item.calories === 0 && item.notes) {
        try {
          const parsed = JSON.parse(item.notes);
          if (parsed.isCalculating && !calculatingIds.has(item.id)) {
            triggerLazyNutrientCalculation(item.id, parsed.dishRaw || item.food_name, item.meal_type);
          }
        } catch {
          // not json
        }
      }
    });
  }, [diet, calculatingIds, triggerLazyNutrientCalculation]);

  // INSTANT DISH LOG: Adds entry immediately, lazy loads nutrients until API responds
  const handleQuickLog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !quickInput.trim()) return;

    const dishText = quickInput.trim();
    const parsed = parseDishQuery(dishText);
    const mealType = parsed.mealType || manualMealType;
    const newId = generateUUID();
    const nowIso = new Date().toISOString();

    const initialMetadata: DietEntryNotesMetadata = {
      isCalculating: true,
      dishRaw: dishText,
      quantityGrams: parsed.unit === "g" ? parsed.quantity : undefined,
    };

    const optimisticItem: DietItem = {
      id: newId,
      user_id: user.id,
      meal_type: mealType,
      food_name: dishText,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      notes: JSON.stringify(initialMetadata),
      date: nowIso,
      created_at: nowIso,
    };

    // 1. Immediately update UI with entry in loading state!
    setDiet((prev) => [optimisticItem, ...prev]);
    setCalculatingIds((prev) => new Set(prev).add(newId));
    setQuickInput("");
    setIsSubmitting(true);

    // 2. Persist record in Supabase
    const { error: insertError } = await supabase.from("diet").insert({
      id: newId,
      user_id: user.id,
      meal_type: optimisticItem.meal_type,
      food_name: optimisticItem.food_name,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      notes: optimisticItem.notes,
      date: optimisticItem.date,
    });

    if (insertError) {
      console.error("Optimistic insert error:", insertError);
    }

    setIsSubmitting(false);

    // 3. Trigger lazy load API calculation
    triggerLazyNutrientCalculation(newId, dishText, mealType);
  };

  // Instant Preset Log
  const handlePresetLog = async (preset: (typeof MEAL_PRESETS)[number]) => {
    if (!user) return;
    setIsSubmitting(true);
    const newId = generateUUID();
    const nowIso = new Date().toISOString();

    const optimisticItem: DietItem = {
      id: newId,
      user_id: user.id,
      meal_type: preset.mealType as any,
      food_name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      notes: JSON.stringify({ source: "Preset Quick-Log" }),
      date: nowIso,
      created_at: nowIso,
    };

    setDiet((prev) => [optimisticItem, ...prev]);

    await supabase.from("diet").insert({
      id: newId,
      user_id: user.id,
      meal_type: preset.mealType as any,
      food_name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      notes: optimisticItem.notes,
      date: nowIso,
    });

    setIsSubmitting(false);
  };

  // Manual Form Submission
  const handleManualAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualFoodName.trim()) return;

    setIsSubmitting(true);
    const targetDate = manualDate || new Date().toISOString().slice(0, 10);
    const newId = generateUUID();
    const nowIso = new Date(targetDate).toISOString();

    const newItem: DietItem = {
      id: newId,
      user_id: user.id,
      meal_type: manualMealType,
      food_name: manualFoodName.trim(),
      calories: parseInt(manualCalories) || 0,
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
      notes: manualNotes.trim() ? JSON.stringify({ manualNote: manualNotes.trim() }) : null,
      date: nowIso,
      created_at: nowIso,
    };

    setDiet((prev) => [newItem, ...prev]);

    await supabase.from("diet").insert({
      id: newId,
      user_id: user.id,
      meal_type: newItem.meal_type,
      food_name: newItem.food_name,
      calories: newItem.calories,
      protein: newItem.protein,
      carbs: newItem.carbs,
      fat: newItem.fat,
      notes: newItem.notes,
      date: newItem.date,
    });

    setManualFoodName("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setManualNotes("");
    setShowManualForm(false);
    setIsSubmitting(false);
  };

  const handleDeleteMeal = async (id: string) => {
    if (!user) return;
    setDiet((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("diet").delete().eq("id", id);
  };

  // Search USDA FoodData handler with debouncing
  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    setSelectedFood(null);
    setSelectedFoodDetails(null);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setIsSearchingUsda(false);
      return;
    }

    setIsSearchingUsda(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(val.trim())}&pageSize=8`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("USDA search error:", err);
      } finally {
        setIsSearchingUsda(false);
      }
    }, 300);
  };

  // Select food item from USDA search list
  const handleSelectFoodResult = async (item: FoodSearchResult) => {
    setSelectedFood(item);
    setIsSearchingUsda(true);

    try {
      const res = await fetch(`/api/nutrition/foods/${item.fdcId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFoodDetails(data.food);
        if (data.food?.portions?.length > 0) {
          setSearchUnit(data.food.portions[0].description);
        } else {
          setSearchUnit("100g");
        }
      }
    } catch (err) {
      console.error("Fetch food details error:", err);
    } finally {
      setIsSearchingUsda(false);
    }
  };

  // Add selected USDA food to meal log
  const handleAddSelectedFoodToMeal = async () => {
    if (!user || !selectedFood) return;
    setIsAddingFromSearch(true);

    try {
      const qty = parseFloat(searchQuantity) || 1;
      const res = await fetch("/api/nutrition/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish: selectedFood.description,
          fdcId: selectedFood.fdcId,
          quantity: qty,
          unit: searchUnit,
          mealType: searchMealType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const calculated = data.calculated;
        const newId = generateUUID();
        const nowIso = new Date().toISOString();

        const notesMetadata: DietEntryNotesMetadata = {
          isCalculating: false,
          dishRaw: selectedFood.description,
          fdcId: calculated.fdcId,
          dataType: calculated.dataType,
          portionUsed: calculated.portionUsed,
          quantityGrams: calculated.quantityGrams,
          fiber: calculated.nutrients.fiber,
          sodium: calculated.nutrients.sodium,
          sugars: calculated.nutrients.sugars,
          source: calculated.source,
          matchedDescription: calculated.matchedDescription,
        };

        const newItem: DietItem = {
          id: newId,
          user_id: user.id,
          meal_type: searchMealType,
          food_name: `${selectedFood.description} (${calculated.portionUsed})`,
          calories: calculated.nutrients.calories,
          protein: calculated.nutrients.protein,
          carbs: calculated.nutrients.carbs,
          fat: calculated.nutrients.fat,
          notes: JSON.stringify(notesMetadata),
          date: nowIso,
          created_at: nowIso,
        };

        setDiet((prev) => [newItem, ...prev]);

        await supabase.from("diet").insert({
          id: newId,
          user_id: user.id,
          meal_type: newItem.meal_type,
          food_name: newItem.food_name,
          calories: newItem.calories,
          protein: newItem.protein,
          carbs: newItem.carbs,
          fat: newItem.fat,
          notes: newItem.notes,
          date: newItem.date,
        });

        setIsSearchModalOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedFood(null);
        setSelectedFoodDetails(null);
      }
    } catch (err) {
      console.error("Add from search error:", err);
    } finally {
      setIsAddingFromSearch(false);
    }
  };

  // Preview macros for selected search food
  const calculatedSearchPreview = useMemo(() => {
    if (!selectedFoodDetails) return null;
    const qty = parseFloat(searchQuantity) || 1;
    let ratio = 1;

    // Portion matching
    const matchedPortion = selectedFoodDetails.portions?.find(
      (p) => p.description === searchUnit
    );

    if (matchedPortion) {
      ratio = (qty * matchedPortion.gramWeight) / 100;
    } else if (searchUnit === "g" || searchUnit.includes("100g")) {
      ratio = qty / 100;
    } else {
      ratio = qty;
    }

    const p = selectedFoodDetails.nutrientsPer100g;
    return {
      calories: Math.round(p.calories * ratio),
      protein: Math.round(p.protein * ratio * 10) / 10,
      carbs: Math.round(p.carbs * ratio * 10) / 10,
      fat: Math.round(p.fat * ratio * 10) / 10,
      grams: Math.round(ratio * 100),
    };
  }, [selectedFoodDetails, searchQuantity, searchUnit]);

  // Aggregate totals
  const totalCalories = diet.reduce((acc, d) => acc + (d.calories || 0), 0);
  const totalProtein = diet.reduce((acc, d) => acc + Number(d.protein || 0), 0);
  const totalCarbs = diet.reduce((acc, d) => acc + Number(d.carbs || 0), 0);
  const totalFat = diet.reduce((acc, d) => acc + Number(d.fat || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black font-mono">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-2 w-2 bg-black dark:white animate-pulse" />
          <span>LOADING DIET DATA...</span>
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
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Nutrition & Fuel
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-400">
                <Database className="h-3 w-3" /> USDA FoodData Central
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Diet Tracker & Nutrition Engine
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm">
              Instant dish logging with automated USDA nutrient calculation and lazy-load resolution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search USDA Catalog</span>
            </button>
          </div>
        </div>

        {/* Nutritional Summary in B&W */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <span className="text-xs text-zinc-400 uppercase font-medium block">Calories Today</span>
            <span className="text-2xl font-bold mt-1 block">
              {totalCalories} <span className="text-xs font-normal text-zinc-400">kcal</span>
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <span className="text-xs text-zinc-400 uppercase font-medium block">Protein</span>
            <span className="text-2xl font-bold mt-1 block">
              {totalProtein.toFixed(1)} <span className="text-xs font-normal text-zinc-400">g</span>
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <span className="text-xs text-zinc-400 uppercase font-medium block">Carbs</span>
            <span className="text-2xl font-bold mt-1 block">
              {totalCarbs.toFixed(1)} <span className="text-xs font-normal text-zinc-400">g</span>
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <span className="text-xs text-zinc-400 uppercase font-medium block">Fats</span>
            <span className="text-2xl font-bold mt-1 block">
              {totalFat.toFixed(1)} <span className="text-xs font-normal text-zinc-400">g</span>
            </span>
          </div>
        </div>

        {/* Instant Meal Log Bar with Lazy Load USDA Engine */}
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Instant Dish Logger & Macro Calculator
              </span>
            </div>
            <span className="text-2xs text-zinc-400 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Auto-times meal · Lazy calculates via USDA
            </span>
          </div>

          <form onSubmit={handleQuickLog} className="space-y-2">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="Enter any dish: '2 boiled eggs', 'Chicken breast 180g', 'Oatmeal 50g', 'Greek yogurt 150g'..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-sm focus:outline-none focus:border-black dark:focus:border-white placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={isSubmitting || !quickInput.trim()}
                className="px-5 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 disabled:opacity-30 transition-all shrink-0 cursor-pointer"
              >
                {isSubmitting ? "Adding..." : "Log Dish"}
              </button>
            </div>

            {parsedPreview && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-2xs">
                <span className="text-zinc-400 uppercase font-medium">Detected:</span>
                <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 uppercase font-semibold">
                  {parsedPreview.mealType}
                </span>
                <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-semibold">
                  Food: {parsedPreview.foodQuery}
                </span>
                <span className="px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                  Quantity: {parsedPreview.quantity} {parsedPreview.unit}
                </span>
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready to calculate via USDA FoodData API
                </span>
              </div>
            )}
          </form>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-2xs text-zinc-400 uppercase block mb-1.5 font-semibold">
              Quick 1-Tap Staples
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MEAL_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetLog(preset)}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-2xs hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                >
                  {preset.name} <span className="font-bold">({preset.calories} kcal)</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Collapsible Manual Form */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="text-2xs text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            {showManualForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showManualForm ? "Hide manual entry form" : "Manual override entry form"}
          </button>
        </div>

        {showManualForm && (
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
            <h3 className="text-xs font-semibold uppercase">Manual Macro Entry</h3>
            <form onSubmit={handleManualAddMeal} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Meal</label>
                  <select
                    value={manualMealType}
                    onChange={(e) => setManualMealType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black uppercase"
                  >
                    <option value="breakfast">breakfast</option>
                    <option value="lunch">lunch</option>
                    <option value="dinner">dinner</option>
                    <option value="snack">snack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Food *</label>
                  <input
                    type="text"
                    required
                    value={manualFoodName}
                    onChange={(e) => setManualFoodName(e.target.value)}
                    placeholder="Salmon Bowl"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Calories</label>
                  <input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="500"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-2xs uppercase text-zinc-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !manualFoodName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Meal History List with Lazy-Loading Nutrient Badges */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <div>
              <span className="text-2xs uppercase tracking-wider font-semibold text-zinc-400 block">
                Logged Fuel Records
              </span>
              <h2 className="text-sm font-bold">Meal & Nutrition History</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>{diet.length} items logged</span>
            </div>
          </div>

          {diet.length === 0 ? (
            <div className="py-14 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
              No meals logged yet. Enter any dish above (e.g. &quot;2 boiled eggs&quot;) to calculate nutrients with lazy loading.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {diet.map((item) => {
                let meta: DietEntryNotesMetadata | undefined;
                try {
                  if (item.notes) meta = JSON.parse(item.notes);
                } catch {
                  // legacy plain text notes
                }

                const isCalculating =
                  calculatingIds.has(item.id) ||
                  (meta?.isCalculating === true && item.calories === 0);

                return (
                  <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xs uppercase px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-semibold">
                          {item.meal_type}
                        </span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {item.food_name}
                        </span>

                        {/* Nutrition Source Badge */}
                        {meta?.source && (
                          <span className="text-2xs px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
                            {meta.source}
                          </span>
                        )}
                      </div>

                      {/* Nutrient Values or Lazy Shimmer Loading */}
                      {isCalculating ? (
                        <div className="flex items-center gap-3 pt-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800 animate-pulse">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            <span>Calculating USDA nutrients...</span>
                          </span>

                          <div className="flex items-center gap-2 text-2xs">
                            <span className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                            <span className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                            <span className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                            <span className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-0.5">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                            {item.calories} kcal
                          </span>
                          <span>Protein: <strong className="text-zinc-700 dark:text-zinc-300">{item.protein}g</strong></span>
                          <span>Carbs: <strong className="text-zinc-700 dark:text-zinc-300">{item.carbs}g</strong></span>
                          <span>Fat: <strong className="text-zinc-700 dark:text-zinc-300">{item.fat}g</strong></span>

                          {meta?.portionUsed && (
                            <span className="text-2xs text-zinc-500">
                              · {meta.portionUsed}
                            </span>
                          )}

                          {/* Trigger detailed nutrient sheet */}
                          {meta && (meta.fiber !== undefined || meta.sodium !== undefined) && (
                            <button
                              type="button"
                              onClick={() => setActiveNutrientSheet({ foodName: item.food_name, item, meta })}
                              className="text-2xs text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer ml-1"
                            >
                              <Info className="h-3 w-3" />
                              <span>Details</span>
                            </button>
                          )}
                        </div>
                      )}

                      <span className="text-2xs text-zinc-500 block">
                        Logged on {new Date(item.date).toLocaleDateString()} at{" "}
                        {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleDeleteMeal(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        title="Delete meal entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* USDA Attribution requirement (CC0 1.0) */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-2xs text-zinc-400 gap-2">
            <span>Nutrition data: USDA FoodData Central (Public Domain CC0 1.0).</span>
            <span>Deterministic scaling on 100g basis. No LLM estimation.</span>
          </div>
        </div>

        {/* USDA FOOD FINDER MODAL */}
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                <div>
                  <span className="text-2xs uppercase tracking-wider font-semibold text-zinc-400 block">
                    USDA FoodData Central
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Search Food & Portion Scaler
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-black dark:hover:text-white rounded-md cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    placeholder="Search foods: egg, banana, oats, salmon, chicken breast..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-sm focus:outline-none focus:border-black dark:focus:border-white placeholder:text-zinc-400"
                  />
                  {isSearchingUsda && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 text-zinc-400 animate-spin" />
                  )}
                </div>

                {/* Results List */}
                {!selectedFood && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-6 text-center">
                        {searchQuery ? "No matching foods found in USDA FoodData." : "Type a food name above to query USDA FoodData Central."}
                      </p>
                    ) : (
                      searchResults.map((item) => (
                        <div
                          key={item.fdcId}
                          onClick={() => handleSelectFoodResult(item)}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white cursor-pointer transition-all space-y-1 bg-zinc-50/50 dark:bg-zinc-900/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                              {item.description}
                            </h4>
                            <span className="text-2xs uppercase px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-400 shrink-0 font-medium">
                              {item.dataType || "USDA"}
                            </span>
                          </div>

                          {item.nutrientsSummary && (
                            <div className="flex items-center gap-3 text-2xs text-zinc-400">
                              <span>Per 100g: <strong className="text-zinc-300">{item.nutrientsSummary.calories} kcal</strong></span>
                              <span>P: {item.nutrientsSummary.protein}g</span>
                              <span>C: {item.nutrientsSummary.carbs}g</span>
                              <span>F: {item.nutrientsSummary.fat}g</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Food Portion & Quantity Configuration */}
                {selectedFood && (
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-2xs uppercase text-zinc-400 font-bold block">
                          Selected Food
                        </span>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {selectedFood.description}
                        </h4>
                        <span className="text-2xs text-zinc-500">
                          FDC ID: {selectedFood.fdcId} · {selectedFood.dataType || "USDA"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFood(null)}
                        className="text-xs text-zinc-400 hover:text-black dark:hover:text-white underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-2xs font-semibold uppercase text-zinc-400 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          value={searchQuantity}
                          onChange={(e) => setSearchQuantity(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-xs font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold uppercase text-zinc-400 mb-1">
                          Portion / Unit
                        </label>
                        <select
                          value={searchUnit}
                          onChange={(e) => setSearchUnit(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-xs focus:outline-none"
                        >
                          <option value="100g">100g basis</option>
                          <option value="g">Grams (weighed)</option>
                          {selectedFoodDetails?.portions?.map((p, idx) => (
                            <option key={idx} value={p.description}>
                              {p.description} ({p.gramWeight}g)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold uppercase text-zinc-400 mb-1">
                          Meal
                        </label>
                        <select
                          value={searchMealType}
                          onChange={(e) => setSearchMealType(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-xs uppercase focus:outline-none"
                        >
                          <option value="breakfast">breakfast</option>
                          <option value="lunch">lunch</option>
                          <option value="dinner">dinner</option>
                          <option value="snack">snack</option>
                        </select>
                      </div>
                    </div>

                    {/* Calculated Macro Preview */}
                    {calculatedSearchPreview && (
                      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black space-y-1">
                        <span className="text-2xs uppercase text-zinc-400 font-bold block">
                          Calculated Nutrition Preview ({calculatedSearchPreview.grams}g)
                        </span>
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <span className="text-black dark:text-white text-sm">
                            {calculatedSearchPreview.calories} kcal
                          </span>
                          <span>P: {calculatedSearchPreview.protein}g</span>
                          <span>C: {calculatedSearchPreview.carbs}g</span>
                          <span>F: {calculatedSearchPreview.fat}g</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-950">
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFood || isAddingFromSearch}
                  onClick={handleAddSelectedFoodToMeal}
                  className="px-5 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
                >
                  {isAddingFromSearch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Log Food Item</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NUTRITION SHEET MODAL (MICRONUTRIENT & METADATA VIEW) */}
        {activeNutrientSheet && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
                <div>
                  <span className="text-2xs uppercase tracking-wider font-semibold text-zinc-400 block">
                    Nutrition Breakdown Specification
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {activeNutrientSheet.foodName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNutrientSheet(null)}
                  className="p-1 text-zinc-400 hover:text-black dark:hover:text-white rounded-md cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-2xs text-zinc-400 block">Total Calories</span>
                    <strong className="text-base">{activeNutrientSheet.item.calories} kcal</strong>
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-2xs text-zinc-400 block">Protein</span>
                    <strong className="text-base">{activeNutrientSheet.item.protein} g</strong>
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-2xs text-zinc-400 block">Total Carbohydrates</span>
                    <strong className="text-base">{activeNutrientSheet.item.carbs} g</strong>
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-2xs text-zinc-400 block">Total Lipids (Fat)</span>
                    <strong className="text-base">{activeNutrientSheet.item.fat} g</strong>
                  </div>
                </div>

                {activeNutrientSheet.meta && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <span className="text-2xs uppercase font-bold text-zinc-400 block">
                      Micronutrients & Portions
                    </span>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
                      {activeNutrientSheet.meta.fiber !== undefined && (
                        <div className="py-1.5 flex justify-between">
                          <span className="text-zinc-500">Dietary Fiber</span>
                          <span className="font-semibold">{activeNutrientSheet.meta.fiber} g</span>
                        </div>
                      )}
                      {activeNutrientSheet.meta.sugars !== undefined && (
                        <div className="py-1.5 flex justify-between">
                          <span className="text-zinc-500">Total Sugars</span>
                          <span className="font-semibold">{activeNutrientSheet.meta.sugars} g</span>
                        </div>
                      )}
                      {activeNutrientSheet.meta.sodium !== undefined && (
                        <div className="py-1.5 flex justify-between">
                          <span className="text-zinc-500">Sodium</span>
                          <span className="font-semibold">{activeNutrientSheet.meta.sodium} mg</span>
                        </div>
                      )}
                      {activeNutrientSheet.meta.portionUsed && (
                        <div className="py-1.5 flex justify-between">
                          <span className="text-zinc-500">Portion Basis</span>
                          <span className="font-semibold">{activeNutrientSheet.meta.portionUsed}</span>
                        </div>
                      )}
                      {activeNutrientSheet.meta.fdcId && (
                        <div className="py-1.5 flex justify-between">
                          <span className="text-zinc-500">USDA FDC ID</span>
                          <span className="font-semibold">{activeNutrientSheet.meta.fdcId} ({activeNutrientSheet.meta.dataType || "USDA"})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveNutrientSheet(null)}
                  className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold cursor-pointer"
                >
                  Close Sheet
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}