import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/ai/save-recipe — parse a recipe suggestion and save it
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "KI ist noch nicht konfiguriert" },
      { status: 503 },
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { text } = await request.json();

  if (!text?.trim()) {
    return NextResponse.json(
      { error: "Kein Rezepttext angegeben" },
      { status: 400 },
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Extrahiere aus dem folgenden Text die Rezeptdaten:\n\n${text}`,
      config: {
        systemInstruction: `Extrahiere aus dem folgenden Text die Rezeptdaten und gib sie als JSON zurück.
Das JSON muss genau dieses Format haben:
{
  "name": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": "Zutat 1\\nZutat 2\\nZutat 3",
  "prepTime": 30,
  "servings": 4,
  "category": "Kategorie",
  "tags": ["tag1", "tag2"]
}

Antworte NUR mit dem JSON, kein anderer Text. Kein Markdown-Codeblock, nur reines JSON.
Verwende für die Kategorie eine von: Pasta, Fleisch, Fisch, Vegetarisch, Vegan, Suppe, Salat, Auflauf, Asiatisch, Schnell & Einfach.
Falls die Zubereitungszeit nicht genannt wird, schätze sie.
Portionen standardmäßig auf 4.`,
        maxOutputTokens: 1000,
      },
    });

    let jsonText = response.text ?? "";
    // Strip markdown code fences if present
    jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const recipeData = JSON.parse(jsonText);

    const recipe = await prisma.recipe.create({
      data: {
        name: recipeData.name,
        description: recipeData.description || null,
        ingredients: recipeData.ingredients || null,
        prepTime: recipeData.prepTime || null,
        servings: recipeData.servings || 4,
        category: recipeData.category || null,
        tags: recipeData.tags || [],
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Error saving recipe:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern des Rezepts" },
      { status: 500 },
    );
  }
}
