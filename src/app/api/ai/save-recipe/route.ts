import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/ai/save-recipe — save a structured recipe suggestion directly
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json();
  const recipeData = body.recipe || null;

  if (!recipeData?.name?.trim()) {
    return NextResponse.json(
      { error: "Rezeptname ist erforderlich" },
      { status: 400 },
    );
  }

  try {
    const recipe = await prisma.recipe.create({
      data: {
        name: recipeData.name,
        description: recipeData.description || null,
        ingredients: recipeData.ingredients || null,
        prepTime: recipeData.time ? parseInt(recipeData.time, 10) || null : null,
        servings: recipeData.servings || 4,
        category: recipeData.category || null,
        tags: recipeData.tags || [],
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Error saving recipe:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern des Rezepts" },
      { status: 500 },
    );
  }
}
