import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Unit } from "@/generated/prisma/client";

type StructuredIngredientPayload = {
  ingredientId: string | null;
  amount: number;
  unit: string;
};

const ingredientInclude = {
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
};

// GET /api/recipes/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      creator: { select: { displayName: true } },
      recipeIngredients: {
        include: ingredientInclude,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!recipe) {
    return NextResponse.json(
      { error: "Rezept nicht gefunden" },
      { status: 404 },
    );
  }

  return NextResponse.json(recipe);
}

// PUT /api/recipes/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    name,
    description,
    ingredients,
    instructions,
    imageUrl,
    prepTime,
    servings,
    category,
    tags,
    recipeIngredients,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Name ist erforderlich" },
      { status: 400 },
    );
  }

  const recipeData = {
    name: name.trim(),
    description: description?.trim() || null,
    ingredients: ingredients?.trim() || null,
    instructions: instructions?.trim() || null,
    imageUrl: imageUrl?.trim() || null,
    prepTime: prepTime ? parseInt(prepTime) : null,
    servings: servings ? parseInt(servings) : null,
    category: category?.trim() || null,
    tags: tags || [],
  };

  let recipe;

  if (Array.isArray(recipeIngredients)) {
    const validRows = recipeIngredients.filter(
      (row: StructuredIngredientPayload) =>
        row.ingredientId &&
        typeof row.amount === "number" &&
        !isNaN(row.amount),
    );

    [, recipe] = await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
      prisma.recipe.update({
        where: { id },
        data: {
          ...recipeData,
          recipeIngredients: {
            create: validRows.map((row: StructuredIngredientPayload) => ({
              ingredientId: row.ingredientId,
              amount: row.amount,
              unit: row.unit as Unit,
            })),
          },
        },
        include: {
          creator: { select: { displayName: true } },
          recipeIngredients: {
            include: ingredientInclude,
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ]);
  } else {
    recipe = await prisma.recipe.update({
      where: { id },
      data: recipeData,
      include: {
        creator: { select: { displayName: true } },
        recipeIngredients: {
          include: ingredientInclude,
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  return NextResponse.json(recipe);
}

// DELETE /api/recipes/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.recipe.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
