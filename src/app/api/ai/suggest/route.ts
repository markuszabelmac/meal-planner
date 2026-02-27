import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "KI ist noch nicht konfiguriert (OPENAI_API_KEY fehlt in .env)" },
      { status: 503 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { message, mode, conversationId } = await request.json();

  // Fetch existing recipes for context
  const existingRecipes = await prisma.recipe.findMany({
    select: { name: true, category: true, tags: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Fetch recent meal plans for history
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentMeals = await prisma.mealPlan.findMany({
    where: { date: { gte: twoWeeksAgo } },
    include: { recipe: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 30,
  });

  const recipeList = existingRecipes
    .map((r) => `- ${r.name}${r.category ? ` (${r.category})` : ""}`)
    .join("\n");

  const recentList = recentMeals.map((m) => `- ${m.recipe.name}`).join("\n");

  // Fetch family preferences
  const preferences = await prisma.familyPreference.findMany();
  const prefMap: Record<string, string> = {};
  for (const p of preferences) {
    prefMap[p.key] = p.value;
  }

  // Fetch learning signals: which AI suggestions were saved as recipes
  const savedSuggestions = await prisma.aiMessage.findMany({
    where: {
      savedRecipeId: { not: null },
      conversation: { userId: session.user.id },
    },
    select: { content: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const systemPrompt = `Du bist ein freundlicher Kochassistent für eine Familie mit 4 Personen.
Du schlägst Rezepte vor und gibst Inspiration für die Wochenplanung.

Bestehende Rezepte der Familie:
${recipeList || "(noch keine)"}

Kürzlich gekochte Gerichte (letzte 2 Wochen):
${recentList || "(noch keine)"}

Familieneinstellungen:
${prefMap.dietary_restrictions ? `- Ernährungseinschränkungen: ${prefMap.dietary_restrictions}` : ""}
${prefMap.disliked_ingredients ? `- Unbeliebte Zutaten: ${prefMap.disliked_ingredients}` : ""}
${prefMap.cuisine_preferences ? `- Bevorzugte Küchen: ${prefMap.cuisine_preferences}` : ""}
${prefMap.general_notes ? `- Sonstiges: ${prefMap.general_notes}` : ""}

Lernhistorie (Vorschläge die die Familie übernommen hat):
${savedSuggestions.length > 0 ? savedSuggestions.map((s) => `- ${s.content.slice(0, 100)}`).join("\n") : "(noch keine)"}

Regeln:
- Antworte immer auf Deutsch
- Schlage konkrete Gerichte mit kurzen Beschreibungen vor
- Berücksichtige die bestehenden Rezepte und die Historie (schlage nicht das gleiche vor was sie gerade erst hatten)
- Schlage typischerweise 3-5 Gerichte vor
- Berücksichtige IMMER die Familieneinstellungen (Allergien, unbeliebte Zutaten, etc.)
- Sei kreativ aber familienfreundlich
- Antworte als JSON-Array mit diesen Feldern pro Rezept: name, description, ingredients (kommagetrennte Liste, z.B. "Lachs, Kartoffeln, Brokkoli"), time
- Deine Antwort MUSS ein JSON-Objekt mit einem "recipes" Feld sein, das ein Array enthält`;

  const userMessage =
    mode === "auto"
      ? "Schlage mir ein paar neue Gerichte für die nächste Woche vor, die wir noch nicht in unserer Sammlung haben und die wir in letzter Zeit nicht hatten. Berücksichtige Abwechslung bei den Kategorien."
      : message;

  // Build conversation history for OpenAI
  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (conversationId) {
    const history = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { role: true, content: true },
    });
    for (const msg of history) {
      chatMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  chatMessages.push({ role: "user", content: userMessage });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const text = response.choices[0]?.message?.content ?? "{}";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Fehler bei der KI-Anfrage" },
      { status: 500 },
    );
  }
}
