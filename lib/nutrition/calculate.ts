import { NormalizedFood, CalculatedDishResult } from "./types";

/**
 * Deterministically scales a NormalizedFood nutrient profile by quantity and unit.
 * Implements the per-100g basis scaling rule specified in Section 5 of the USDA brief.
 */
export function calculateNutrientsForFood(
  food: NormalizedFood,
  quantity: number,
  unit: string,
  dishLabel?: string
): CalculatedDishResult {
  const resolvedQuantity = quantity > 0 ? quantity : 1;
  const { gramWeight, portionUsed } = resolveGrams(food, resolvedQuantity, unit);

  const ratio = gramWeight / 100;
  const p100 = food.nutrientsPer100g;

  const calories = Math.round(p100.calories * ratio);
  const protein = Math.round(p100.protein * ratio * 10) / 10;
  const carbs = Math.round(p100.carbs * ratio * 10) / 10;
  const fat = Math.round(p100.fat * ratio * 10) / 10;
  const fiber = Math.round((p100.fiber || 0) * ratio * 10) / 10;
  const sugars = Math.round((p100.sugars || 0) * ratio * 10) / 10;
  const sodium = Math.round((p100.sodium || 0) * ratio);

  return {
    dish: dishLabel || food.description,
    matchedDescription: food.description,
    fdcId: food.fdcId,
    dataType: food.dataType,
    brandOwner: food.brandOwner,
    quantity: resolvedQuantity,
    unit,
    quantityGrams: Math.round(gramWeight * 10) / 10,
    portionUsed,
    nutrients: {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugars,
      sodium,
    },
    source: food.source,
  };
}

function resolveGrams(
  food: NormalizedFood,
  quantity: number,
  unit: string
): { gramWeight: number; portionUsed: string } {
  const normUnit = unit.toLowerCase();

  // 1. Grams
  if (normUnit === "g" || normUnit === "gram" || normUnit === "grams") {
    return {
      gramWeight: quantity,
      portionUsed: `${quantity}g weighed`,
    };
  }

  // 2. Milliliters (density ~ 1.0)
  if (normUnit === "ml" || normUnit === "milliliter") {
    return {
      gramWeight: quantity,
      portionUsed: `${quantity}ml volume`,
    };
  }

  // 3. Ounces
  if (normUnit === "oz" || normUnit === "ounce" || normUnit === "ounces") {
    const grams = quantity * 28.3495;
    return {
      gramWeight: grams,
      portionUsed: `${quantity} oz (${Math.round(grams)}g)`,
    };
  }

  // 4. Tablespoon
  if (normUnit === "tbsp" || normUnit === "tablespoon") {
    const tbspPortion = food.portions?.find((p) => /tbsp|tablespoon/i.test(p.description));
    const baseWeight = tbspPortion ? tbspPortion.gramWeight : 14;
    return {
      gramWeight: quantity * baseWeight,
      portionUsed: `${quantity} tbsp (${Math.round(quantity * baseWeight)}g)`,
    };
  }

  // 5. Teaspoon
  if (normUnit === "tsp" || normUnit === "teaspoon") {
    const tspPortion = food.portions?.find((p) => /tsp|teaspoon/i.test(p.description));
    const baseWeight = tspPortion ? tspPortion.gramWeight : 4.5;
    return {
      gramWeight: quantity * baseWeight,
      portionUsed: `${quantity} tsp (${Math.round(quantity * baseWeight)}g)`,
    };
  }

  // 6. Cup
  if (normUnit === "cup" || normUnit === "cups") {
    const cupPortion = food.portions?.find((p) => /cup/i.test(p.description));
    const baseWeight = cupPortion ? cupPortion.gramWeight : 200;
    return {
      gramWeight: quantity * baseWeight,
      portionUsed: `${quantity} cup (${Math.round(quantity * baseWeight)}g)`,
    };
  }

  // 7. Item / Piece / Slice / Count
  if (
    normUnit === "item" ||
    normUnit === "piece" ||
    normUnit === "slice" ||
    normUnit === "serving" ||
    !unit
  ) {
    // Check if food has a discrete item portion (e.g. "1 large", "1 slice", "1 medium", "1 fillet")
    const discretePortion = food.portions?.find((p) =>
      !/100g/i.test(p.description) && p.gramWeight > 0
    );

    if (discretePortion) {
      const grams = quantity * discretePortion.gramWeight;
      return {
        gramWeight: grams,
        portionUsed: `${quantity} × ${discretePortion.description}`,
      };
    }

    // Default 1 serving = 100g if no explicit portion metadata exists
    return {
      gramWeight: quantity * 100,
      portionUsed: `${quantity} serving (100g basis)`,
    };
  }

  // Fallback to 100g * quantity
  return {
    gramWeight: quantity * 100,
    portionUsed: `${quantity} portion (${quantity * 100}g)`,
  };
}
