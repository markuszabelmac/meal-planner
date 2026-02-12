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
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });

  return NextResponse.json(mealPlans);
}

// POST /api/meal-plans — assign a recipe for one or more users
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { date, mealType, recipeId, forUserIds } = await request.json();

  if (!date || !mealType || !recipeId || !forUserIds?.length) {
    return NextResponse.json(
      { error: "date, mealType, recipeId und forUserIds erforderlich" },
      { status: 400 },
    );
  }

  if (!["lunch", "dinner"].includes(mealType)) {
    return NextResponse.json(
      { error: "mealType muss 'lunch' oder 'dinner' sein" },
      { status: 400 },
    );
  }

  // Upsert for each selected user
  const results = await Promise.all(
    (forUserIds as string[]).map((forUserId) =>
      prisma.mealPlan.upsert({
        where: {
          date_mealType_forUserId: {
            date: new Date(date),
            mealType,
            forUserId,
          },
        },
        update: {
          recipeId,
          assignedBy: session.user!.id!,
        },
        create: {
          date: new Date(date),
          mealType,
          recipeId,
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

// DELETE /api/meal-plans?date=2026-02-10&mealType=lunch&forUserId=xxx
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const mealType = searchParams.get("mealType");
  const forUserId = searchParams.get("forUserId");

  if (!date || !mealType || !forUserId) {
    return NextResponse.json(
      { error: "date, mealType und forUserId Parameter erforderlich" },
      { status: 400 },
    );
  }

  await prisma.mealPlan.delete({
    where: {
      date_mealType_forUserId: {
        date: new Date(date),
        mealType,
        forUserId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
