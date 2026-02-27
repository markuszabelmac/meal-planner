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
