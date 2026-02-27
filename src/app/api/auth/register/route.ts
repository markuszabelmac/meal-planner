import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { email, password, displayName } = await request.json();

  if (!email || !password || !displayName) {
    return NextResponse.json(
      { error: "Alle Felder sind erforderlich" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen lang sein" },
      { status: 400 },
    );
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "E-Mail ist bereits registriert" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, displayName },
  });

  return NextResponse.json(
    { id: user.id, email: user.email, displayName: user.displayName },
    { status: 201 },
  );
}
