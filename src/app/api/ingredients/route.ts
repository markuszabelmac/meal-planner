import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

// GET /api/ingredients — list all or fuzzy-search ingredients
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  if (search.length >= 2) {
    const ingredients = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        nameEn: string | null;
        kcalPer100g: number;
        proteinPer100g: number | null;
        fatPer100g: number | null;
        satFatPer100g: number | null;
        carbsPer100g: number | null;
        sugarPer100g: number | null;
        fiberPer100g: number | null;
        isCustom: boolean;
      }[]
    >(Prisma.sql`
      SELECT
        id,
        name,
        name_en AS "nameEn",
        kcal_per_100g AS "kcalPer100g",
        protein_per_100g AS "proteinPer100g",
        fat_per_100g AS "fatPer100g",
        sat_fat_per_100g AS "satFatPer100g",
        carbs_per_100g AS "carbsPer100g",
        sugar_per_100g AS "sugarPer100g",
        fiber_per_100g AS "fiberPer100g",
        is_custom AS "isCustom"
      FROM ingredients
      WHERE name % ${search} OR name_en % ${search} OR name ILIKE ${"%" + search + "%"}
      ORDER BY GREATEST(similarity(name, ${search}), similarity(COALESCE(name_en, ''), ${search})) DESC
      LIMIT 50
    `);

    return NextResponse.json(ingredients);
  }

  const ingredients = await prisma.ingredient.findMany({
    orderBy: [{ isCustom: "desc" }, { name: "asc" }],
    take: 100,
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

  return NextResponse.json(ingredients);
}

// POST /api/ingredients — create a new custom ingredient
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
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

  const ingredient = await prisma.ingredient.create({
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
      isCustom: true,
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
