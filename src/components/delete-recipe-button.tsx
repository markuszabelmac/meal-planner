"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteRecipeButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/rezepte");
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={handleDelete}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
        >
          Ja, löschen
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
        >
          Nein
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
    >
      Löschen
    </button>
  );
}
