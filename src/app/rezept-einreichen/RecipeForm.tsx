"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import FontAwesomeIcon from "@/components/FontAwesomeIcon";

type Difficulty = "einfach" | "mittel" | "schwer";

interface Unit {
  id: string;
  name: string;
  short_name?: string | null;
}

interface RecipeCategory {
  id: string;
  name: string;
}

export interface ProductOrGroup {
  id: string;
  title: string;
  rank: number;
  src: "fts" | "fuzzy" | "exact";
  icon: string;
  category_id: string;
  type?: "product" | "group";
}

type IngredientLink =
  | { kind: "product"; product_id: string; label: string }
  | { kind: "group"; product_group_id: string; label: string }
  | { kind: "custom"; custom_ingredient_name: string };

interface IngredientRow {
  tempId: string;
  quantity: string; // keep as string for input control, convert to number on submit
  unit_id: string | null;
  link: IngredientLink | null;
  sort_order: number;
}

interface Section {
  tempId: string;
  name: string; // empty name means default unnamed section
  sort_order: number;
  ingredients: IngredientRow[];
}

interface StepRow {
  step_number: number; // 1-based
  instruction: string;
}

interface CreateRecipeRequestBody {
  name: string;
  description?: string;
  portions: number;
  difficulty: Difficulty;
  category_id: string | null;
  working_time_minutes?: number | null;
  cooking_time_minutes?: number | null;
  resting_time_minutes?: number | null;
  sections: Array<{ tempId: string; name: string; sort_order: number }>;
  ingredients: Array<{
    sectionTempId: string | null;
    quantity: number;
    unit_id: string | null;
    product_group_id?: string | null;
    product_id?: string | null;
    custom_ingredient_name?: string | null;
    sort_order: number;
  }>;
  steps: Array<{ step_number: number; instruction: string }>;
}

