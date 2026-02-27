import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/preferences — fetch current user's preferences
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const preferences = await prisma.userPreference.findMany({
    where: { userId: session.user.id },
  });
  const result: Record<string, string> = {};
  for (const pref of preferences) {
    result[pref.key] = pref.value;
  }

  return NextResponse.json(result);
}

// PUT /api/preferences — upsert current user's preferences
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body: Record<string, string> = await request.json();

  for (const [key, value] of Object.entries(body)) {
    await prisma.userPreference.upsert({
      where: { userId_key: { userId: session.user.id, key } },
      update: { value },
      create: { userId: session.user.id, key, value },
    });
  }

  return NextResponse.json({ ok: true });
}
