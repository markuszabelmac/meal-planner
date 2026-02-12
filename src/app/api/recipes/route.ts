import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/recipes — list all recipes with optional search
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  const recipes = await prisma.recipe.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { ingredients: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        category ? { category } : {},
      ],
    },
    include: {
      creator: { select: { displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(recipes);
}

// POST /api/recipes — create a new recipe
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, ingredients, prepTime, servings, category, tags } =
    body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Name ist erforderlich" },
      { status: 400 },
    );
  }

  const recipe = await prisma.recipe.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ingredients: ingredients?.trim() || null,
      prepTime: prepTime ? parseInt(prepTime) : null,
      servings: servings ? parseInt(servings) : null,
      category: category?.trim() || null,
      tags: tags || [],
      createdBy: session.user.id,
    },
    include: {
      creator: { select: { displayName: true } },
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
