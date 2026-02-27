import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/conversations/:id/messages/:messageId — update saved recipe link
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const { savedRecipeId } = await request.json();

  // Verify ownership
  const conversation = await prisma.aiConversation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const updated = await prisma.aiMessage.update({
    where: { id: messageId, conversationId: id },
    data: { savedRecipeId },
  });

  return NextResponse.json(updated);
}
