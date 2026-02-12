import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/ai/suggest — get recipe suggestions from Gemini
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "KI ist noch nicht konfiguriert (GEMINI_API_KEY fehlt in .env)" },
      { status: 503 },
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { message, mode } = await request.json();

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

  const systemPrompt = `Du bist ein freundlicher Kochassistent für eine Familie mit 4 Personen.
Du schlägst Rezepte vor und gibst Inspiration für die Wochenplanung.

Bestehende Rezepte der Familie:
${recipeList || "(noch keine)"}

Kürzlich gekochte Gerichte (letzte 2 Wochen):
${recentList || "(noch keine)"}

Regeln:
- Antworte immer auf Deutsch
- Schlage konkrete Gerichte mit kurzen Beschreibungen vor
- Berücksichtige die bestehenden Rezepte und die Historie (schlage nicht das gleiche vor was sie gerade erst hatten)
- Schlage typischerweise 3-5 Gerichte vor
- Sei kreativ aber familienfreundlich
- Antworte als JSON-Array mit diesen Feldern pro Rezept: name, description, ingredients (kommagetrennte Liste, z.B. "Lachs, Kartoffeln, Brokkoli"), time`;

  const userMessage =
    mode === "auto"
      ? "Schlage mir ein paar neue Gerichte für die nächste Woche vor, die wir noch nicht in unserer Sammlung haben und die wir in letzter Zeit nicht hatten. Berücksichtige Abwechslung bei den Kategorien."
      : message;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Fehler bei der KI-Anfrage" },
      { status: 500 },
    );
  }
}