function generateId(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function RecipeForm() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);

  // form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [portions, setPortions] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>("mittel");
  const [categoryId, setCategoryId] = useState<string | "">("");
  const [workingMinutes, setWorkingMinutes] = useState<string>("");
  const [cookingMinutes, setCookingMinutes] = useState<string>("");
  const [restingMinutes, setRestingMinutes] = useState<string>("");

  const [sections, setSections] = useState<Section[]>([
    {
      tempId: generateId("section"),
      name: "", // unnamed default section
      sort_order: 0,
      ingredients: [
        {
          tempId: generateId("ing"),
          quantity: "",
          unit_id: null,
          link: null,
          sort_order: 0,
        },
      ],
    },
  ]);

  const [steps, setSteps] = useState<StepRow[]>([
    { step_number: 1, instruction: "" },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadBasics = async () => {
      setLoading(true);
      try {
        const [unitsRes, catRes] = await Promise.all([
          supabase.from("units").select("id, name, short_name").order("name"),
          supabase.from("recipe_categories").select("id, name").order("name"),
        ]);

        if (!unitsRes.error && unitsRes.data) setUnits(unitsRes.data as Unit[]);
        if (!catRes.error && catRes.data)
          setCategories(catRes.data as RecipeCategory[]);
      } finally {
        setLoading(false);
      }
    };
    loadBasics();
  }, [supabase]);

  // Ingredient search state per row
  const [searchQueryByIngredientId, setSearchQueryByIngredientId] = useState<Record<string, string>>({});
  const [searchResultsByIngredientId, setSearchResultsByIngredientId] = useState<Record<string, ProductOrGroup[]>>({});
  const [searchLoadingByIngredientId, setSearchLoadingByIngredientId] = useState<Record<string, boolean>>({});

  async function searchIngredients(ingTempId: string, term: string) {
    setSearchQueryByIngredientId((prev) => ({ ...prev, [ingTempId]: term }));
    if (!term || term.trim().length < 2) {
      setSearchResultsByIngredientId((p) => ({ ...p, [ingTempId]: [] }));
      return;
    }
    setSearchLoadingByIngredientId((p) => ({ ...p, [ingTempId]: true }));
    try {
      const { data, error } = await supabase.rpc("search_products_and_groups", {
        term,
        limit_fts: 10,
        limit_fuzzy: 5,
      });
      if (!error) {
        setSearchResultsByIngredientId((p) => ({ ...p, [ingTempId]: (data || []) as ProductOrGroup[] }));
      }
    } finally {
      setSearchLoadingByIngredientId((p) => ({ ...p, [ingTempId]: false }));
    }
  }

  function updateIngredient(sectionIdx: number, ingIdx: number, updater: (ing: IngredientRow) => IngredientRow) {
    setSections((prev) => {
      const copy = [...prev];
      const section = { ...copy[sectionIdx] };
      const ingredients = [...section.ingredients];
      ingredients[ingIdx] = updater(ingredients[ingIdx]);
      section.ingredients = ingredients;
      copy[sectionIdx] = section;
      return copy;
    });
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        tempId: generateId("section"),
        name: "",
        sort_order: prev.length,
        ingredients: [
          {
            tempId: generateId("ing"),
            quantity: "",
            unit_id: null,
            link: null,
            sort_order: 0,
          },
        ],
      },
    ]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sort_order: i })));
  }

  function addIngredient(sectionIdx: number) {
    setSections((prev) => {
      const copy = [...prev];
      const section = { ...copy[sectionIdx] };
      section.ingredients = [
        ...section.ingredients,
        {
          tempId: generateId("ing"),
          quantity: "",
          unit_id: null,
          link: null,
          sort_order: section.ingredients.length,
        },
      ];
      copy[sectionIdx] = section;
      return copy;
    });
  }

  function removeIngredient(sectionIdx: number, ingIdx: number) {
    setSections((prev) => {
      const copy = [...prev];
      const section = { ...copy[sectionIdx] };
      section.ingredients = section.ingredients
        .filter((_, i) => i !== ingIdx)
        .map((ing, i) => ({ ...ing, sort_order: i }));
      copy[sectionIdx] = section;
      return copy;
    });
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { step_number: prev.length + 1, instruction: "" },
    ]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 })));
  }

  function validate(): string | null {
    if (!name.trim()) return "Bitte einen Rezeptnamen eingeben.";
    if (!portions || portions < 1) return "Bitte die Portionen angeben (>= 1).";
    // basic ingredient validation: at least one ingredient with link or custom name and quantity
    const anyIngredient = sections.some((sec) =>
      sec.ingredients.some((ing) => ing.quantity.trim() && (ing.link != null))
    );
    if (!anyIngredient) return "Bitte mindestens eine Zutat mit Menge und Namen auswählen.";
    // steps validation
    const anyStep = steps.some((s) => s.instruction.trim());
    if (!anyStep) return "Bitte mindestens einen Zubereitungsschritt eingeben.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const body: CreateRecipeRequestBody = {
        name: name.trim(),
        description: description.trim() || undefined,
        portions,
        difficulty,
        category_id: categoryId || null,
        working_time_minutes: workingMinutes ? Number(workingMinutes) : null,
        cooking_time_minutes: cookingMinutes ? Number(cookingMinutes) : null,
        resting_time_minutes: restingMinutes ? Number(restingMinutes) : null,
        sections: sections.map((s) => ({ tempId: s.tempId, name: s.name.trim(), sort_order: s.sort_order })),
        ingredients: sections.flatMap((s) =>
          s.ingredients
            .filter((ing) => ing.quantity.trim() && ing.link)
            .map((ing) => ({
              sectionTempId: s.name.trim() ? s.tempId : null, // unnamed/default section -> null section_id
              quantity: Number(ing.quantity),
              unit_id: ing.unit_id || null,
              product_group_id: ing.link?.kind === "group" ? ing.link.product_group_id : null,
              product_id: ing.link?.kind === "product" ? ing.link.product_id : null,
              custom_ingredient_name: ing.link?.kind === "custom" ? ing.link.custom_ingredient_name : null,
              sort_order: ing.sort_order,
            }))
        ),
        steps: steps
          .filter((s) => s.instruction.trim())
          .map((s) => ({ step_number: s.step_number, instruction: s.instruction.trim() })),
      };

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Erstellen fehlgeschlagen");
      }
      const data = await res.json();
      setSuccess("Rezept erfolgreich erstellt.");
      // Optionally redirect to recipe page later
      // Reset form minimal
      setName("");
      setDescription("");
      setPortions(4);
      setDifficulty("mittel");
      setCategoryId("");
      setWorkingMinutes("");
      setCookingMinutes("");
      setRestingMinutes("");
      setSections([
        {
          tempId: generateId("section"),
          name: "",
          sort_order: 0,
          ingredients: [
            { tempId: generateId("ing"), quantity: "", unit_id: null, link: null, sort_order: 0 },
          ],
        },
      ]);
      setSteps([{ step_number: 1, instruction: "" }]);
    } catch (e: any) {
      setError(e?.message || "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 rounded p-3 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-800 border border-green-200 rounded p-3 text-sm">{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rezeptname</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
            placeholder="z.B. Milchreis"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Zusätzliche Info</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
            placeholder="z.B. nach Omas Art"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Portionen</label>
          <input
            type="number"
            min={1}
            value={portions}
            onChange={(e) => setPortions(Number(e.target.value))}
            className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Kategorie</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
          >
            <option value="">- Keine -</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Schwierigkeit</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
          >
            <option value="einfach">einfach</option>
            <option value="mittel">mittel</option>
            <option value="schwer">schwer</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4 col-span-1 md:col-span-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Arbeitszeit (Minuten)</label>
            <input
              type="number"
              min={0}
              value={workingMinutes}
              onChange={(e) => setWorkingMinutes(e.target.value)}
              className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Koch/Backzeit (Minuten)</label>
            <input
              type="number"
              min={0}
              value={cookingMinutes}
              onChange={(e) => setCookingMinutes(e.target.value)}
              className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ruhezeit (Minuten)</label>
            <input
              type="number"
              min={0}
              value={restingMinutes}
              onChange={(e) => setRestingMinutes(e.target.value)}
              className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Zutaten</h3>
        </div>
        <div className="space-y-6">
          {sections.map((section, sIdx) => (
            <div key={section.tempId} className="border rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => setSections((prev) => prev.map((s, i) => i === sIdx ? { ...s, name: e.target.value } : s))}
                  className="flex-1 rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
                  placeholder="Abschnittsname (optional, z.B. Tortenboden)"
                />
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(sIdx)}
                    aria-label="Abschnitt entfernen"
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    <FontAwesomeIcon icon="trash" size="sm" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {section.ingredients.map((ing, iIdx) => (
                  <div key={ing.tempId} className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">Menge</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(sIdx, iIdx, (cur) => ({ ...cur, quantity: e.target.value }))}
                        className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">Einheit</label>
                      <select
                        value={ing.unit_id || ""}
                        onChange={(e) => updateIngredient(sIdx, iIdx, (cur) => ({ ...cur, unit_id: e.target.value || null }))}
                        className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
                      >
                        <option value="">-</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.short_name || u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-7">
                      <label className="block text-xs text-gray-500">Zutat</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            ing.link?.kind === "custom"
                              ? ing.link.custom_ingredient_name
                              : (searchQueryByIngredientId[ing.tempId] ?? "")
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            // setting as custom if user types and then leaves without selecting
                            updateIngredient(sIdx, iIdx, (cur) => ({
                              ...cur,
                              link: val ? { kind: "custom", custom_ingredient_name: val } : null,
                            }));
                            setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: val }));
                            searchIngredients(ing.tempId, val);
                          }}
                          className="mt-1 w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
                          placeholder="Suche nach Zutat (Produkt oder Produktgruppe) oder frei eingeben"
                        />
                        {/* Results dropdown */}
                        {searchResultsByIngredientId[ing.tempId]?.length ? (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow">
                            <ul className="max-h-56 overflow-auto">
                              {searchResultsByIngredientId[ing.tempId].map((r) => (
                                <li
                                  key={r.id + (r.type || "")}
                                  className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm"
                                  onClick={() => {
                                    updateIngredient(sIdx, iIdx, (cur) => ({
                                      ...cur,
                                      link:
                                        r.type === "product"
                                          ? { kind: "product", product_id: r.id, label: r.title }
                                          : { kind: "group", product_group_id: r.id, label: r.title },
                                    }));
                                    setSearchResultsByIngredientId((p) => ({ ...p, [ing.tempId]: [] }));
                                    setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: r.title }));
                                  }}
                                >
                                  {r.title} {r.type ? `(${r.type})` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {ing.link && (ing.link as any).label && (
                          <div className="text-xs text-gray-500 mt-1">Ausgewählt: {(ing.link as any).label}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 flex h-full items-start justify-center pt-3">
                      <button
                        type="button"
                        onClick={() => removeIngredient(sIdx, iIdx)}
                        aria-label="Zutat entfernen"
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500/40"
                      >
                        <FontAwesomeIcon icon="trash" size="sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button type="button" onClick={() => addIngredient(sIdx)} className="text-sm text-orange-600 hover:text-orange-700">Zutat hinzufügen</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button type="button" onClick={addSection} className="text-sm text-orange-600 hover:text-orange-700">Abschnitt hinzufügen</button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Zubereitung</h3>
        </div>
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-stretch">
              <div className="col-span-1 flex items-center h-10">
                <span className="text-gray-500 text-sm">{step.step_number}.</span>
              </div>
              <div className="col-span-10">
                <textarea
                  value={step.instruction}
                  onChange={(e) => setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, instruction: e.target.value } : s))}
                  className="w-full rounded border-gray-400 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm min-h-28"
                  placeholder="Zubereitungsschritt"
                  rows={6}
                />
              </div>
              <div className="col-span-1 flex h-full items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  aria-label="Schritt entfernen"
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500/40"
                >
                  <FontAwesomeIcon icon="trash" size="sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button type="button" onClick={addStep} className="text-sm text-orange-600 hover:text-orange-700">Schritt hinzufügen</button>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Speichern..." : "Rezept erstellen"}
        </button>
      </div>
    </form>
  );
}

