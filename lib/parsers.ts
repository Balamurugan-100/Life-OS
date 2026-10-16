// ============================================================
// Natural Language Parsers & Smart Defaults for Life OS
// ============================================================

export interface ParsedMeal {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  confidence: {
    caloriesInferred: boolean;
    mealTypeInferred: boolean;
  };
}

export interface ParsedLearning {
  title: string;
  description: string | null;
  category: "programming" | "business" | "design" | "philosophy" | "health" | "general";
  status: "planned" | "in_progress" | "completed";
}

export interface ParsedFinance {
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
}

/**
 * Returns a smart default meal_type based on the current local hour:
 * - 04:00 - 11:00 -> breakfast
 * - 11:00 - 16:00 -> lunch
 * - 16:00 - 19:00 -> snack
 * - 19:00 - 23:59 -> dinner
 * - 00:00 - 04:00 -> snack
 */
export function getDefaultMealType(date: Date = new Date()): "breakfast" | "lunch" | "dinner" | "snack" {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 19) return "snack";
  if (hour >= 19) return "dinner";
  return "snack";
}

/**
 * Parses natural language meal input.
 * Examples:
 * - "Chicken rice bowl 650 cal 40g pro"
 * - "2 boiled eggs and toast breakfast"
 * - "Greek yogurt with berries ~250 kcal"
 * - "Pizza 800"
 */
export function parseMealInput(input: string, referenceDate: Date = new Date()): ParsedMeal {
  let text = input.trim();
  let mealType: "breakfast" | "lunch" | "dinner" | "snack" | null = null;
  let mealTypeInferred = true;

  // 1. Detect explicit meal type keyword
  const mealRegex = /\b(breakfast|lunch|dinner|snack)\b/i;
  const mealMatch = text.match(mealRegex);
  if (mealMatch) {
    mealType = mealMatch[1].toLowerCase() as "breakfast" | "lunch" | "dinner" | "snack";
    mealTypeInferred = false;
    text = text.replace(mealRegex, " ").trim();
  } else {
    mealType = getDefaultMealType(referenceDate);
  }

  // 2. Extract protein (e.g. "40g pro", "40g protein", "40g p")
  let protein = 0;
  const proRegex = /(\d+(?:\.\d+)?)\s*(?:g\s*pro(?:tein)?|g\s*p\b|pro\b)/i;
  const proMatch = text.match(proRegex);
  if (proMatch) {
    protein = parseFloat(proMatch[1]) || 0;
    text = text.replace(proMatch[0], " ").trim();
  }

  // 3. Extract carbs (e.g. "50g carbs", "50g c")
  let carbs = 0;
  const carbRegex = /(\d+(?:\.\d+)?)\s*(?:g\s*carb(?:s)?|g\s*c\b)/i;
  const carbMatch = text.match(carbRegex);
  if (carbMatch) {
    carbs = parseFloat(carbMatch[1]) || 0;
    text = text.replace(carbMatch[0], " ").trim();
  }

  // 4. Extract fat (e.g. "15g fat", "15g f")
  let fat = 0;
  const fatRegex = /(\d+(?:\.\d+)?)\s*(?:g\s*fat|g\s*f\b)/i;
  const fatMatch = text.match(fatRegex);
  if (fatMatch) {
    fat = parseFloat(fatMatch[1]) || 0;
    text = text.replace(fatMatch[0], " ").trim();
  }

  // 5. Extract calories (e.g. "500 cal", "500 kcal", "500 calories", "~500 cal", or trailing number like "Salad 350")
  let calories = 0;
  let caloriesInferred = true;
  const calRegex = /(?:~)?(\d+)\s*(?:k?cal(?:ories)?)\b/i;
  const calMatch = text.match(calRegex);
  if (calMatch) {
    calories = parseInt(calMatch[1], 10) || 0;
    caloriesInferred = false;
    text = text.replace(calMatch[0], " ").trim();
  } else {
    // Check for trailing number as calorie shorthand e.g. "Chicken bowl 650"
    const trailingNumRegex = /\s+(\d{2,4})\s*$/;
    const trailingMatch = text.match(trailingNumRegex);
    if (trailingMatch) {
      calories = parseInt(trailingMatch[1], 10) || 0;
      caloriesInferred = false;
      text = text.replace(trailingNumRegex, "").trim();
    }
  }

  // Clean extra spaces & punctuation
  const cleanFoodName = text.replace(/\s+/g, " ").replace(/^[,.-]+|[,.-]+$/g, "").trim();

  return {
    food_name: cleanFoodName || input.trim(),
    calories,
    protein,
    carbs,
    fat,
    meal_type: mealType,
    confidence: {
      caloriesInferred,
      mealTypeInferred,
    },
  };
}

/**
 * Common quick-log food presets for instant 1-tap logging
 */
