"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

type RecipeData = {
  id?: string;
  name: string;
  description: string;
  ingredients: string;
  prepTime: string;
  servings: string;
  category: string;
  tags: string[];
};

export function RecipeForm({ initial }: { initial?: RecipeData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [ingredients, setIngredients] = useState(initial?.ingredients || "");
  const [prepTime, setPrepTime] = useState(initial?.prepTime || "");
  const [servings, setServings] = useState(initial?.servings || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags || []);

  const isEdit = !!initial?.id;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isEdit ? `/api/recipes/${initial.id}` : "/api/recipes";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        ingredients,
        prepTime,
        servings,
        category,
        tags,
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

      {/* Ingredients */}
      <div>
        <label
          htmlFor="ingredients"
          className="mb-1 block text-sm font-medium"
        >
          Zutaten
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
