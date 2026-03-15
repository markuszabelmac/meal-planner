"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type IngredientRow = {
  id: string;
  name: string;
  nameEn: string | null;
  kcalPer100g: number;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  carbsPer100g: number | null;
  isCustom: boolean;
};

export default function ZutatenPage() {
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/ingredients?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setIngredients(data);
        setLoading(false);
      });
  }, [search]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Zutaten</h2>
        <Link
          href="/zutaten/neu"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          + Neue Zutat
        </Link>
      </div>

      {/* Search */}
      <div className="sticky top-[49px] z-[5] -mx-4 mb-4 bg-background px-4 pb-3 pt-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zutat suchen..."
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Ingredient list */}
      {loading ? (
        <p className="py-8 text-center text-muted">Laden...</p>
      ) : ingredients.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted">
            {search ? "Keine Zutaten gefunden." : "Noch keine Zutaten vorhanden."}
          </p>
        </div>
      ) : (
        <>
          {!search && (
            <p className="mb-3 text-xs text-muted">
              Zeigt die ersten 100 Zutaten. Suche eingeben fuer mehr Ergebnisse.
            </p>
          )}
          <div className="space-y-2 pb-24">
            {ingredients.map((ingredient) => (
              <Link
                key={ingredient.id}
                href={`/zutaten/${ingredient.id}/bearbeiten`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{ingredient.name}</span>
                      {ingredient.isCustom && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Eigene
                        </span>
                      )}
                    </div>
                    {ingredient.nameEn && (
                      <p className="text-sm text-muted">({ingredient.nameEn})</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {[
                        `${Math.round(ingredient.kcalPer100g)} kcal`,
                        ingredient.proteinPer100g != null
                          ? `${ingredient.proteinPer100g}g P`
                          : null,
                        ingredient.fatPer100g != null
                          ? `${ingredient.fatPer100g}g F`
                          : null,
                        ingredient.carbsPer100g != null
                          ? `${ingredient.carbsPer100g}g KH`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
