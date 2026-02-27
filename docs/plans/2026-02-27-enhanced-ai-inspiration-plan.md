# Enhanced AI Inspiration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace broken Gemini AI with OpenAI, add family preferences, persistent conversations with learning, and direct recipe saving.

**Architecture:** OpenAI Chat Completions API (gpt-4o-mini) with JSON mode. New Prisma models for preferences and conversation history. Learning via prompt injection of save/ignore signals. Direct structured recipe saving without second AI call.

**Tech Stack:** OpenAI SDK, Prisma (PostgreSQL), Next.js API routes, React client components

---

### Task 1: Swap Gemini SDK for OpenAI SDK

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `.env.example` (env var name)

**Step 1: Install OpenAI SDK and remove Gemini**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner
npm install openai
npm uninstall @google/genai
```

**Step 2: Update `.env.example`**

Replace the Gemini section with:
```
# OpenAI API
# Get API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=
```

Remove the `GEMINI_API_KEY` line.

**Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: swap @google/genai for openai SDK"
```

---

### Task 2: Rewrite suggest API route for OpenAI

**Files:**
- Modify: `src/app/api/ai/suggest/route.ts`

**Step 1: Rewrite the route**

Replace the entire file content with:

```typescript
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
- Antworte als JSON-Array mit diesen Feldern pro Rezept: name, description, ingredients (kommagetrennte Liste, z.B. "Lachs, Kartoffeln, Brokkoli"), time
- Deine Antwort MUSS ein JSON-Objekt mit einem "recipes" Feld sein, das ein Array enthält`;

  const userMessage =
    mode === "auto"
      ? "Schlage mir ein paar neue Gerichte für die nächste Woche vor, die wir noch nicht in unserer Sammlung haben und die wir in letzter Zeit nicht hatten. Berücksichtige Abwechslung bei den Kategorien."
      : message;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
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
```

**Step 2: Verify the app builds**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

Expected: Build succeeds (may show warnings but no errors in the suggest route).

**Step 3: Commit**

```bash
git add src/app/api/ai/suggest/route.ts
git commit -m "feat: rewrite suggest route to use OpenAI gpt-4o-mini"
```

---

### Task 3: Rewrite save-recipe route (direct save, no AI call)

**Files:**
- Modify: `src/app/api/ai/save-recipe/route.ts`

**Step 1: Rewrite to accept structured data directly**

Replace the entire file content with:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/ai/save-recipe — save a structured recipe suggestion directly
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json();

  // Accept either { recipe: {...} } (new structured format) or { text: "..." } (legacy)
  const recipeData = body.recipe || null;

  if (!recipeData?.name?.trim()) {
    return NextResponse.json(
      { error: "Rezeptname ist erforderlich" },
      { status: 400 },
    );
  }

  try {
    const recipe = await prisma.recipe.create({
      data: {
        name: recipeData.name,
        description: recipeData.description || null,
        ingredients: recipeData.ingredients || null,
        prepTime: recipeData.time ? parseInt(recipeData.time, 10) || null : null,
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
```

**Step 2: Update the frontend to send structured data**

In `src/app/(app)/inspiration/page.tsx`, update the `saveAsRecipe` function. Replace:

```typescript
  async function saveAsRecipe(recipe: Recipe) {
    const text = `**${recipe.name}**\n${recipe.description}\nZutaten: ${recipe.ingredients}\nZubereitungszeit: ${recipe.time}`;
    setSavingRecipe(recipe.name);

    const res = await fetch("/api/ai/save-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
```

With:

```typescript
  async function saveAsRecipe(recipe: Recipe) {
    setSavingRecipe(recipe.name);

    const res = await fetch("/api/ai/save-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe }),
    });
```

**Step 3: Update `parseRecipes` to handle the new JSON wrapper**

The AI now returns `{ "recipes": [...] }` instead of a bare array. In `src/app/(app)/inspiration/page.tsx`, replace the `parseRecipes` function:

