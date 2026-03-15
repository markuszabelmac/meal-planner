"use client";

export const UNIT_LABELS: Record<string, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  stueck: "Stück",
  el: "EL",
  tl: "TL",
  prise: "Prise",
  bund: "Bund",
  dose: "Dose",
  scheibe: "Scheibe",
  becher: "Becher",
};

export type IngredientRowState = {
  id: string; // crypto.randomUUID() — stable React key
  searchText: string; // controlled input for autocomplete
  ingredientId: string | null; // set on selection
  ingredientName: string; // display name after selection
  amount: string; // string for controlled input
  unit: string; // Unit enum value, default "g"
  suggestions: { id: string; name: string }[];
  showDropdown: boolean;
};

type Props = {
  row: IngredientRowState;
  onSearchChange: (text: string) => void;
  onSuggestionSelect: (suggestion: { id: string; name: string }) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAmountChange: (amount: string) => void;
  onUnitChange: (unit: string) => void;
  onRemove: () => void;
};

export function IngredientRowEditor({
  row,
  onSearchChange,
  onSuggestionSelect,
  onBlur,
  onKeyDown,
  onAmountChange,
  onUnitChange,
  onRemove,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {/* Ingredient search with autocomplete */}
      <div className="relative min-w-0 flex-1">
        <input
          type="text"
          value={row.searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder="Zutat suchen..."
          autoComplete="off"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {row.showDropdown && row.suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {row.suggestions.map((s) => (
              <li
                key={s.id}
                onMouseDown={() => onSuggestionSelect(s)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-background"
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Amount */}
      <input
        type="text"
        inputMode="decimal"
        value={row.amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="Menge"
        className="w-20 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Unit */}
      <select
        value={row.unit}
        onChange={(e) => onUnitChange(e.target.value)}
        className="rounded-lg border border-border px-2 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {Object.entries(UNIT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Remove row */}
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 rounded-lg border border-border p-2 text-sm text-muted hover:border-red-300 hover:text-red-500"
        aria-label="Zutat entfernen"
      >
        &times;
      </button>
    </div>
  );
}
