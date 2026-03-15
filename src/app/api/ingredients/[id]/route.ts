import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT /api/ingredients/[id] — update an ingredient
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });

  if (!ingredient) {
    return NextResponse.json(
      { error: "Zutat nicht gefunden" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const {
    name,
    nameEn,
    kcalPer100g,
    proteinPer100g,
    fatPer100g,
    satFatPer100g,
    carbsPer100g,
    sugarPer100g,
    fiberPer100g,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Name ist erforderlich" },
      { status: 400 },
    );
  }

  if (typeof kcalPer100g !== "number" || kcalPer100g < 0) {
    return NextResponse.json(
      { error: "Kalorien müssen eine positive Zahl sein" },
      { status: 400 },
    );
  }

  const updated = await prisma.ingredient.update({
    where: { id },
    data: {
      name: name.trim(),
      nameEn: nameEn?.trim() || null,
      kcalPer100g,
      proteinPer100g: proteinPer100g ?? null,
      fatPer100g: fatPer100g ?? null,
      satFatPer100g: satFatPer100g ?? null,
      carbsPer100g: carbsPer100g ?? null,
      sugarPer100g: sugarPer100g ?? null,
      fiberPer100g: fiberPer100g ?? null,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/ingredients/[id] — delete a custom ingredient
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });

  if (!ingredient) {
    return NextResponse.json(
      { error: "Zutat nicht gefunden" },
      { status: 404 },
    );
  }

  if (!ingredient.isCustom) {
    return NextResponse.json(
      { error: "USDA-Zutaten koennen nicht geloescht werden" },
      { status: 403 },
    );
  }

  const count = await prisma.recipeIngredient.count({
    where: { ingredientId: id },
  });

  await prisma.ingredient.delete({ where: { id } });

  return NextResponse.json({ success: true, detachedRecipes: count });
}
