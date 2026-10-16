export interface NutrientValue {
  nutrientId?: number;
  name: string;
  amount: number;
  unit: string;
}

export interface FoodPortion {
  id?: number;
  description: string;
  gramWeight: number;
  sequenceNumber?: number;
}

export interface NormalizedNutrientProfile {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugars?: number;
  sodium?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
}

export interface NormalizedFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string | null;
  brandName?: string | null;
  ingredients?: string | null;
  nutrientsPer100g: NormalizedNutrientProfile;
  portions: FoodPortion[];
  source: "USDA FoodData Central" | "USDA FoodData Central (Cached)";
  fetchedAt: string;
}

export interface FoodSearchResult {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string | null;
  brandName?: string | null;
  ingredients?: string | null;
  score?: number;
  nutrientsSummary?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface ParsedDishInput {
  raw: string;
  foodQuery: string;
  quantity: number;
  unit: "g" | "ml" | "item" | "cup" | "oz" | "tbsp" | "tsp" | "serving";
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
}

export interface CalculatedDishResult {
  dish: string;
  matchedDescription: string;
  fdcId: number;
  dataType?: string;
  brandOwner?: string | null;
  quantity: number;
  unit: string;
  quantityGrams: number;
  portionUsed: string;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugars: number;
    sodium: number;
  };
  source: string;
}

export interface DietEntryNotesMetadata {
  isCalculating?: boolean;
  dishRaw?: string;
  fdcId?: number;
  dataType?: string;
  portionUsed?: string;
  quantityGrams?: number;
  fiber?: number;
  sugars?: number;
  sodium?: number;
  source?: string;
  matchedDescription?: string;
}
