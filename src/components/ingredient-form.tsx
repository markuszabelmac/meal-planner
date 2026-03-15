"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type IngredientData = {
  id?: string;
  name: string;
  nameEn: string;
  kcalPer100g: number | string;
  proteinPer100g: number | string;
  fatPer100g: number | string;
  satFatPer100g: number | string;
  carbsPer100g: number | string;
  sugarPer100g: number | string;
  fiberPer100g: number | string;
};

export function IngredientForm({ initial }: { initial?: IngredientData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initial?.name || "");
  const [nameEn, setNameEn] = useState(initial?.nameEn || "");
  const [kcalPer100g, setKcalPer100g] = useState(
    initial?.kcalPer100g !== undefined ? String(initial.kcalPer100g) : "",
  );
  const [proteinPer100g, setProteinPer100g] = useState(
    initial?.proteinPer100g !== undefined ? String(initial.proteinPer100g) : "",
  );
  const [fatPer100g, setFatPer100g] = useState(
    initial?.fatPer100g !== undefined ? String(initial.fatPer100g) : "",
  );
  const [satFatPer100g, setSatFatPer100g] = useState(
    initial?.satFatPer100g !== undefined ? String(initial.satFatPer100g) : "",
  );
  const [carbsPer100g, setCarbsPer100g] = useState(
    initial?.carbsPer100g !== undefined ? String(initial.carbsPer100g) : "",
  );
  const [sugarPer100g, setSugarPer100g] = useState(
    initial?.sugarPer100g !== undefined ? String(initial.sugarPer100g) : "",
  );
  const [fiberPer100g, setFiberPer100g] = useState(
    initial?.fiberPer100g !== undefined ? String(initial.fiberPer100g) : "",
  );

  const isEdit = !!initial?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isEdit
      ? `/api/ingredients/${initial!.id}`
      : "/api/ingredients";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        nameEn: nameEn || null,
        kcalPer100g: parseFloat(kcalPer100g),
        proteinPer100g: proteinPer100g !== "" ? parseFloat(proteinPer100g) : null,
        fatPer100g: fatPer100g !== "" ? parseFloat(fatPer100g) : null,
        satFatPer100g: satFatPer100g !== "" ? parseFloat(satFatPer100g) : null,
        carbsPer100g: carbsPer100g !== "" ? parseFloat(carbsPer100g) : null,
        sugarPer100g: sugarPer100g !== "" ? parseFloat(sugarPer100g) : null,
        fiberPer100g: fiberPer100g !== "" ? parseFloat(fiberPer100g) : null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern");
      return;
    }

    router.push("/zutaten");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

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
          placeholder="z.B. Haferflocken"
          className={inputClass}
        />
      </div>

      {/* English name */}
      <div>
        <label htmlFor="nameEn" className="mb-1 block text-sm font-medium">
          Englischer Name
        </label>
        <input
          id="nameEn"
          type="text"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="z.B. Rolled oats"
          className={inputClass}
        />
      </div>

      {/* Nutrition section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted">
          Naehrwerte pro 100g
        </h3>
        <div className="space-y-4">
          {/* Calories — required */}
          <div>
            <label
              htmlFor="kcalPer100g"
              className="mb-1 block text-sm font-medium"
            >
              Kalorien pro 100g (kcal) *
            </label>
            <input
              id="kcalPer100g"
              type="number"
              required
              min="0"
              step="0.1"
              value={kcalPer100g}
              onChange={(e) => setKcalPer100g(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="proteinPer100g"
                className="mb-1 block text-sm font-medium"
              >
                Protein (g)
              </label>
              <input
                id="proteinPer100g"
                type="number"
                min="0"
                step="0.1"
                value={proteinPer100g}
                onChange={(e) => setProteinPer100g(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="fatPer100g"
                className="mb-1 block text-sm font-medium"
              >
                Fett (g)
              </label>
              <input
                id="fatPer100g"
                type="number"
                min="0"
                step="0.1"
                value={fatPer100g}
                onChange={(e) => setFatPer100g(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="satFatPer100g"
                className="mb-1 block text-sm font-medium"
              >
                Gesaettigtes Fett (g)
              </label>
              <input
                id="satFatPer100g"
                type="number"
                min="0"
                step="0.1"
                value={satFatPer100g}
                onChange={(e) => setSatFatPer100g(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="carbsPer100g"
                className="mb-1 block text-sm font-medium"
              >
                Kohlenhydrate (g)
              </label>
              <input
                id="carbsPer100g"
                type="number"
                min="0"
                step="0.1"
                value={carbsPer100g}
                onChange={(e) => setCarbsPer100g(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sugarPer100g"
                className="mb-1 block text-sm font-medium"
              >
                Zucker (g)
              </label>
              <input
                id="sugarPer100g"
                type="number"
                min="0"
                step="0.1"
                value={sugarPer100g}
                onChange={(e) => setSugarPer100g(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="fiberPer100g"
                className="mb-1 block text-sm font-medium"
              >
                Ballaststoffe (g)
              </label>
              <input
                id="fiberPer100g"
                type="number"
                min="0"
                step="0.1"
                value={fiberPer100g}
                onChange={(e) => setFiberPer100g(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
        </div>
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
              : "Zutat anlegen"}
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
