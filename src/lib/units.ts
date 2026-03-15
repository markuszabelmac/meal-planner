export type Unit = "g" | "kg" | "ml" | "l" | "stueck" | "el" | "tl" | "prise";

/**
 * Conversion factors from each unit to grams.
 * null means no fixed conversion exists (e.g. "Stück" depends on item size).
 */
export const UNIT_TO_GRAMS: Record<Unit, number | null> = {
  g: 1,
  kg: 1000,
  ml: 1, // approximate: assumes density = 1 g/ml for liquids
  l: 1000,
  el: 15, // 1 Esslöffel ≈ 15 g
  tl: 5, // 1 Teelöffel ≈ 5 g
  prise: 0.5, // 1 Prise ≈ 0.5 g
  stueck: null, // no fixed conversion; Phase 9 AI fallback
};

/**
 * Convert an amount in the given unit to grams.
 *
 * @param amount - The quantity in the source unit.
 * @param unit   - The source unit.
 * @returns The equivalent mass in grams, or null if no fixed conversion
 *          exists (stueck). Callers must handle the null case.
 */
export function unitToGrams(amount: number, unit: Unit): number | null {
  const factor = UNIT_TO_GRAMS[unit];
  if (factor === null) return null;
  return amount * factor;
}
