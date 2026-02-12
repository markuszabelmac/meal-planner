import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/users — list all family members
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, displayName: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}
