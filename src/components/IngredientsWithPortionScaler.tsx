"use client";

import { useMemo, useState } from "react";

type IngredientItem = {
  id: string;
  quantity: number;
  unit_name: string | null;
  unit_short_name: string | null;
  ingredient_display_name: string;
};

type IngredientGroup = {
  name: string | null;
  items: IngredientItem[];
};

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function IngredientsWithPortionScaler(props: {
  initialPortions: number;
  initialGroups: IngredientGroup[];
}) {
  const { initialPortions, initialGroups } = props;

  const [portions, setPortions] = useState<number>(
    Math.max(1, Math.round(initialPortions || 1))
  );

  const scaleFactor = portions / Math.max(1, initialPortions || 1);

  const scaledGroups = useMemo(() => {
    return initialGroups.map((group) => ({
      name: group.name,
      items: group.items.map((ing) => ({
        ...ing,
        quantity: ing.quantity * scaleFactor,
      })),
    }));
  }, [initialGroups, scaleFactor]);

  function onMinus() {
    setPortions((prev) => Math.max(1, prev - 1));
  }

  function onPlus() {
    setPortions((prev) => prev + 1);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      setPortions(Math.round(parsed));
    } else if (raw === "") {
      // ignore empty transient state
    } else {
      setPortions(1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <label htmlFor="portions-input" className="text-sm text-gray-700">Portionen</label>
        <button
          type="button"
          onClick={onMinus}
          className="h-9 w-9 flex items-center justify-center rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          aria-label="Portion verringern"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          step={1}
          value={portions}
          onChange={onInputChange}
          id="portions-input"
          className="h-9 w-16 text-center rounded border border-gray-300"
          aria-label="Portionen"
        />
        <button
          type="button"
          onClick={onPlus}
          className="h-9 w-9 flex items-center justify-center rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          aria-label="Portion erhöhen"
        >
          +
        </button>
      </div>

      {scaledGroups.map((group, idx) => (
        <div key={idx}>
          {group.name && (
            <h3 className="text-sm font-medium text-gray-700 mb-2">{group.name}</h3>
          )}
          <ul className="space-y-2">
            {group.items.map((ing) => (
              <li key={ing.id} className="flex items-start justify-between">
                <span className="text-gray-900">
                  {formatQuantity(ing.quantity)} {ing.unit_name || ing.unit_short_name || ""} {ing.ingredient_display_name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

