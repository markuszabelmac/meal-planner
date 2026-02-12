import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/recipes/import-url — import a recipe from a URL
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

  const { url } = await request.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: "Keine URL angegeben" }, { status: 400 });
  }

  try {
    // Fetch the webpage
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MealPlanner/1.0)" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Seite nicht erreichbar (${res.status})` },
        { status: 400 },
      );
    }

    const html = await res.text();

    // Extract text content (strip HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000); // Limit to 5000 chars for AI

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Extrahiere das Rezept aus diesem Webseitentext:\n\n${textContent}`,
      config: {
        systemInstruction: `Extrahiere aus dem folgenden Webseitentext die Rezeptdaten und gib sie als JSON zurück.
Das JSON muss genau dieses Format haben:
{
  "name": "Rezeptname",
  "description": "Kurze Beschreibung in 1-2 Sätzen",
  "ingredients": "Zutat 1, Zutat 2, Zutat 3",
  "prepTime": 30,
  "servings": 4,
  "category": "Kategorie",
  "tags": ["tag1", "tag2"]
}

Regeln:
- Antworte NUR mit dem JSON, kein anderer Text
- Zutaten als kommagetrennte Liste
- Verwende für die Kategorie eine von: Pasta, Fleisch, Fisch, Vegetarisch, Vegan, Suppe, Salat, Auflauf, Asiatisch, Schnell & Einfach
- Falls die Zubereitungszeit nicht genannt wird, schätze sie
- Portionen standardmäßig auf 4`,
        responseMimeType: "application/json",
        maxOutputTokens: 1000,
      },
    });

    const jsonText = response.text ?? "";
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

    return NextResponse.json(
      { id: recipe.id, name: recipe.name },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error importing recipe from URL:", error);
    return NextResponse.json(
      { error: "Fehler beim Importieren des Rezepts" },
      { status: 500 },
    );
  }
}
