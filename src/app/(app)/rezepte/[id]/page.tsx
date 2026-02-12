import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { creator: { select: { displayName: true } } },
  });

  if (!recipe) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Rezepte", href: "/rezepte" },
          { label: recipe.name },
        ]}
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

      {/* Description */}
      {recipe.description && (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold">Beschreibung</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {recipe.description}
          </p>
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients && (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold">Zutaten</h3>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {recipe.ingredients}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
