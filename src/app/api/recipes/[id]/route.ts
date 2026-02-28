import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    include: { creator: { select: { displayName: true } } },
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
  const { name, description, ingredients, instructions, imageUrl, prepTime, servings, category, tags } =
    body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Name ist erforderlich" },
      { status: 400 },
    );
  }

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ingredients: ingredients?.trim() || null,
      instructions: instructions?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      prepTime: prepTime ? parseInt(prepTime) : null,
      servings: servings ? parseInt(servings) : null,
      category: category?.trim() || null,
      tags: tags || [],
    },
    include: { creator: { select: { displayName: true } } },
  });

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
