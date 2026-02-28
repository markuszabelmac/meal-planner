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
  editingEntry?: {
    recipeId?: string;
    recipeName?: string;
    customMeal?: string | null;
    date?: string;
    forUserIds?: string[];
  };
  editPersonsOnly?: boolean;
  onSelect: (
    meal: { id?: string; name: string; customMeal?: string },
    forUserIds: string[],
    options?: { date?: string; overwrite?: boolean },
  ) => void;
  onClose: () => void;
};

export function RecipePicker({
  familyMembers,
  existingAssignments,
  editingEntry,
  editPersonsOnly,
  onSelect,
  onClose,
}: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [customMeal, setCustomMeal] = useState(editingEntry?.customMeal || "");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    editingEntry?.forUserIds || [],
  );
  const [editDate, setEditDate] = useState(editingEntry?.date || "");
  const [mode, setMode] = useState<"recipe" | "custom">(
    editingEntry?.customMeal ? "custom" : "recipe",
  );
  // In edit mode: step 1 = choose meal, step 2 = choose users + date
  const [editStep, setEditStep] = useState<"meal" | "details">(
    editPersonsOnly ? "details" : "meal",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingEntry;
  const assignedUserIds = new Set(existingAssignments.map((a) => a.forUserId));
  const unassignedMembers = familyMembers.filter(
    (m) => !assignedUserIds.has(m.id),
  );

  // The meal that was chosen (recipe or custom text)
  const [chosenMeal, setChosenMeal] = useState<{
    id?: string;
    name: string;
    customMeal?: string;
  } | null>(
    editPersonsOnly && editingEntry
      ? editingEntry.customMeal
        ? { name: editingEntry.customMeal, customMeal: editingEntry.customMeal }
        : editingEntry.recipeName
          ? { id: editingEntry.recipeId, name: editingEntry.recipeName }
          : null
      : null,
  );

  useEffect(() => {
    if (!selectedRecipe && mode === "recipe" && editStep === "meal")
      inputRef.current?.focus();
  }, [selectedRecipe, mode, editStep]);

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

  function selectAllMembers() {
    const allIds = isEditing
      ? familyMembers.map((m) => m.id)
      : unassignedMembers.map((m) => m.id);
    const allSelected = allIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) =>
        prev.filter((id) => !allIds.includes(id)),
      );
    } else {
      setSelectedUserIds((prev) => [...new Set([...prev, ...allIds])]);
    }
  }

  function handleConfirm() {
    const meal = chosenMeal || (selectedRecipe ? selectedRecipe : null);
    if (!meal) return;
    if (selectedUserIds.length === 0) return;

    if (isEditing) {
      onSelect(meal, selectedUserIds, { date: editDate || undefined });
    } else {
      onSelect(meal, selectedUserIds);
    }
  }

  function handleSelectRecipe(recipe: Recipe) {
    if (isEditing) {
      setChosenMeal(recipe);
      setEditStep("details");
      return;
    }
    setSelectedRecipe(recipe);
    setSelectedUserIds(unassignedMembers.map((m) => m.id));
  }

  function handleCustomMealNext() {
    if (!customMeal.trim()) return;
    const meal = { name: customMeal.trim(), customMeal: customMeal.trim() };
    if (isEditing) {
      setChosenMeal(meal);
      setEditStep("details");
      return;
    }
    // For new entries, go to user selection
    setChosenMeal(meal);
    setSelectedUserIds(unassignedMembers.map((m) => m.id));
  }

  function getAssignment(userId: string): string | undefined {
    return existingAssignments.find((a) => a.forUserId === userId)?.recipeName;
  }

  // Determine which screen to show
  const showUserSelection =
    (isEditing && editStep === "details") ||
    (!isEditing && (selectedRecipe || chosenMeal));

  const selectableMembers = isEditing ? familyMembers : familyMembers;
  const selectAllLabel = isEditing
    ? "Alle"
    : assignedUserIds.size > 0
      ? "Alle ohne Gericht"
      : "Alle";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">
            {showUserSelection
              ? editPersonsOnly
                ? "Personen ändern"
                : isEditing
                  ? "Eintrag bearbeiten"
                  : "Für wen?"
              : isEditing
                ? "Gericht ändern"
                : "Gericht wählen"}
          </h3>
          <button
            onClick={
              showUserSelection && !isEditing
                ? () => {
                    setSelectedRecipe(null);
                    setChosenMeal(null);
                  }
                : showUserSelection && isEditing && !editPersonsOnly
                  ? () => {
                      setEditStep("meal");
                      setChosenMeal(null);
                    }
                  : onClose
            }
            className="rounded-full p-1 text-muted hover:bg-background hover:text-foreground"
          >
            {showUserSelection && !editPersonsOnly ? (
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

        {showUserSelection ? (
          <>
            {/* Selected meal summary */}
            <div className="mb-3 rounded-lg bg-primary/5 p-3">
              <p className="text-sm font-medium">
                {chosenMeal?.name || selectedRecipe?.name || editingEntry?.recipeName || editingEntry?.customMeal}
              </p>
            </div>

            {/* Date picker (edit mode only) */}
            {isEditing && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-muted">
                  Datum
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* User selection */}
            <div className="space-y-2">
              {selectableMembers.length > 1 && (
                <>
                  <button
                    onClick={selectAllMembers}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      (isEditing ? familyMembers : unassignedMembers).every(
                        (m) => selectedUserIds.includes(m.id),
                      )
                        ? "bg-primary/10"
                        : "hover:bg-background"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                        (isEditing ? familyMembers : unassignedMembers).every(
                          (m) => selectedUserIds.includes(m.id),
                        )
                          ? "border-primary bg-primary text-white"
                          : "border-border"
                      }`}
                    >
                      {(isEditing ? familyMembers : unassignedMembers).every(
                        (m) => selectedUserIds.includes(m.id),
                      ) && "✓"}
                    </span>
                    <span className="text-sm font-medium">{selectAllLabel}</span>
                  </button>
                  <div className="border-t border-border" />
                </>
              )}

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
                : isEditing
                  ? "Speichern"
                  : selectedUserIds.some((id) => assignedUserIds.has(id))
                    ? `Eintragen (${selectedUserIds.filter((id) => assignedUserIds.has(id)).length}x ersetzen)`
                    : selectedUserIds.length === familyMembers.length
                      ? "Für alle eintragen"
                      : `Für ${selectedUserIds.length} Person${selectedUserIds.length > 1 ? "en" : ""} eintragen`}
            </button>
          </>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="mb-3 flex rounded-lg border border-border">
              <button
                onClick={() => setMode("recipe")}
                className={`flex-1 rounded-l-lg px-3 py-1.5 text-sm transition-colors ${
                  mode === "recipe"
                    ? "bg-primary text-white"
                    : "hover:bg-background"
                }`}
              >
                Rezept
              </button>
              <button
                onClick={() => setMode("custom")}
                className={`flex-1 rounded-r-lg px-3 py-1.5 text-sm transition-colors ${
                  mode === "custom"
                    ? "bg-primary text-white"
                    : "hover:bg-background"
                }`}
              >
                Freitext
              </button>
            </div>

            {mode === "recipe" ? (
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
                    <p className="py-4 text-center text-sm text-muted">
                      Lade...
                    </p>
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
                          onClick={() => handleSelectRecipe(recipe)}
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
                <input
                  type="text"
                  value={customMeal}
                  onChange={(e) => setCustomMeal(e.target.value)}
                  placeholder='z.B. "Pizza bestellt", "Reste"...'
                  className="mb-3 w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customMeal.trim()) {
                      handleCustomMealNext();
                    }
                  }}
                />

                {customMeal.trim() && (
                  <button
                    onClick={handleCustomMealNext}
                    className="w-full rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-hover"
                  >
                    Weiter
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
