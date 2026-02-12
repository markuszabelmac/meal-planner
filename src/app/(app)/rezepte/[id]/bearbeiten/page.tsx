import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });

  if (!recipe) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Rezepte", href: "/rezepte" },
          { label: recipe.name, href: `/rezepte/${recipe.id}` },
          { label: "Bearbeiten" },
        ]}
      />
      <h2 className="mb-6 text-2xl font-bold">Rezept bearbeiten</h2>
      <RecipeForm
        initial={{
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || "",
          ingredients: recipe.ingredients || "",
          prepTime: recipe.prepTime?.toString() || "",
          servings: recipe.servings?.toString() || "",
          category: recipe.category || "",
          tags: recipe.tags,
        }}
      />
    </div>
  );
}
