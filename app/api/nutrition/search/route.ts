import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { searchUsdaFoods } from "@/lib/nutrition/usda";

// GET /api/nutrition/search?q={query}&pageSize={n}
export async function GET(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchUsdaFoods(q, Math.min(Math.max(pageSize, 1), 25));
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("USDA search route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to search USDA FoodData" },
      { status: 500 }
    );
  }
}
