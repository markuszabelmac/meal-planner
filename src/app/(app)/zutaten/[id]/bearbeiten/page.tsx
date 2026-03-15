import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { IngredientForm } from "@/components/ingredient-form";
import { DeleteIngredientButton } from "@/components/delete-ingredient-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function BearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nameEn: true,
      kcalPer100g: true,
      proteinPer100g: true,
      fatPer100g: true,
      satFatPer100g: true,
      carbsPer100g: true,
      sugarPer100g: true,
      fiberPer100g: true,
      isCustom: true,
    },
  });

  if (!ingredient) {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Zutaten", href: "/zutaten" },
          { label: `${ingredient.name} bearbeiten` },
        ]}
      />
      <h2 className="mb-6 text-2xl font-bold">{ingredient.name} bearbeiten</h2>
      <IngredientForm
        initial={{
          id: ingredient.id,
          name: ingredient.name,
          nameEn: ingredient.nameEn ?? "",
          kcalPer100g: ingredient.kcalPer100g,
          proteinPer100g: ingredient.proteinPer100g ?? "",
          fatPer100g: ingredient.fatPer100g ?? "",
          satFatPer100g: ingredient.satFatPer100g ?? "",
          carbsPer100g: ingredient.carbsPer100g ?? "",
          sugarPer100g: ingredient.sugarPer100g ?? "",
          fiberPer100g: ingredient.fiberPer100g ?? "",
        }}
      />
      <div className="mt-6 border-t border-border pt-6">
        <DeleteIngredientButton id={ingredient.id} isCustom={ingredient.isCustom} />
      </div>
    </div>
  );
}
