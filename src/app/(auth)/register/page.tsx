"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("displayName") as string;

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registrierung fehlgeschlagen");
      setLoading(false);
      return;
    }

    // Auto-login after registration
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Registrierung erfolgreich, aber Anmeldung fehlgeschlagen");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-3xl font-bold text-primary">
          Essensplaner
        </h1>
        <p className="mb-8 text-center text-muted">Konto erstellen</p>

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
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
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
              autoComplete="new-password"
              className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted">Mindestens 6 Zeichen</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "Wird registriert..." : "Registrieren"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Bereits ein Konto?{" "}
          <Link href="/login" className="font-medium text-primary">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