```typescript
function parseRecipes(content: string): Recipe[] | null {
  try {
    const parsed = JSON.parse(content);
    // Handle { recipes: [...] } wrapper from JSON mode
    const arr = Array.isArray(parsed) ? parsed : parsed.recipes;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    if (!arr[0].name) return null;
    return arr;
  } catch {
    return null;
  }
}
```

**Step 4: Verify build**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

**Step 5: Commit**

```bash
git add src/app/api/ai/save-recipe/route.ts src/app/\(app\)/inspiration/page.tsx
git commit -m "feat: direct recipe saving from structured JSON, remove second AI call"
```

---

### Task 4: Add FamilyPreference model and migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the FamilyPreference model to schema**

Append to `prisma/schema.prisma` after the MealPlan model:

```prisma
model FamilyPreference {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("family_preferences")
}
```

**Step 2: Generate migration**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npx prisma migrate dev --name add_family_preferences
```

Expected: Migration created and applied successfully.

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/
git commit -m "feat: add FamilyPreference model for dietary preferences"
```

---

### Task 5: Add AiConversation and AiMessage models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add conversation models to schema**

Append to `prisma/schema.prisma`:

```prisma
model AiConversation {
  id        String      @id @default(cuid())
  userId    String      @map("user_id")
  user      User        @relation(fields: [userId], references: [id])
  messages  AiMessage[]
  createdAt DateTime    @default(now()) @map("created_at")
  updatedAt DateTime    @updatedAt @map("updated_at")

  @@map("ai_conversations")
}

model AiMessage {
  id             String         @id @default(cuid())
  conversationId String         @map("conversation_id")
  conversation   AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String
  content        String
  savedRecipeId  String?        @map("saved_recipe_id")
  createdAt      DateTime       @default(now()) @map("created_at")

  @@map("ai_messages")
}
```

**Step 2: Add the relation to User model**

In the `User` model in `prisma/schema.prisma`, add this line after `meals`:

```prisma
  aiConversations AiConversation[]
```

**Step 3: Generate migration**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npx prisma migrate dev --name add_ai_conversations
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/
git commit -m "feat: add AiConversation and AiMessage models for chat history"
```

---

### Task 6: Build family preferences API

**Files:**
- Create: `src/app/api/preferences/route.ts`

**Step 1: Create the preferences API route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/preferences — fetch all family preferences
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const preferences = await prisma.familyPreference.findMany();
  const result: Record<string, string> = {};
  for (const pref of preferences) {
    result[pref.key] = pref.value;
  }

  return NextResponse.json(result);
}

// PUT /api/preferences — upsert family preferences
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body: Record<string, string> = await request.json();

  for (const [key, value] of Object.entries(body)) {
    await prisma.familyPreference.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 2: Verify build**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/preferences/route.ts
git commit -m "feat: add family preferences API (GET/PUT)"
```

---

### Task 7: Build family preferences UI

**Files:**
- Create: `src/app/(app)/familie/einstellungen/page.tsx`

