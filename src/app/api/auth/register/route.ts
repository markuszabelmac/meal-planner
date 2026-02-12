import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  return NextResponse.json(
    { error: "Registrierung ist deaktiviert" },
    { status: 403 },
  );

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

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Diese E-Mail-Adresse ist bereits registriert" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { email, passwordHash, displayName },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
