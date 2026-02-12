"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";

type ImportResult = {
  url: string;
  status: "pending" | "loading" | "success" | "error";
  name?: string;
  id?: string;
  error?: string;
};

export default function ImportPage() {
  const [urlText, setUrlText] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);

  async function importUrl(result: ImportResult, index: number) {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, status: "loading" } : r)),
    );

    try {
      const res = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults((prev) =>
          prev.map((r, i) =>
            i === index
              ? { ...r, status: "success", name: data.name, id: data.id }
              : r,
          ),
        );
      } else {
        setResults((prev) =>
          prev.map((r, i) =>
            i === index ? { ...r, status: "error", error: data.error } : r,
          ),
        );
      }
    } catch {
      setResults((prev) =>
        prev.map((r, i) =>
          i === index ? { ...r, status: "error", error: "Netzwerkfehler" } : r,
        ),
      );
    }
  }

  async function startImport() {
    const urls = urlText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) return;

    const initial: ImportResult[] = urls.map((url) => ({
      url,
      status: "pending",
    }));
    setResults(initial);
    setImporting(true);

    // Import one by one to avoid rate limits
    for (let i = 0; i < urls.length; i++) {
      await importUrl(initial[i], i);
    }

    setImporting(false);
  }

  const doneCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Rezepte", href: "/rezepte" },
          { label: "Importieren" },
        ]}
      />
      <h2 className="mb-2 text-2xl font-bold">Rezepte importieren</h2>
      <p className="mb-4 text-sm text-muted">
        Füge Rezept-URLs ein (eine pro Zeile). Die KI extrahiert automatisch
        Name, Zutaten, Zubereitungszeit und mehr.
      </p>

      {results.length === 0 ? (
        <>
          <textarea
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder={"https://www.chefkoch.de/rezepte/...\nhttps://www.lecker.de/..."}
            rows={8}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={startImport}
            disabled={!urlText.trim()}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            Importieren
          </button>
        </>
      ) : (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <span className="shrink-0">
                {r.status === "pending" && (
                  <span className="text-muted">&#x25CB;</span>
                )}
                {r.status === "loading" && (
                  <span className="animate-spin">&#x25E0;</span>
                )}
                {r.status === "success" && (
                  <span className="text-green-600">&#x2713;</span>
                )}
                {r.status === "error" && (
                  <span className="text-red-500">&#x2717;</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                {r.status === "success" && r.id ? (
                  <Link
                    href={`/rezepte/${r.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.name}
                  </Link>
                ) : (
                  <span className="truncate text-muted">{r.url}</span>
                )}
                {r.status === "error" && (
                  <p className="text-xs text-red-500">{r.error}</p>
                )}
              </div>
            </div>
          ))}

          {!importing && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted">
                {doneCount} importiert
                {errorCount > 0 && `, ${errorCount} fehlgeschlagen`}
              </p>
              <div className="flex gap-2">
                <Link
                  href="/rezepte"
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  Zu den Rezepten
                </Link>
                <button
                  onClick={() => {
                    setResults([]);
                    setUrlText("");
                  }}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
                >
                  Weitere importieren
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
