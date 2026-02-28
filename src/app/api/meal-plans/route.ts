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

// PUT /api/meal-plans — update an existing entry
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id, recipeId, customMeal } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id erforderlich" }, { status: 400 });
  }

  if (!recipeId && !customMeal) {
    return NextResponse.json(
      { error: "recipeId oder customMeal erforderlich" },
      { status: 400 },
    );
  }

  const updated = await prisma.mealPlan.update({
    where: { id },
    data: {
      recipeId: recipeId || null,
      customMeal: customMeal || null,
      assignedBy: session.user!.id!,
    },
    include: {
      recipe: { select: { id: true, name: true, category: true } },
      forUser: { select: { id: true, displayName: true } },
      assigner: { select: { displayName: true } },
    },
  });

  return NextResponse.json(updated);
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
