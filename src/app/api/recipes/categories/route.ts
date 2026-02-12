import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/recipes/categories — list all used categories
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const results = await prisma.recipe.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const categories = results
    .map((r) => r.category)
    .filter((c): c is string => c !== null);

  return NextResponse.json(categories);
}
