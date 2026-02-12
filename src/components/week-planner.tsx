"use client";

import { useCallback, useEffect, useState } from "react";
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
  mealType: string;
  recipe: { id: string; name: string; category: string | null };
  forUser: { id: string; displayName: string };
  assigner: { displayName: string };
};

type PickerTarget = {
  date: string;
  mealType: "lunch" | "dinner";
} | null;

const MEAL_LABELS = { lunch: "Mittagessen", dinner: "Abendessen" } as const;

export function WeekPlanner() {
  const [currentDate, setCurrentDate] = useState(() => getMonday(new Date()));
  const [mealPlans, setMealPlans] = useState<MealPlanEntry[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const weekDays = getWeekDays(currentDate);
  const from = toDateString(weekDays[0]);
  const to = toDateString(weekDays[6]);

  // Load family members once
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

  function getEntries(date: string, mealType: string): MealPlanEntry[] {
    return mealPlans.filter(
      (mp) => mp.date.substring(0, 10) === date && mp.mealType === mealType,
    );
  }

  async function assignRecipe(
    recipe: { id: string; name: string },
    forUserIds: string[],
  ) {
    if (!pickerTarget) return;

    await fetch("/api/meal-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: pickerTarget.date,
        mealType: pickerTarget.mealType,
        recipeId: recipe.id,
        forUserIds,
      }),
    });

    setPickerTarget(null);
    fetchPlans();
  }

  async function removeEntry(date: string, mealType: string, forUserId: string) {
    await fetch(
      `/api/meal-plans?date=${date}&mealType=${mealType}&forUserId=${forUserId}`,
      { method: "DELETE" },
    );
    fetchPlans();
  }

  // Group entries by recipe for compact display
  function groupEntries(entries: MealPlanEntry[]) {
    const groups = new Map<
      string,
      { recipe: MealPlanEntry["recipe"]; members: MealPlanEntry[] }
    >();
    for (const entry of entries) {
      const key = entry.recipe.id;
      if (!groups.has(key)) {
        groups.set(key, { recipe: entry.recipe, members: [] });
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
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
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
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
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

            return (
              <div
                key={dateStr}
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

                <div className="grid grid-cols-2 gap-3">
                  {(["lunch", "dinner"] as const).map((mealType) => {
                    const entries = getEntries(dateStr, mealType);
                    const groups = groupEntries(entries);
                    const allAssigned =
                      entries.length >= familyMembers.length &&
                      familyMembers.length > 0;

                    return (
                      <div key={mealType}>
                        <p className="mb-1.5 text-xs text-muted">
                          {MEAL_LABELS[mealType]}
                        </p>

                        {groups.length > 0 && (
                          <div className="space-y-1.5">
                            {groups.map(({ recipe, members }) => (
                              <div
                                key={recipe.id}
                                className="group relative rounded-md bg-primary/5 p-2"
                              >
                                <p className="text-sm font-medium leading-tight">
                                  {recipe.name}
                                </p>
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {members.length ===
                                  familyMembers.length ? (
                                    <span className="text-xs text-muted">
                                      Alle
                                    </span>
                                  ) : (
                                    members.map((m) => (
                                      <span
                                        key={m.forUser.id}
                                        className="inline-flex items-center rounded bg-card px-1 text-xs text-muted"
                                      >
                                        {m.forUser.displayName}
                                        <button
                                          onClick={() =>
                                            removeEntry(
                                              dateStr,
                                              mealType,
                                              m.forUser.id,
                                            )
                                          }
                                          className="ml-0.5 hidden text-red-400 hover:text-red-600 group-hover:inline"
                                          title="Entfernen"
                                        >
                                          &times;
                                        </button>
                                      </span>
                                    ))
                                  )}
                                </div>
                                {members.length ===
                                  familyMembers.length && (
                                  <button
                                    onClick={() =>
                                      members.forEach((m) =>
                                        removeEntry(
                                          dateStr,
                                          mealType,
                                          m.forUser.id,
                                        ),
                                      )
                                    }
                                    className="absolute right-1 top-1 hidden rounded-full p-0.5 text-muted hover:text-red-500 group-hover:block"
                                    title="Alle entfernen"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {!allAssigned && (
                          <button
                            onClick={() =>
                              setPickerTarget({ date: dateStr, mealType })
                            }
                            className={`flex w-full items-center justify-center rounded-md border border-dashed border-border p-2 text-xs text-muted transition-colors hover:border-primary hover:text-primary ${
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
              </div>
            );
          })}
        </div>
      )}

      {pickerTarget && (
        <RecipePicker
          familyMembers={familyMembers}
          existingAssignments={getEntries(
            pickerTarget.date,
            pickerTarget.mealType,
          ).map((e) => ({
            forUserId: e.forUser.id,
            recipeName: e.recipe.name,
          }))}
          onSelect={assignRecipe}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