**Step 1: Create preferences settings page**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PREFERENCE_FIELDS = [
  {
    key: "dietary_restrictions",
    label: "Ernährungseinschränkungen",
    placeholder: "z.B. Laktoseintoleranz, keine Nüsse, freitags vegetarisch",
  },
  {
    key: "disliked_ingredients",
    label: "Unbeliebte Zutaten",
    placeholder: "z.B. Oliven, Pilze, Rosenkohl",
  },
  {
    key: "cuisine_preferences",
    label: "Bevorzugte Küchen",
    placeholder: "z.B. Italienisch, Asiatisch, Deutsch",
  },
  {
    key: "general_notes",
    label: "Sonstiges",
    placeholder: "z.B. Wir haben einen Thermomix, Kinder mögen es mild",
  },
];

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(setPrefs);
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/familie" className="hover:text-foreground">
          Familie
        </Link>
        <span>/</span>
        <span>Einstellungen</span>
      </div>

      <h2 className="mb-4 text-2xl font-bold">Familieneinstellungen</h2>
      <p className="mb-6 text-sm text-muted">
        Diese Informationen werden bei jeder KI-Anfrage berücksichtigt.
      </p>

      <div className="space-y-4">
        {PREFERENCE_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-sm font-medium">
              {field.label}
            </label>
            <textarea
              value={prefs[field.key] || ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {saving ? "Speichern..." : saved ? "Gespeichert!" : "Speichern"}
      </button>
    </div>
  );
}
```

**Step 2: Add a link to the preferences page from the Familie page**

Read the Familie page first to understand its structure, then add a link/button to `/familie/einstellungen`.

**Step 3: Verify build**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

**Step 4: Commit**

```bash
git add "src/app/(app)/familie/einstellungen/page.tsx" "src/app/(app)/familie/page.tsx"
git commit -m "feat: add family preferences settings page"
```

---

### Task 8: Inject preferences into AI system prompt

**Files:**
- Modify: `src/app/api/ai/suggest/route.ts`

**Step 1: Fetch preferences and add to system prompt**

After the existing recipe/mealplan queries (around line 30), add:

```typescript
  // Fetch family preferences
  const preferences = await prisma.familyPreference.findMany();
  const prefMap: Record<string, string> = {};
  for (const p of preferences) {
    prefMap[p.key] = p.value;
  }
```

Then add this section to the system prompt string, before the "Regeln:" section:

```
Familieneinstellungen:
${prefMap.dietary_restrictions ? `- Ernährungseinschränkungen: ${prefMap.dietary_restrictions}` : ""}
${prefMap.disliked_ingredients ? `- Unbeliebte Zutaten: ${prefMap.disliked_ingredients}` : ""}
${prefMap.cuisine_preferences ? `- Bevorzugte Küchen: ${prefMap.cuisine_preferences}` : ""}
${prefMap.general_notes ? `- Sonstiges: ${prefMap.general_notes}` : ""}
```

And add to the rules section:
```
- Berücksichtige IMMER die Familieneinstellungen (Allergien, unbeliebte Zutaten, etc.)
```

**Step 2: Verify build**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/ai/suggest/route.ts
git commit -m "feat: inject family preferences into AI system prompt"
```

---

### Task 9: Build conversation persistence API

**Files:**
- Create: `src/app/api/conversations/route.ts`
- Create: `src/app/api/conversations/[id]/route.ts`
- Create: `src/app/api/conversations/[id]/messages/route.ts`

**Step 1: Create conversations list endpoint**

`src/app/api/conversations/route.ts`:

```typescript
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
```

**Step 2: Create single conversation endpoint**

`src/app/api/conversations/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/conversations/:id — get conversation with messages
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.aiConversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

// DELETE /api/conversations/:id — delete a conversation
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.aiConversation.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
```

**Step 3: Create messages endpoint**

`src/app/api/conversations/[id]/messages/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/conversations/:id/messages — add a message to a conversation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const { role, content } = await request.json();

  // Verify the conversation belongs to the user
  const conversation = await prisma.aiConversation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const message = await prisma.aiMessage.create({
    data: { conversationId: id, role, content },
  });

  // Touch the conversation's updatedAt
  await prisma.aiConversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(message, { status: 201 });
}
```

**Step 4: Verify build**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

**Step 5: Commit**

```bash
git add src/app/api/conversations/
git commit -m "feat: add conversation persistence API (CRUD + messages)"
```

---

### Task 10: Add learning signals to AI prompt

**Files:**
- Modify: `src/app/api/ai/suggest/route.ts`

**Step 1: Query saved vs ignored suggestions**

After the preferences query, add:

```typescript
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
```

Add to the system prompt, before the rules:

```
Lernhistorie (Vorschläge die die Familie übernommen hat):
${savedSuggestions.length > 0 ? savedSuggestions.map((s) => `- ${s.content.slice(0, 100)}`).join("\n") : "(noch keine)"}
```

