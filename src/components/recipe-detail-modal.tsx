"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  instructions: string | null;
  imageUrl: string | null;
  prepTime: number | null;
  servings: number | null;
  category: string | null;
  tags: string[];
  sourceUrl: string | null;
  creator: { displayName: string };
};

type Props = {
  recipeId: string;
  onClose: () => void;
};

export function RecipeDetailModal({ recipeId, onClose }: Props) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/recipes/${recipeId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Rezept nicht gefunden");
        return r.json();
      })
      .then((data) => {
        setRecipe(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [recipeId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-card shadow-xl">
        {/* X close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full p-1 hover:bg-background"
          aria-label="Schließen"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5">
          {loading && (
            <p className="py-12 text-center text-muted">Lade Rezept...</p>
          )}

          {error && (
            <p className="py-12 text-center text-muted">{error}</p>
          )}

          {!loading && !error && recipe && (
            <>
              {/* Name and creator */}
              <div className="mb-4 pr-8">
                <h2 className="text-xl font-bold">{recipe.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  von {recipe.creator.displayName}
                </p>
              </div>

              {/* Image */}
              {recipe.imageUrl && (
                <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg">
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 512px"
                    unoptimized
                  />
                </div>
              )}

              {/* Meta badges */}
              <div className="mb-4 flex flex-wrap gap-2">
                {recipe.category && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {recipe.category}
                  </span>
                )}
                {recipe.prepTime && (
                  <span className="rounded-full bg-background px-3 py-1 text-sm text-muted">
                    {recipe.prepTime} Min.
                  </span>
                )}
                {recipe.servings && (
                  <span className="rounded-full bg-background px-3 py-1 text-sm text-muted">
                    {recipe.servings} Portionen
                  </span>
                )}
              </div>

              {/* Tags */}
              {recipe.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Source URL */}
              {recipe.sourceUrl && (
                <div className="mb-4">
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Originalrezept
                  </a>
                </div>
              )}

              {/* Description */}
              {recipe.description && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold">Beschreibung</h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed">
                    {recipe.description}
                  </p>
                </div>
              )}

              {/* Ingredients */}
              {recipe.ingredients && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold">Zutaten</h3>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm leading-relaxed">
                      {recipe.ingredients
                        .split(/\n/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {recipe.instructions && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold">Zubereitung</h3>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {recipe.instructions}
                    </p>
                  </div>
                </div>
              )}

              {/* Link to full recipe page */}
              <div className="mt-4 text-center">
                <Link
                  href={`/rezepte/${recipeId}`}
                  className="text-sm text-primary hover:underline"
                >
                  Zum Rezept
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
