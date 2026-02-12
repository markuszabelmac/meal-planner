"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Recipe = {
  name: string;
  description: string;
  ingredients: string;
  time: string;
};

function parseRecipes(content: string): Recipe[] | null {
  try {
    // Try to extract JSON array from the response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Validate structure
    if (!parsed[0].name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function InspirationPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null);

  async function sendMessage(userMessage?: string) {
    const message = userMessage || input.trim();
    const mode = message ? "chat" : "auto";

    if (message) {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
    }
    setInput("");
    setLoading(true);

    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || undefined,
        mode,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.error || "Fehler bei der Anfrage",
        },
      ]);
      return;
    }

    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.response },
    ]);
  }

  async function saveAsRecipe(recipe: Recipe) {
    const text = `**${recipe.name}**\n${recipe.description}\nZutaten: ${recipe.ingredients}\nZubereitungszeit: ${recipe.time}`;
    setSavingRecipe(recipe.name);

    const res = await fetch("/api/ai/save-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      const saved = await res.json();
      router.push(`/rezepte/${saved.id}`);
    } else {
      setSavingRecipe(null);
      alert("Fehler beim Speichern des Rezepts");
    }
  }

  return (
    <div className="flex flex-col">
      <h2 className="mb-4 text-2xl font-bold">Inspiration</h2>

      {messages.length === 0 && !loading && (
        <div className="mb-6">
          <p className="mb-4 text-muted">
            Lass dich inspirieren! Frag nach Rezeptideen oder lass dir
            automatisch Vorschläge machen.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => sendMessage()}
              className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/30"
            >
              <span className="font-medium">Automatische Vorschläge</span>
              <p className="mt-0.5 text-xs text-muted">
                Basierend auf euren Rezepten und was ihr zuletzt gegessen habt
              </p>
            </button>

            <button
              onClick={() =>
                sendMessage("Was kann ich schnelles unter 30 Minuten kochen?")
              }
              className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/30"
            >
              <span className="font-medium">Schnelle Gerichte</span>
              <p className="mt-0.5 text-xs text-muted">
                Unter 30 Minuten fertig
              </p>
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "Schlage mir vegetarische Gerichte vor, die auch Kindern schmecken.",
                )
              }
              className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/30"
            >
              <span className="font-medium">Vegetarisch & kindertauglich</span>
              <p className="mt-0.5 text-xs text-muted">
                Fleischfrei und familienfreundlich
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const recipes = parseRecipes(msg.content);

                  if (!recipes) {
                    return (
                      <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    );
                  }

                  return recipes.map((recipe, j) => {
                    const isSaving = savingRecipe === recipe.name;
                    return (
                      <div
                        key={j}
                        className="rounded-2xl border border-border bg-card px-4 py-4 text-sm"
                      >
                        <h3 className="text-base font-semibold">
                          {recipe.name}
                        </h3>
                        <p className="mt-1.5 leading-relaxed text-muted">
                          {recipe.description}
                        </p>
                        <div className="mt-3 space-y-1 text-xs">
                          <p>
                            <span className="font-medium">Zutaten:</span>{" "}
                            <span className="text-muted">{recipe.ingredients}</span>
                          </p>
                          <p>
                            <span className="font-medium">Zubereitungszeit:</span>{" "}
                            <span className="text-muted">{recipe.time}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => saveAsRecipe(recipe)}
                          disabled={isSaving}
                          className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                        >
                          {isSaving ? "Wird gespeichert..." : "Übernehmen"}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-1.5 px-4 py-3">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {/* Input */}
      {messages.length > 0 && (
        <div className="sticky bottom-16 mt-4 flex gap-2 bg-background pb-2 pt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) sendMessage();
            }}
            placeholder="z.B. Was mit Hähnchen und Reis?"
            className="flex-1 rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={() => input.trim() && sendMessage()}
            disabled={!input.trim() || loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            Fragen
          </button>
        </div>
      )}
    </div>
  );
}
