import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getUsdaFoodDetails } from "@/lib/nutrition/usda";

interface RouteParams {
  params: Promise<{ fdcId: string }>;
}

// GET /api/nutrition/foods/[fdcId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fdcId: rawId } = await params;
  const fdcId = parseInt(rawId, 10);

  if (isNaN(fdcId)) {
    return NextResponse.json({ error: "Invalid fdcId" }, { status: 400 });
  }

  try {
    const food = await getUsdaFoodDetails(fdcId);
    if (!food) {
      return NextResponse.json({ error: "Food item not found in USDA FoodData" }, { status: 404 });
    }

    return NextResponse.json({ food });
  } catch (error: any) {
    console.error("USDA food details route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load food details" },
      { status: 500 }
    );
  }
}
