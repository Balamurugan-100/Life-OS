import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { parseDishQuery } from "@/lib/nutrition/parser";
import { findBestFoodMatch, getUsdaFoodDetails } from "@/lib/nutrition/usda";
import { calculateNutrientsForFood } from "@/lib/nutrition/calculate";
import { DietEntryNotesMetadata } from "@/lib/nutrition/types";

// POST /api/nutrition/calculate
export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dish, entryId, mealType, quantity, unit, fdcId } = body;

    if (!dish && !fdcId) {
      return NextResponse.json({ error: "Dish name or fdcId is required" }, { status: 400 });
    }

    // Parse dish string if not explicitly broken down
    const parsed = parseDishQuery(dish || "");
    const finalQuantity = typeof quantity === "number" && quantity > 0 ? quantity : parsed.quantity;
    const finalUnit = unit || parsed.unit;
    const finalMealType = mealType || parsed.mealType || "lunch";

    // Obtain USDA food: via explicit fdcId or smart match
    let food = null;
    if (typeof fdcId === "number") {
      food = await getUsdaFoodDetails(fdcId);
    }
    if (!food) {
      food = await findBestFoodMatch(parsed.foodQuery || dish);
    }

    if (!food) {
      return NextResponse.json({ error: "No matching food found in USDA FoodData" }, { status: 404 });
    }

    // Deterministically calculate nutrients
    const calculated = calculateNutrientsForFood(
      food,
      finalQuantity,
      finalUnit,
      dish || food.description
    );

    const notesMetadata: DietEntryNotesMetadata = {
      isCalculating: false,
      dishRaw: dish || food.description,
      fdcId: calculated.fdcId,
      dataType: calculated.dataType,
      portionUsed: calculated.portionUsed,
      quantityGrams: calculated.quantityGrams,
      fiber: calculated.nutrients.fiber,
      sugars: calculated.nutrients.sugars,
      sodium: calculated.nutrients.sodium,
      source: calculated.source,
      matchedDescription: calculated.matchedDescription,
    };

    // If an existing entryId was provided (lazy-loading flow), update the entry in Supabase!
    if (entryId) {
      const { data: updatedEntry, error: updateErr } = await supabase
        .from("diet")
        .update({
          food_name: calculated.dish,
          calories: calculated.nutrients.calories,
          protein: calculated.nutrients.protein,
          carbs: calculated.nutrients.carbs,
          fat: calculated.nutrients.fat,
          notes: JSON.stringify(notesMetadata),
          meal_type: finalMealType,
        })
        .eq("id", entryId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateErr) {
        console.error("Failed to update diet entry:", updateErr);
      }

      return NextResponse.json({
        success: true,
        calculated,
        entry: updatedEntry,
      });
    }

    return NextResponse.json({
      success: true,
      calculated,
      metadata: notesMetadata,
    });
  } catch (error: any) {
    console.error("Calculation API error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal nutrition calculation error" },
      { status: 500 }
    );
  }
}
