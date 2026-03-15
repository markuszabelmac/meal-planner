"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IngredientRowEditor,
  IngredientRowState,
} from "@/components/ingredient-row-editor";

const SUGGESTED_CATEGORIES = [
  "Pasta",
  "Fleisch",
  "Fisch",
  "Vegetarisch",
  "Vegan",
  "Suppe",
  "Salat",
  "Auflauf",
  "Asiatisch",
  "Schnell & Einfach",
];

export type RecipeIngredientFormData = {
  ingredientId: string | null;
  ingredientName: string;
  amount: string;
  unit: string;
};

export type RecipeData = {
  id?: string;
  name: string;
  description: string;
  ingredients: string;
  instructions: string;
  imageUrl: string;
  prepTime: string;
  servings: string;
  category: string;
  tags: string[];
  recipeIngredients?: RecipeIngredientFormData[];
};

function makeEmptyRow(): IngredientRowState {
  return {
    id: crypto.randomUUID(),
    searchText: "",
    ingredientId: null,
    ingredientName: "",
    amount: "",
    unit: "g",
    suggestions: [],
    showDropdown: false,
  };
}

export function RecipeForm({ initial }: { initial?: RecipeData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [ingredients, setIngredients] = useState(initial?.ingredients || "");
  const [instructions, setInstructions] = useState(
    initial?.instructions || "",
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [prepTime, setPrepTime] = useState(initial?.prepTime || "");
  const [servings, setServings] = useState(initial?.servings || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags || []);

  const [ingredientRows, setIngredientRows] = useState<IngredientRowState[]>(
    () => {
      if (initial?.recipeIngredients?.length) {
        return initial.recipeIngredients.map((ri) => ({
          id: crypto.randomUUID(),
          searchText: ri.ingredientName,
          ingredientId: ri.ingredientId,
          ingredientName: ri.ingredientName,
          amount: ri.amount,
          unit: ri.unit,
          suggestions: [],
          showDropdown: false,
        }));
      }
      return [];
    },
  );

  // Per-row request counter to avoid stale autocomplete results overwriting newer ones
  const requestCounters = useRef<Record<string, number>>({});

  const isEdit = !!initial?.id;

  // --- Ingredient row helpers ---

  function updateRow(rowId: string, patch: Partial<IngredientRowState>) {
    setIngredientRows((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    );
  }

  async function handleSearchChange(rowId: string, text: string) {
    // Clear selection when user edits text
    updateRow(rowId, {
      searchText: text,
      ingredientId: null,
      ingredientName: "",
    });

    if (text.length < 2) {
      updateRow(rowId, { suggestions: [], showDropdown: false });
      return;
    }

    // Bump request counter to detect stale responses
    if (!requestCounters.current[rowId]) {
      requestCounters.current[rowId] = 0;
    }
    const reqId = ++requestCounters.current[rowId];

    try {
      const res = await fetch(
        `/api/ingredients?search=${encodeURIComponent(text)}`,
      );
      if (!res.ok) return;
      const data = await res.json();

      // Discard if a newer request has already been issued
      if (requestCounters.current[rowId] !== reqId) return;

      const suggestions = (data as { id: string; name: string }[]).slice(0, 8);
      updateRow(rowId, { suggestions, showDropdown: suggestions.length > 0 });
    } catch {
      // Silently ignore network errors for autocomplete
    }
  }

  function handleSuggestionSelect(
    rowId: string,
    suggestion: { id: string; name: string },
  ) {
    updateRow(rowId, {
      ingredientId: suggestion.id,
      ingredientName: suggestion.name,
      searchText: suggestion.name,
      suggestions: [],
      showDropdown: false,
    });
  }

  function handleSearchBlur(rowId: string) {
    // Delay to let onMouseDown on suggestion item fire first
    setTimeout(() => {
      updateRow(rowId, { showDropdown: false });
    }, 150);
  }

  function handleSearchKeyDown(
    rowId: string,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Escape") {
      updateRow(rowId, { showDropdown: false });
    }
  }

  function addIngredientRow() {
    setIngredientRows((rows) => [...rows, makeEmptyRow()]);
  }

  function removeIngredientRow(rowId: string) {
    setIngredientRows((rows) => rows.filter((r) => r.id !== rowId));
    delete requestCounters.current[rowId];
  }

  // --- Tags ---

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  // --- Submit ---

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isEdit ? `/api/recipes/${initial.id}` : "/api/recipes";
    const method = isEdit ? "PUT" : "POST";

    // Build valid structured ingredient rows: must have an ingredientId and a valid positive amount
    const recipeIngredients = ingredientRows
      .filter((r) => r.ingredientId && parseFloat(r.amount) > 0)
      .map((r) => ({
        ingredientId: r.ingredientId,
        amount: parseFloat(r.amount),
        unit: r.unit,
      }));

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        ingredients,
        instructions,
        imageUrl,
        prepTime,
        servings,
        category,
        tags,
        recipeIngredients,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern");
      return;
    }

    const recipe = await res.json();
    router.push(`/rezepte/${recipe.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Spaghetti Bolognese"
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium"
        >
          Beschreibung
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Kurze Beschreibung oder Notizen..."
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Structured Ingredients */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Strukturierte Zutaten
        </label>
        <p className="mb-2 text-xs text-muted">
          Zutaten aus der Datenbank verknüpfen, um Nährwerte zu berechnen.
        </p>

        <div className="space-y-2">
          {ingredientRows.map((row) => (
            <IngredientRowEditor
              key={row.id}
              row={row}
              onSearchChange={(text) => handleSearchChange(row.id, text)}
              onSuggestionSelect={(s) => handleSuggestionSelect(row.id, s)}
              onBlur={() => handleSearchBlur(row.id)}
              onKeyDown={(e) => handleSearchKeyDown(row.id, e)}
              onAmountChange={(amount) => updateRow(row.id, { amount })}
              onUnitChange={(unit) => updateRow(row.id, { unit })}
              onRemove={() => removeIngredientRow(row.id)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addIngredientRow}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-primary hover:text-primary"
        >
          + Zutat hinzufügen
        </button>
      </div>

      {/* Ingredients (freetext) */}
      <div>
        <label
          htmlFor="ingredients"
          className="mb-1 block text-sm font-medium"
        >
          Zutaten (Freitext)
        </label>
        <textarea
          id="ingredients"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={5}
          placeholder={"500g Spaghetti\n400g Hackfleisch\n2 Dosen Tomaten\n..."}
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Instructions */}
      <div>
        <label
          htmlFor="instructions"
          className="mb-1 block text-sm font-medium"
        >
          Zubereitung
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          placeholder={
            "Schritt 1: Wasser aufkochen\nSchritt 2: Nudeln hinzugeben\n..."
          }
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Image URL */}
      <div>
        <label htmlFor="imageUrl" className="mb-1 block text-sm font-medium">
          Bild-URL
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/bild.jpg"
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Prep time & Servings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="prepTime"
            className="mb-1 block text-sm font-medium"
          >
            Zubereitungszeit (Min.)
          </label>
          <input
            id="prepTime"
            type="number"
            min="1"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="30"
            className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label
            htmlFor="servings"
            className="mb-1 block text-sm font-medium"
          >
            Portionen
          </label>
          <input
            id="servings"
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="4"
            className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium">
          Kategorie
        </label>
        <input
          id="category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="z.B. Pasta"
          className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTED_CATEGORIES.filter((c) => c !== category).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="mb-1 block text-sm font-medium">
          Tags
        </label>
        <div className="flex gap-2">
          <input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Tag eingeben + Enter"
            className="flex-1 rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
          >
            +
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-primary/70"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading
            ? "Wird gespeichert..."
            : isEdit
              ? "Speichern"
              : "Rezept anlegen"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-background"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
