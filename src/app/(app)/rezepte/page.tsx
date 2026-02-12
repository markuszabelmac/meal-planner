"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  prepTime: number | null;
  servings: number | null;
  tags: string[];
  creator: { displayName: string };
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recipes/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedCategory) params.set("category", selectedCategory);

    fetch(`/api/recipes?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data);
        setLoading(false);
      });
  }, [search, selectedCategory]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rezepte</h2>
        <div className="flex gap-2">
          <Link
            href="/rezepte/import"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
          >
            Importieren
          </Link>
          <Link
            href="/rezepte/neu"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            + Neu
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rezepte durchsuchen..."
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategory("")}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                !selectedCategory
                  ? "bg-primary text-white"
                  : "border border-border text-muted hover:border-primary hover:text-primary"
              }`}
            >
              Alle
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setSelectedCategory(cat === selectedCategory ? "" : cat)
                }
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  cat === selectedCategory
                    ? "bg-primary text-white"
                    : "border border-border text-muted hover:border-primary hover:text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recipe list */}
      {loading ? (
        <p className="py-8 text-center text-muted">Lade Rezepte...</p>
      ) : recipes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted">
            {search || selectedCategory
              ? "Keine Rezepte gefunden."
              : "Noch keine Rezepte vorhanden."}
          </p>
          {!search && !selectedCategory && (
            <Link
              href="/rezepte/neu"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Erstes Rezept anlegen
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/rezepte/${recipe.id}`}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{recipe.name}</h3>
                  {recipe.description && (
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {recipe.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {recipe.category && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {recipe.category}
                      </span>
                    )}
                    {recipe.prepTime && (
                      <span className="text-xs text-muted">
                        {recipe.prepTime} Min.
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      von {recipe.creator.displayName}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
