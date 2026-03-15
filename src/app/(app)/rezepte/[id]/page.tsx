import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { computeNutritionTotals } from "@/lib/nutrition";

export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      creator: { select: { displayName: true } },
      recipeIngredients: {
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              kcalPer100g: true,
              proteinPer100g: true,
              fatPer100g: true,
              carbsPer100g: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!recipe) notFound();

  const nutrition = computeNutritionTotals(
    recipe.recipeIngredients,
    recipe.servings
  );

  return (
    <div>
      <Breadcrumbs
        items={
          from === "planner"
            ? [
                { label: "Wochenplan", href: "/" },
                { label: recipe.name },
              ]
            : [
                { label: "Rezepte", href: "/rezepte" },
                { label: recipe.name },
              ]
        }
      />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{recipe.name}</h2>
          <p className="mt-1 text-sm text-muted">
            von {recipe.creator.displayName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/rezepte/${recipe.id}/bearbeiten`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            Bearbeiten
          </Link>
          <DeleteRecipeButton id={recipe.id} />
        </div>
      </div>

      {/* Image */}
      {recipe.imageUrl && (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={recipe.imageUrl}
            alt={recipe.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            unoptimized
          />
        </div>
      )}

      {/* Meta info */}
      <div className="mb-6 flex flex-wrap gap-3">
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
        <div className="mb-6 flex flex-wrap gap-1.5">
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
        <div className="mb-6">
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <div className="mb-6">
          <h3 className="mb-2 font-semibold">Beschreibung</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {recipe.description}
          </p>
        </div>
      )}

      {/* Nutrition table — only shown when computable structured ingredients exist */}
      {nutrition && (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold">Nahrwerte pro Portion</h3>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 text-muted">Kalorien</td>
                  <td className="px-4 py-2 text-right font-medium">{nutrition.kcal} kcal</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 text-muted">Protein</td>
                  <td className="px-4 py-2 text-right font-medium">{nutrition.protein} g</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 text-muted">Fett</td>
                  <td className="px-4 py-2 text-right font-medium">{nutrition.fat} g</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-muted">Kohlenhydrate</td>
                  <td className="px-4 py-2 text-right font-medium">{nutrition.carbs} g</td>
                </tr>
              </tbody>
            </table>
          </div>
          {nutrition.hasSkippedStueck && (
            <p className="mt-1 text-xs text-muted">
              * Zutaten mit Einheit &quot;Stück&quot; sind nicht eingerechnet.
            </p>
          )}
        </div>
      )}

      {/* Ingredients */}
      {recipe.recipeIngredients.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold">Zutaten</h3>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm leading-relaxed">
              {recipe.recipeIngredients
                .map((ri) => {
                  const name = ri.ingredient?.name ?? "Unbekannte Zutat";
                  return `${ri.amount} ${ri.unit} ${name}`;
                })
                .join(", ")}
            </p>
          </div>
        </div>
      ) : recipe.ingredients ? (
        <div className="mb-6">
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
      ) : null}

      {/* Instructions */}
      {recipe.instructions && (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold">Zubereitung</h3>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {recipe.instructions}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
