"use client";

import { useEffect, useRef, useState } from "react";

type Recipe = {
  id: string;
  name: string;
  category: string | null;
};

type FamilyMember = {
  id: string;
  displayName: string;
};

type ExistingAssignment = {
  forUserId: string;
  recipeName: string;
};

type Props = {
  familyMembers: FamilyMember[];
  existingAssignments: ExistingAssignment[];
  onSelect: (recipe: Recipe, forUserIds: string[]) => void;
  onClose: () => void;
};

export function RecipePicker({
  familyMembers,
  existingAssignments,
  onSelect,
  onClose,
}: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const assignedUserIds = new Set(existingAssignments.map((a) => a.forUserId));
  const unassignedMembers = familyMembers.filter(
    (m) => !assignedUserIds.has(m.id),
  );

  useEffect(() => {
    if (!selectedRecipe) inputRef.current?.focus();
  }, [selectedRecipe]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/recipes?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data);
        setLoading(false);
      });
  }, [search]);

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  function selectAllUnassigned() {
    const unassignedIds = unassignedMembers.map((m) => m.id);
    const allSelected = unassignedIds.every((id) =>
      selectedUserIds.includes(id),
    );
    if (allSelected) {
      setSelectedUserIds((prev) =>
        prev.filter((id) => !unassignedIds.includes(id)),
      );
    } else {
      setSelectedUserIds((prev) => [
        ...new Set([...prev, ...unassignedIds]),
      ]);
    }
  }

  function handleConfirm() {
    if (selectedRecipe && selectedUserIds.length > 0) {
      onSelect(selectedRecipe, selectedUserIds);
    }
  }

  function getAssignment(userId: string): string | undefined {
    return existingAssignments.find((a) => a.forUserId === userId)?.recipeName;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">
            {selectedRecipe ? "Für wen?" : "Rezept auswählen"}
          </h3>
          <button
            onClick={selectedRecipe ? () => setSelectedRecipe(null) : onClose}
            className="rounded-full p-1 text-muted hover:bg-background hover:text-foreground"
          >
            {selectedRecipe ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>

        {!selectedRecipe ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rezept suchen..."
              className="mb-3 w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <p className="py-4 text-center text-sm text-muted">Lade...</p>
              ) : recipes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  {search
                    ? "Keine Rezepte gefunden"
                    : "Noch keine Rezepte vorhanden"}
                </p>
              ) : (
                <div className="space-y-1">
                  {recipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        // Pre-select only unassigned members
                        setSelectedUserIds(unassignedMembers.map((m) => m.id));
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-background"
                    >
                      <span className="flex-1 text-sm font-medium">
                        {recipe.name}
                      </span>
                      {recipe.category && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {recipe.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 rounded-lg bg-primary/5 p-3">
              <p className="text-sm font-medium">{selectedRecipe.name}</p>
              {selectedRecipe.category && (
                <span className="text-xs text-muted">
                  {selectedRecipe.category}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {/* Select all unassigned */}
              {unassignedMembers.length > 1 && (
                <>
                  <button
                    onClick={selectAllUnassigned}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      unassignedMembers.every((m) =>
                        selectedUserIds.includes(m.id),
                      )
                        ? "bg-primary/10"
                        : "hover:bg-background"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                        unassignedMembers.every((m) =>
                          selectedUserIds.includes(m.id),
                        )
                          ? "border-primary bg-primary text-white"
                          : "border-border"
                      }`}
                    >
                      {unassignedMembers.every((m) =>
                        selectedUserIds.includes(m.id),
                      ) && "✓"}
                    </span>
                    <span className="text-sm font-medium">
                      {assignedUserIds.size > 0
                        ? "Alle ohne Gericht"
                        : "Alle"}
                    </span>
                  </button>
                  <div className="border-t border-border" />
                </>
              )}

              {/* Individual members */}
              {familyMembers.map((member) => {
                const selected = selectedUserIds.includes(member.id);
                const currentMeal = getAssignment(member.id);

                return (
                  <button
                    key={member.id}
                    onClick={() => toggleUser(member.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selected ? "bg-primary/10" : "hover:bg-background"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-border"
                      }`}
                    >
                      {selected && "✓"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm">{member.displayName}</span>
                      {currentMeal && (
                        <p className="truncate text-xs text-muted">
                          Hat bereits: {currentMeal}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleConfirm}
              disabled={selectedUserIds.length === 0}
              className="mt-4 w-full rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {selectedUserIds.length === 0
                ? "Bitte auswählen"
                : selectedUserIds.some((id) => assignedUserIds.has(id))
                  ? `Eintragen (${selectedUserIds.filter((id) => assignedUserIds.has(id)).length}x ersetzen)`
                  : selectedUserIds.length === familyMembers.length
                    ? "Für alle eintragen"
                    : `Für ${selectedUserIds.length} Person${selectedUserIds.length > 1 ? "en" : ""} eintragen`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
