import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/conversations — list user's conversations
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { content: true, role: true },
      },
    },
  });

  return NextResponse.json(conversations);
}

// POST /api/conversations — create new conversation
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const conversation = await prisma.aiConversation.create({
    data: { userId: session.user.id },
  });

  return NextResponse.json(conversation, { status: 201 });
}
