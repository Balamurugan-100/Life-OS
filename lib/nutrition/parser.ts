import { ParsedDishInput } from "./types";
import { getDefaultMealType } from "@/lib/parsers";

/**
 * Parses user input string (e.g., "2 boiled eggs", "Chicken breast 150g", "1 cup oats")
 * into normalized search query, quantity, unit, and optional meal type.
 */
export function parseDishQuery(input: string): ParsedDishInput {
  let cleaned = input.trim();
  let mealType: "breakfast" | "lunch" | "dinner" | "snack" | undefined;

  // Check if meal type prefix exists (e.g. "breakfast: 2 eggs" or "lunch - chicken breast")
  const mealPrefixMatch = cleaned.match(/^(breakfast|lunch|dinner|snack)[:\-\s]+/i);
  if (mealPrefixMatch) {
    mealType = mealPrefixMatch[1].toLowerCase() as any;
    cleaned = cleaned.slice(mealPrefixMatch[0].length).trim();
  }

  // Common units
  // 1. Grams: "200g", "200 g", "200 grams"
  const gramsMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);
  if (gramsMatch) {
    const qty = parseFloat(gramsMatch[1]);
    const food = cleaned.replace(gramsMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food || "food"),
      quantity: qty > 0 ? qty : 100,
      unit: "g",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 2. Milliliters: "250ml", "250 ml"
  const mlMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i);
  if (mlMatch) {
    const qty = parseFloat(mlMatch[1]);
    const food = cleaned.replace(mlMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food || "beverage"),
      quantity: qty > 0 ? qty : 100,
      unit: "ml",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 3. Cups: "1 cup", "1.5 cups"
  const cupMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:cups?|c)\b/i);
  if (cupMatch) {
    const qty = parseFloat(cupMatch[1]);
    const food = cleaned.replace(cupMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food || "food"),
      quantity: qty > 0 ? qty : 1,
      unit: "cup",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 4. Ounces: "8oz", "8 oz", "8 ounces"
  const ozMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b/i);
  if (ozMatch) {
    const qty = parseFloat(ozMatch[1]);
    const food = cleaned.replace(ozMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food || "food"),
      quantity: qty > 0 ? qty : 1,
      unit: "oz",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 5. Tablespoon: "1 tbsp", "2 tablespoons"
  const tbspMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?)\b/i);
  if (tbspMatch) {
    const qty = parseFloat(tbspMatch[1]);
    const food = cleaned.replace(tbspMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food || "food"),
      quantity: qty > 0 ? qty : 1,
      unit: "tbsp",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 6. Teaspoon: "1 tsp", "2 teaspoons"
  const tspMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\b/i);
  if (tspMatch) {
    const qty = parseFloat(tspMatch[1]);
    const food = cleaned.replace(tspMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food || "food"),
      quantity: qty > 0 ? qty : 1,
      unit: "tsp",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 7. Slices / pieces / items: "2 slices bread", "3 pieces chicken"
  const sliceMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:slices?|pcs?|pieces?)\b/i);
  if (sliceMatch) {
    const qty = parseFloat(sliceMatch[1]);
    const food = cleaned.replace(sliceMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food || "food"),
      quantity: qty > 0 ? qty : 1,
      unit: "item",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 8. Leading number: "2 eggs", "3 bananas"
  const leadingCountMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (leadingCountMatch) {
    const qty = parseFloat(leadingCountMatch[1]);
    const food = leadingCountMatch[2].trim();
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food),
      quantity: qty > 0 ? qty : 1,
      unit: "item",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // 9. Trailing number: "egg 2", "banana 1"
  const trailingCountMatch = cleaned.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (trailingCountMatch) {
    const food = trailingCountMatch[1].trim();
    const qty = parseFloat(trailingCountMatch[2]);
    return {
      raw: input,
      foodQuery: cleanFoodQuery(food),
      quantity: qty > 0 ? qty : 1,
      unit: "item",
      mealType: mealType || getDefaultMealType(),
    };
  }

  // Default: treat the whole string as the food name, default 1 serving / 100g
  return {
    raw: input,
    foodQuery: cleanFoodQuery(cleaned),
    quantity: 1,
    unit: "serving",
    mealType: mealType || getDefaultMealType(),
  };
}

function cleanFoodQuery(str: string): string {
  return str
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