export const MEAL_PRESETS = [
  { name: "Coffee / Espresso", calories: 15, protein: 1, carbs: 2, fat: 0, mealType: "breakfast" },
  { name: "Oatmeal with Fruits", calories: 350, protein: 12, carbs: 62, fat: 6, mealType: "breakfast" },
  { name: "Eggs & Toast", calories: 380, protein: 22, carbs: 28, fat: 18, mealType: "breakfast" },
  { name: "Chicken & Rice Bowl", calories: 600, protein: 48, carbs: 65, fat: 14, mealType: "lunch" },
  { name: "Fresh Greek Salad", calories: 320, protein: 9, carbs: 14, fat: 26, mealType: "lunch" },
  { name: "Whey Protein Shake", calories: 200, protein: 32, carbs: 6, fat: 3, mealType: "snack" },
  { name: "Steak / Salmon & Veggies", calories: 580, protein: 45, carbs: 15, fat: 34, mealType: "dinner" },
  { name: "Handful of Almonds", calories: 160, protein: 6, carbs: 6, fat: 14, mealType: "snack" },
];

/**
 * Parses natural language learning input.
 * Examples:
 * - "Finished reading chapter 3 of Clean Code"
 * - "Mastered Next.js 16 proxy routing"
 * - "Studying cash flow statements for business"
 * - "Understanding stoic philosophy on control"
 */
export function parseLearningInput(input: string): ParsedLearning {
  const text = input.trim();
  const lower = text.toLowerCase();

  // Status detection
  let status: "planned" | "in_progress" | "completed" = "completed";
  if (/\b(plan to|want to learn|need to study|to read|todo|planned)\b/i.test(lower)) {
    status = "planned";
  } else if (/\b(reading|studying|learning|working on|in progress|starting)\b/i.test(lower)) {
    status = "in_progress";
  }

  // Category detection
  let category: "programming" | "business" | "design" | "philosophy" | "health" | "general" = "general";

  if (
    /\b(code|coding|react|next|javascript|typescript|js|ts|python|rust|go|sql|database|supabase|api|backend|frontend|css|tailwind|html|git|dev|algorithm|bug|deploy|linux|docker)\b/i.test(
      lower
    )
  ) {
    category = "programming";
  } else if (
    /\b(startup|business|finance|investing|stocks|market|crypto|sales|marketing|revenue|pricing|accounting|economics|product|growth|management|founder)\b/i.test(
      lower
    )
  ) {
    category = "business";
  } else if (
    /\b(ui|ux|figma|typography|colors|layout|wireframe|vector|animation|graphic|brand|icon|design)\b/i.test(
      lower
    )
  ) {
    category = "design";
  } else if (
    /\b(stoic|stoicism|philosophy|mindset|psychology|thinking|meditation|wisdom|mental model|habits|focus|ethics)\b/i.test(
      lower
    )
  ) {
    category = "philosophy";
  } else if (
    /\b(health|workout|gym|lifting|exercise|sleep|diet|nutrition|fasting|cardio|running|stretching|recovery)\b/i.test(
      lower
    )
  ) {
    category = "health";
  }

  return {
    title: text,
    description: null,
    category,
    status,
  };
}

/**
 * Common quick-learning starters
 */
export const LEARNING_STARTERS = [
  "Mastered Next.js 16 Proxy routing conventions",
  "Learned Postgres Row Level Security (RLS) best practices",
  "Read chapter on compounding interest in Psychology of Money",
  "Practiced Tailwind CSS v4 design token structure",
];

/**
 * Parses financial natural language input
 * Examples:
 * - "$45 dinner with team"
 * - "-15 Uber ride"
 * - "+3500 Freelance client payment"
 * - "Groceries 78.50"
 */
export function parseFinanceInput(input: string): ParsedFinance {
  let text = input.trim();
  let type: "income" | "expense" = "expense";

  // Check explicit prefix
  if (text.startsWith("+")) {
    type = "income";
    text = text.slice(1).trim();
  } else if (text.startsWith("-")) {
    type = "expense";
    text = text.slice(1).trim();
  }

  // Extract amount ($12.50 or 12.50 or 12)
  let amount = 0;
  const amountRegex = /(?:[\$€£₹])?\s*(\d+(?:\.\d{1,2})?)/;
  const match = text.match(amountRegex);
  if (match) {
    amount = parseFloat(match[1]) || 0;
    text = text.replace(match[0], "").trim();
  }

  const lower = text.toLowerCase();
  if (/\b(salary|payroll|income|dividend|freelance|bonus|sold|client|stripe|payout)\b/i.test(lower)) {
    type = "income";
  }

  // Category detection
  let category = "general";
  if (/\b(food|lunch|dinner|breakfast|coffee|groceries|restaurant|uber eats|doordash|snack|drink)\b/i.test(lower)) {
    category = "food";
  } else if (/\b(uber|lyft|gas|transit|metro|flight|taxi|train|car|parking)\b/i.test(lower)) {
    category = "transportation";
  } else if (/\b(rent|electric|wifi|internet|water|utility|bills|mortgage)\b/i.test(lower)) {
    category = "housing";
  } else if (/\b(netflix|spotify|game|movies|concert|event|party)\b/i.test(lower)) {
    category = "entertainment";
  } else if (/\b(amazon|clothes|shoes|gear|shopping|hardware)\b/i.test(lower)) {
    category = "shopping";
  } else if (type === "income") {
    category = "income";
  }

  const cleanDesc = text.replace(/^[,.-]+|[,.-]+$/g, "").trim();

  return {
    description: cleanDesc || (type === "income" ? "Income" : "Expense"),
    amount,
    type,
    category,
  };
}
