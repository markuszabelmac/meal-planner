"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RecipePicker } from "./recipe-picker";
import {
  getWeekDays,
  getMonday,
  toDateString,
  formatDayShort,
  formatWeekRange,
  isToday,
} from "@/lib/dates";

type FamilyMember = {
  id: string;
  displayName: string;
};

type MealPlanEntry = {
  id: string;
  date: string;
  recipeId: string | null;
  customMeal: string | null;
  recipe: { id: string; name: string; category: string | null } | null;
  forUser: { id: string; displayName: string };
  assigner: { displayName: string };
};

type PickerTarget = {
  date: string;
  editingEntry?: MealPlanEntry;
  editingMembers?: MealPlanEntry[];
  editPersonsOnly?: boolean;
} | null;

export function WeekPlanner() {
  const [currentDate, setCurrentDate] = useState(() => getMonday(new Date()));
  const [mealPlans, setMealPlans] = useState<MealPlanEntry[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const weekDays = getWeekDays(currentDate);
  const from = toDateString(weekDays[0]);
  const to = toDateString(weekDays[6]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setFamilyMembers);
  }, []);

  const fetchPlans = useCallback(() => {
    fetch(`/api/meal-plans?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => {
        setMealPlans(data);
        setLoading(false);
      });
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    fetchPlans();
    const interval = setInterval(fetchPlans, 30000);
    return () => clearInterval(interval);
  }, [fetchPlans]);

  useEffect(() => {
    if (!loading && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading]);

  function navigateWeek(offset: number) {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + offset * 7);
      return next;
    });
  }

  function goToThisWeek() {
    setCurrentDate(getMonday(new Date()));
  }

  function getEntries(date: string): MealPlanEntry[] {
    return mealPlans.filter((mp) => mp.date.substring(0, 10) === date);
  }

  function getMealLabel(entry: MealPlanEntry): string {
    if (entry.recipe) return entry.recipe.name;
    return entry.customMeal || "";
  }

  async function assignMeal(
    meal: { id?: string; name: string; customMeal?: string },
    forUserIds: string[],
    options?: { date?: string; overwrite?: boolean },
  ) {
    if (!pickerTarget) return;

    if (pickerTarget.editingEntry) {
      const res = await fetch("/api/meal-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pickerTarget.editingEntry.id,
          recipeId: meal.id || null,
          customMeal: meal.customMeal || null,
          date: options?.date || null,
          forUserIds: forUserIds.length > 0 ? forUserIds : null,
          overwrite: options?.overwrite || false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "conflict") {
          const names = data.conflicts.map((c: { forUser: { displayName: string }; meal: string }) =>
            `${c.forUser.displayName} (${c.meal})`
          ).join(", ");
          if (confirm(`An diesem Tag existieren bereits Einträge für: ${names}. Überschreiben?`)) {
            return assignMeal(meal, forUserIds, { ...options, overwrite: true });
          }
          return;
        }
      }
    } else {
      await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: pickerTarget.date,
          recipeId: meal.id || null,
          customMeal: meal.customMeal || null,
          forUserIds,
        }),
      });
    }

    setPickerTarget(null);
    fetchPlans();
  }

  async function removeEntry(id: string) {
    await fetch(`/api/meal-plans?id=${id}`, { method: "DELETE" });
    fetchPlans();
  }

  function groupEntries(entries: MealPlanEntry[]) {
    const groups = new Map<
      string,
      { label: string; recipe: MealPlanEntry["recipe"]; members: MealPlanEntry[] }
    >();
    for (const entry of entries) {
      const key = entry.recipe ? entry.recipe.id : `custom:${entry.customMeal}`;
      if (!groups.has(key)) {
        groups.set(key, {
          label: getMealLabel(entry),
          recipe: entry.recipe,
          members: [],
        });
      }
      groups.get(key)!.members.push(entry);
    }
    return Array.from(groups.values());
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigateWeek(-1)}
          className="rounded-lg border border-border p-3 text-sm hover:bg-background"
        >
          &larr;
        </button>
        <div className="text-center">
          <button
            onClick={goToThisWeek}
            className="text-sm font-semibold hover:text-primary"
          >
            {formatWeekRange(currentDate)}
          </button>
        </div>
        <button
          onClick={() => navigateWeek(1)}
          className="rounded-lg border border-border p-3 text-sm hover:bg-background"
        >
          &rarr;
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted">Lade Wochenplan...</p>
      ) : (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dateStr = toDateString(day);
            const today = isToday(day);
            const entries = getEntries(dateStr);
            const groups = groupEntries(entries);
            const allAssigned =
              entries.length >= familyMembers.length &&
              familyMembers.length > 0;

            return (
              <div
                key={dateStr}
                ref={today ? todayRef : undefined}
                className={`rounded-lg border bg-card p-3 ${
                  today
                    ? "border-primary/40 ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                <h3
                  className={`mb-2 text-sm font-semibold ${
                    today ? "text-primary" : ""
                  }`}
                >
                  {formatDayShort(day)}
                  {today && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-normal text-white">
                      Heute
                    </span>
                  )}
                </h3>

                {groups.length > 0 && (
                  <div className="space-y-1.5">
                    {groups.map(({ label, members }) => (
                      <div
                        key={label}
                        className="flex items-start gap-2 rounded-md bg-primary/5 p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {label}
                          </p>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {members.length === familyMembers.length ? (
                              <span className="text-xs text-muted">Alle</span>
                            ) : (
                              members.map((m) => (
                                <span
                                  key={m.forUser.id}
                                  className="inline-flex items-center rounded bg-card px-1 text-xs text-muted"
                                >
                                  {m.forUser.displayName}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        {/* Edit, Persons, and Delete buttons */}
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            onClick={() =>
                              setPickerTarget({
                                date: dateStr,
                                editingEntry: members[0],
                                editingMembers: members,
                              })
                            }
                            className="rounded-full p-1.5 text-muted hover:text-primary"
                            title="Gericht ändern"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              setPickerTarget({
                                date: dateStr,
                                editingEntry: members[0],
                                editingMembers: members,
                                editPersonsOnly: true,
                              })
                            }
                            className="rounded-full p-1.5 text-muted hover:text-primary"
                            title="Personen ändern"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Eintrag wirklich löschen?")) {
                                members.forEach((m) => removeEntry(m.id));
                              }
                            }}
                            className="rounded-full p-1.5 text-muted hover:text-red-500"
                            title="Löschen"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!allAssigned && (
                  <button
                    onClick={() => setPickerTarget({ date: dateStr })}
                    className={`flex w-full items-center justify-center rounded-md border border-dashed border-border p-3 text-sm text-muted transition-colors hover:border-primary hover:text-primary ${
                      groups.length > 0 ? "mt-1.5" : ""
                    }`}
                  >
                    + Gericht wählen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pickerTarget && (
        <RecipePicker
          familyMembers={familyMembers}
          existingAssignments={
            pickerTarget.editingEntry
              ? []
              : getEntries(pickerTarget.date).map((e) => ({
                  forUserId: e.forUser.id,
                  recipeName: getMealLabel(e),
                }))
          }
          editingEntry={
            pickerTarget.editingEntry
              ? {
                  recipeId: pickerTarget.editingEntry.recipe?.id,
                  recipeName: pickerTarget.editingEntry.recipe?.name,
                  customMeal: pickerTarget.editingEntry.customMeal,
                  date: pickerTarget.date,
                  forUserIds: pickerTarget.editingMembers?.map((m) => m.forUser.id) || [],
                }
              : undefined
          }
          editPersonsOnly={pickerTarget.editPersonsOnly}
          onSelect={assignMeal}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
