import { unitToGrams, Unit } from "@/lib/units";

export type RecipeIngredientWithNutrition = {
  amount: number;
  unit: string;
  ingredient: {
    kcalPer100g: number;
    proteinPer100g: number | null;
    fatPer100g: number | null;
    carbsPer100g: number | null;
  } | null;
};

export type NutritionTotals = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  hasSkippedStueck: boolean;
};

/**
 * Compute per-portion nutrition totals from structured recipe ingredients.
 *
 * Returns null when no computable data exists (no linked ingredients with
 * gram-convertible units), so callers can hide the nutrition table entirely.
 */
export function computeNutritionTotals(
  recipeIngredients: RecipeIngredientWithNutrition[],
  servings: number | null
): NutritionTotals | null {
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let hasAnyData = false;
  let hasSkippedStueck = false;

  for (const ri of recipeIngredients) {
    if (!ri.ingredient) continue;

    const grams = unitToGrams(ri.amount, ri.unit as Unit);
    if (grams === null) {
      // stueck — cannot convert without AI estimation
      hasSkippedStueck = true;
      continue;
    }

    const factor = grams / 100;
    totalKcal += ri.ingredient.kcalPer100g * factor;
    totalProtein += (ri.ingredient.proteinPer100g ?? 0) * factor;
    totalFat += (ri.ingredient.fatPer100g ?? 0) * factor;
    totalCarbs += (ri.ingredient.carbsPer100g ?? 0) * factor;
    hasAnyData = true;
  }

  if (!hasAnyData) return null;

  const portions = servings && servings > 0 ? servings : 1;

  return {
    kcal: Math.round(totalKcal / portions),
    protein: Math.round((totalProtein / portions) * 10) / 10,
    fat: Math.round((totalFat / portions) * 10) / 10,
    carbs: Math.round((totalCarbs / portions) * 10) / 10,
    hasSkippedStueck,
  };
}
