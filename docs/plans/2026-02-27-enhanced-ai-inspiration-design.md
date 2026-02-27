# Enhanced AI Inspiration Design

## Summary

Replace the broken Gemini integration with OpenAI API (gpt-4o-mini), add family preferences, persistent conversation history with learning, and direct recipe saving from structured AI responses.

## Context

The AI Inspiration feature was built with Google Gemini but never worked (API key quota exhausted). This redesign fixes the provider issue and adds three enhancements that make the feature genuinely useful for family meal planning.

## Design

### 1. Provider Swap: Gemini to OpenAI

- Replace `@google/genai` with `openai` SDK
- Use `gpt-4o-mini` model (fast, cheap, sufficient for recipe tasks)
- Env var: `OPENAI_API_KEY` replaces `GEMINI_API_KEY`
- Use Chat Completions API with `response_format: { type: "json_object" }`
- Affects: `src/app/api/ai/suggest/route.ts`, `src/app/api/ai/save-recipe/route.ts`

### 2. Family Preferences

New Prisma model to store dietary and taste preferences:

```prisma
model FamilyPreference {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

Preference keys:
- `dietary_restrictions` — allergies, vegetarian days, etc.
- `disliked_ingredients` — things family members won't eat
- `cuisine_preferences` — preferred cuisines
- `general_notes` — freeform notes ("We use a Thermomix", "Kids prefer mild")

UI: Settings section accessible from the Inspiration page or Familie page. Preferences are injected into every AI system prompt.

### 3. Conversation History & Learning

New Prisma models for persistent conversations:

```prisma
model AiConversation {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  messages  AiMessage[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}

model AiMessage {
  id             String         @id @default(cuid())
  conversationId String
  conversation   AiConversation @relation(fields: [conversationId], references: [id])
  role           String
  content        String
  savedRecipeId  String?
  createdAt      DateTime       @default(now())
}
```

Learning mechanism:
- When user saves a suggestion as a recipe, link `AiMessage.savedRecipeId` to the `Recipe`
- System prompt includes: "Previously saved suggestions: [list]. Previously ignored: [list]."
- AI uses this signal to understand family preferences over time

Conversation UX:
- List previous conversations on Inspiration page
- Continue old conversations or start new ones
- Send last ~10 messages as chat context to OpenAI

### 4. Direct Recipe Saving

Current flow (wasteful): AI suggestion text → second AI call to parse → save to DB.

New flow: AI returns structured JSON → pass structured data directly to save endpoint → validate and write to DB. No second AI call needed.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI Provider | OpenAI API (gpt-4o-mini) | Reliable, cheap (~$0.01-0.05/month), good JSON output |
| Abstraction layer | No | Only 2 AI endpoints; localized changes if switching later |
| Learning approach | Prompt-based (not ML) | 4-person family; feed save/ignore signals into prompt context |
| Preference storage | Key-value model | Simple, flexible, no over-engineering |
| Conversation storage | DB-backed | Enables learning + conversation continuity |

## Out of Scope

- Provider abstraction layer (YAGNI for family app)
- ML-based recommendation system
- Per-user preference profiles (family-level is sufficient)
- Meal plan auto-generation from AI suggestions
