import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";

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

  const { name } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Bitte einen Namen angeben" },
      { status: 400 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Du bist ein Ernaehrungsexperte. Schaetze die Naehrwerte pro 100g fuer die angegebene Zutat. Antworte als JSON mit diesen Feldern: kcalPer100g (number), proteinPer100g (number), fatPer100g (number), satFatPer100g (number), carbsPer100g (number), sugarPer100g (number), fiberPer100g (number). Alle Werte in Gramm ausser kcal. Gib realistische Durchschnittswerte.",
        },
        {
          role: "user",
          content: name.trim(),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(text) as Record<string, unknown>;

    const requiredFields = [
      "kcalPer100g",
      "proteinPer100g",
      "fatPer100g",
      "satFatPer100g",
      "carbsPer100g",
      "sugarPer100g",
      "fiberPer100g",
    ];

    for (const field of requiredFields) {
      if (typeof data[field] !== "number") {
        return NextResponse.json(
          { error: "Ungueltige Antwort vom KI-Modell" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      kcalPer100g: data.kcalPer100g,
      proteinPer100g: data.proteinPer100g,
      fatPer100g: data.fatPer100g,
      satFatPer100g: data.satFatPer100g,
      carbsPer100g: data.carbsPer100g,
      sugarPer100g: data.sugarPer100g,
      fiberPer100g: data.fiberPer100g,
    });
  } catch (error) {
    console.error("[Nutrition Estimate] OpenAI API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Fehler bei der KI-Anfrage: ${errorMessage}` },
      { status: 500 },
    );
  }
}