**Step 2: Verify build**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/ai/suggest/route.ts
git commit -m "feat: inject learning signals (saved suggestions) into AI prompt"
```

---

### Task 11: Rewrite Inspiration page with conversation support

**Files:**
- Modify: `src/app/(app)/inspiration/page.tsx`

**Step 1: Rewrite the Inspiration page**

This is a full rewrite of the page to support:
- Listing previous conversations
- Creating new conversations
- Continuing old conversations
- Persistent message storage
- Sending conversation context to suggest API
- Linking saved recipes to messages

Replace the entire file with the new implementation that:

1. On load, fetches conversations list from `GET /api/conversations`
2. Shows a conversation list sidebar/header with "Neue Unterhaltung" button
3. When a conversation is selected, loads messages from `GET /api/conversations/:id`
4. When sending a message:
   - Creates a conversation if none is active (`POST /api/conversations`)
   - Stores user message (`POST /api/conversations/:id/messages`)
   - Calls `POST /api/ai/suggest` with `{ message, mode, conversationId }`
   - Stores assistant response (`POST /api/conversations/:id/messages`)
5. When saving a recipe:
   - Calls `POST /api/ai/save-recipe` with structured `{ recipe }` data
   - Updates the message's `savedRecipeId` to link it to the saved recipe
6. Keeps the existing quick-prompt buttons and UI styling

Key UI structure:
- Top: conversation list (horizontal scrollable chips or dropdown)
- Middle: messages area (same chat bubble design)
- Bottom: input bar (same as current)

**Step 2: Update the suggest route to accept conversationId**

In `src/app/api/ai/suggest/route.ts`, accept an optional `conversationId` in the request body. If provided, load the last 10 messages from that conversation and include them as chat history in the OpenAI messages array (before the current user message).

**Step 3: Add a PATCH endpoint to mark message as saved**

Create `src/app/api/conversations/[id]/messages/[messageId]/route.ts`:

```typescript
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
    where: { id: messageId },
    data: { savedRecipeId },
  });

  return NextResponse.json(updated);
}
```

**Step 4: Verify build**

Run:
```bash
cd /Users/markuszabel/Development/meal-planner && npm run build
```

**Step 5: Commit**

```bash
git add "src/app/(app)/inspiration/page.tsx" src/app/api/ai/suggest/route.ts src/app/api/conversations/
git commit -m "feat: rewrite inspiration page with conversation persistence and learning"
```

---

### Task 12: Update environment and cleanup

**Files:**
- Modify: `.env` (local — do NOT commit)
- Modify: `src/app/(app)/inspiration/page.tsx` (if any UI polish needed)

**Step 1: Add OPENAI_API_KEY to local .env**

The developer must add their OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-...
```

And remove the old `GEMINI_API_KEY` line.

**Step 2: Manual smoke test**

1. Start dev server: `npm run dev`
2. Log in to the app
3. Go to Inspiration page
4. Click "Automatische Vorschläge" — should get recipe suggestions
5. Click "Übernehmen" on a recipe — should save to recipe database
6. Start a new conversation, send a custom message
7. Go to Familie > Einstellungen, add a dietary restriction
8. Go back to Inspiration, ask for suggestions — should respect the restriction
9. Reload the page — previous conversations should appear

**Step 3: Final commit**

```bash
git add .env.example
git commit -m "chore: final cleanup and env updates for OpenAI migration"
```

---

## Task Dependency Summary

```
Task 1 (SDK swap)
  └→ Task 2 (suggest route)
  └→ Task 3 (save-recipe route + frontend)
Task 4 (preferences model)
  └→ Task 6 (preferences API)
    └→ Task 7 (preferences UI)
    └→ Task 8 (inject prefs into prompt)
Task 5 (conversation models)
  └→ Task 9 (conversation API)
    └→ Task 10 (learning signals)
    └→ Task 11 (inspiration page rewrite)
Task 12 (cleanup) — depends on all above
```

Tasks 1-3 can run before Tasks 4-5. Tasks 4 and 5 can run in parallel. Tasks 6-8 and 9-11 can run in parallel (different feature tracks).
