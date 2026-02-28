import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// PUT /api/users/:id — update a user's profile
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const { displayName, email, password } = await request.json();

  if (!displayName && !email && !password) {
    return NextResponse.json(
      { error: "Mindestens ein Feld erforderlich" },
      { status: 400 },
    );
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  // Check email uniqueness if changing email
  if (email && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json(
        { error: "E-Mail wird bereits verwendet" },
        { status: 409 },
      );
    }
  }

  const data: Record<string, string> = {};
  if (displayName) data.displayName = displayName;
  if (email) data.email = email;
  if (password) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Passwort muss mindestens 6 Zeichen haben" },
        { status: 400 },
      );
    }
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, displayName: true, email: true },
  });

  return NextResponse.json(updated);
}
