"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FamilyMember = {
  id: string;
  displayName: string;
  email: string;
};

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  function fetchMembers() {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setMembers);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        displayName: formData.get("displayName"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Anlegen");
      return;
    }

    setSuccess("Familienmitglied erfolgreich angelegt!");
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
    fetchMembers();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Familie</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/familie/einstellungen"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
          >
            Einstellungen
          </Link>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setSuccess("");
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              + Mitglied anlegen
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Member list */}
      <div className="mb-6 space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {member.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{member.displayName}</p>
              <p className="text-xs text-muted">{member.email}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add member form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 font-semibold">Neues Familienmitglied</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="displayName"
                className="mb-1 block text-sm font-medium"
              >
                Anzeigename
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                placeholder="z.B. Mama, Papa, Max..."
                className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium"
              >
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium"
              >
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted">Mindestens 6 Zeichen</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {loading ? "Wird angelegt..." : "Anlegen"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-background"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
