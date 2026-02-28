import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/meal-plans?from=2026-02-09&to=2026-02-15
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from und to Parameter erforderlich" },
      { status: 400 },
    );
  }

  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      date: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    include: {
      recipe: { select: { id: true, name: true, category: true } },
      forUser: { select: { id: true, displayName: true } },
      assigner: { select: { displayName: true } },
    },
    orderBy: [{ date: "asc" }],
  });

  return NextResponse.json(mealPlans);
}

// POST /api/meal-plans — assign a meal (recipe or custom text) for one or more users
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { date, recipeId, customMeal, forUserIds } = await request.json();

  if (!date || !forUserIds?.length) {
    return NextResponse.json(
      { error: "date und forUserIds erforderlich" },
      { status: 400 },
    );
  }

  if (!recipeId && !customMeal) {
    return NextResponse.json(
      { error: "recipeId oder customMeal erforderlich" },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    (forUserIds as string[]).map((forUserId) =>
      prisma.mealPlan.upsert({
        where: {
          date_forUserId: {
            date: new Date(date),
            forUserId,
          },
        },
        update: {
          recipeId: recipeId || null,
          customMeal: customMeal || null,
          assignedBy: session.user!.id!,
        },
        create: {
          date: new Date(date),
          recipeId: recipeId || null,
          customMeal: customMeal || null,
          forUserId,
          assignedBy: session.user!.id!,
        },
        include: {
          recipe: { select: { id: true, name: true, category: true } },
          forUser: { select: { id: true, displayName: true } },
          assigner: { select: { displayName: true } },
        },
      }),
    ),
  );

  return NextResponse.json(results, { status: 201 });
}

// PUT /api/meal-plans — update an existing entry (meal, date, persons)
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id, recipeId, customMeal, date, forUserIds, overwrite } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id erforderlich" }, { status: 400 });
  }

  if (!recipeId && !customMeal) {
    return NextResponse.json(
      { error: "recipeId oder customMeal erforderlich" },
      { status: 400 },
    );
  }

  const existing = await prisma.mealPlan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  const targetDate = date ? new Date(date) : existing.date;
  const targetUserIds: string[] = forUserIds?.length ? forUserIds : [existing.forUserId];

  // Check for conflicts at the target date for the target users
  const conflicts = await prisma.mealPlan.findMany({
    where: {
      date: targetDate,
      forUserId: { in: targetUserIds },
      id: { not: id },
    },
    include: {
      forUser: { select: { id: true, displayName: true } },
      recipe: { select: { name: true } },
    },
  });

  if (conflicts.length > 0 && !overwrite) {
    return NextResponse.json(
      {
        error: "conflict",
        conflicts: conflicts.map((c) => ({
          id: c.id,
          forUser: c.forUser,
          meal: c.recipe?.name ?? c.customMeal,
        })),
      },
      { status: 409 },
    );
  }

  // Delete conflicts if overwriting
  if (conflicts.length > 0) {
    await prisma.mealPlan.deleteMany({
      where: { id: { in: conflicts.map((c) => c.id) } },
    });
  }

  // Delete the original entry (we'll recreate for all target users)
  await prisma.mealPlan.delete({ where: { id } });

  // Create entries for all target users
  const results = await Promise.all(
    targetUserIds.map((forUserId) =>
      prisma.mealPlan.upsert({
        where: {
          date_forUserId: {
            date: targetDate,
            forUserId,
          },
        },
        update: {
          recipeId: recipeId || null,
          customMeal: customMeal || null,
          assignedBy: session.user!.id!,
        },
        create: {
          date: targetDate,
          recipeId: recipeId || null,
          customMeal: customMeal || null,
          forUserId,
          assignedBy: session.user!.id!,
        },
        include: {
          recipe: { select: { id: true, name: true, category: true } },
          forUser: { select: { id: true, displayName: true } },
          assigner: { select: { displayName: true } },
        },
      }),
    ),
  );

  return NextResponse.json(results);
}

// DELETE /api/meal-plans?id=xxx
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id Parameter erforderlich" },
      { status: 400 },
    );
  }

  await prisma.mealPlan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
