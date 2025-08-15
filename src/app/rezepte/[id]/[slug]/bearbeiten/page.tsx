"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Difficulty = "einfach" | "mittel" | "schwer";

interface Unit { id: string; name: string; short_name?: string | null }
interface Category { id: string; name: string }

type IngredientLink =
  | { kind: "product"; product_id: string; label: string }
  | { kind: "group"; product_group_id: string; label: string }
  | { kind: "custom"; custom_ingredient_name: string };

type ProductOrGroup = {
  id: string;
  title: string;
  rank: number;
  src: "fts" | "fuzzy" | "exact";
  icon: string;
  category_id: string;
  type?: "product" | "group";
};

interface IngredientRow {
  tempId: string;
  quantity: string;
  unit_id: string | null;
  link: IngredientLink | null;
  sort_order: number;
}

interface Section {
  tempId: string;
  name: string;
  sort_order: number;
  ingredients: IngredientRow[];
}

interface StepRow { step_number: number; instruction: string }

function generateId(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function EditRecipePage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [portions, setPortions] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("mittel");
  const [categoryId, setCategoryId] = useState<string | "">("");
  const [workingMinutes, setWorkingMinutes] = useState<string>("");
  const [cookingMinutes, setCookingMinutes] = useState<string>("");
  const [restingMinutes, setRestingMinutes] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Ingredient search state (mirror create form behavior)
  const [searchQueryByIngredientId, setSearchQueryByIngredientId] = useState<Record<string, string>>({});
  const [searchResultsByIngredientId, setSearchResultsByIngredientId] = useState<Record<string, ProductOrGroup[]>>({});
  const [searchLoadingByIngredientId, setSearchLoadingByIngredientId] = useState<Record<string, boolean>>({});
  const [isSelectingByClickByIngredientId, setIsSelectingByClickByIngredientId] = useState<Record<string, boolean>>({});
  const [isDropdownOpenByIngredientId, setIsDropdownOpenByIngredientId] = useState<Record<string, boolean>>({});

  async function searchIngredients(ingTempId: string, term: string) {
    setSearchQueryByIngredientId((prev) => ({ ...prev, [ingTempId]: term }));
    if (!term || term.trim().length < 2) {
      setSearchResultsByIngredientId((p) => ({ ...p, [ingTempId]: [] }));
      return;
    }
    setSearchLoadingByIngredientId((p) => ({ ...p, [ingTempId]: true }));
    try {
      const { data } = await supabase.rpc("search_products_and_groups", {
        term,
        limit_fts: 10,
        limit_fuzzy: 5,
      });
      setSearchResultsByIngredientId((p) => ({ ...p, [ingTempId]: (data || []) as ProductOrGroup[] }));
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

  useEffect(() => {
    const load = async () => {
      try {
        const resolved = await params;
        const [unitsRes, catRes] = await Promise.all([
          supabase.from("recipe_units").select("id, name, short_name, sort_order").order("sort_order", { ascending: true }),
          supabase.from("recipe_categories").select("id, name, sort_order").order("sort_order", { ascending: true }),
        ]);
        if (!unitsRes.error && unitsRes.data) setUnits(unitsRes.data as any);
        if (!catRes.error && catRes.data) setCategories(catRes.data as any);

        const { data: recipe } = await supabase
          .from("recipes_with_details")
          .select(
            "id, name, description, portions, difficulty, category_id, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url"
          )
          .eq("id", resolved.id)
          .maybeSingle();
        if (!recipe) throw new Error("Rezept nicht gefunden");

        setName((recipe as any).name);
        setDescription(((recipe as any).description as string) || "");
        setPortions((recipe as any).portions);
        setDifficulty((recipe as any).difficulty);
        setCategoryId(((recipe as any).category_id as string) || "");
        setWorkingMinutes(((recipe as any).working_time_minutes as number | null)?.toString() || "");
        setCookingMinutes(((recipe as any).cooking_time_minutes as number | null)?.toString() || "");
        setRestingMinutes(((recipe as any).resting_time_minutes as number | null)?.toString() || "");
        if ((recipe as any).image_url) setImagePreview((recipe as any).image_url as string);

        const { data: ing } = await supabase
          .from("recipe_ingredients_with_details")
          .select(
            "id, section_name, section_sort_order, quantity, unit_id, unit_name, unit_short_name, product_group_id, product_id, custom_ingredient_name, ingredient_display_name, sort_order"
          )
          .eq("recipe_id", resolved.id)
          .order("section_sort_order", { ascending: true, nullsFirst: true })
          .order("sort_order", { ascending: true });

        const bySection = new Map<string, Section>();
        (ing || []).forEach((row: any) => {
          const key = row.section_name ?? "__default__";
          if (!bySection.has(key)) {
            bySection.set(key, {
              tempId: generateId("section"),
              name: row.section_name || "",
              sort_order: row.section_sort_order ?? 0,
              ingredients: [],
            });
          }
          const section = bySection.get(key)!;
          const link: IngredientLink | null = row.product_id
            ? { kind: "product", product_id: row.product_id, label: row.ingredient_display_name }
            : row.product_group_id
            ? { kind: "group", product_group_id: row.product_group_id, label: row.ingredient_display_name }
            : row.custom_ingredient_name
            ? { kind: "custom", custom_ingredient_name: row.custom_ingredient_name }
            : null;
          section.ingredients.push({
            tempId: generateId("ing"),
            quantity: String(row.quantity ?? ""),
            unit_id: row.unit_id || null,
            link,
            sort_order: row.sort_order ?? 0,
          });
        });

        const sectionsArr = Array.from(bySection.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        // Prefill search input text for each ingredient with its display name (product/group) or custom name
        const initialSearch: Record<string, string> = {};
        for (const sec of sectionsArr) {
          for (const ingRow of sec.ingredients) {
            if (ingRow.link?.kind === 'custom' && ingRow.link.custom_ingredient_name) {
              initialSearch[ingRow.tempId] = ingRow.link.custom_ingredient_name;
            } else if ((ingRow as any).link && (ingRow as any).link.label) {
              initialSearch[ingRow.tempId] = (ingRow as any).link.label as string;
            }
          }
        }

        setSections(sectionsArr.length > 0 ? sectionsArr : [{ tempId: generateId("section"), name: "", sort_order: 0, ingredients: [] }]);
        setSearchQueryByIngredientId(initialSearch);

        const { data: stepsData } = await supabase
          .from("recipe_steps_with_details")
          .select("step_number, instruction")
          .eq("recipe_id", resolved.id)
          .order("step_number", { ascending: true });
        setSteps(((stepsData as any[]) || []).map((s) => ({ step_number: s.step_number, instruction: s.instruction })));
      } catch (e: any) {
        setError(e?.message || "Fehler beim Laden des Rezepts");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params, supabase]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      // optional: upload new image
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `recipes/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { data: storageData, error: storageErr } = await supabase.storage.from('public-bucket').upload(path, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });
        if (!storageErr && storageData) {
          const { data: publicUrl } = supabase.storage.from('public-bucket').getPublicUrl(storageData.path);
          uploadedImageUrl = publicUrl.publicUrl;
        }
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        portions,
        difficulty,
        category_id: categoryId || null,
        working_time_minutes: workingMinutes ? Number(workingMinutes) : null,
        cooking_time_minutes: cookingMinutes ? Number(cookingMinutes) : null,
        resting_time_minutes: restingMinutes ? Number(restingMinutes) : null,
        image_url: uploadedImageUrl ?? undefined,
        sections: sections.map((s) => ({ tempId: s.tempId, name: s.name.trim(), sort_order: s.sort_order })),
        ingredients: sections.flatMap((s) =>
          s.ingredients.map((ing, idx) => ({
            sectionTempId: s.name.trim() ? s.tempId : null,
            quantity: Number(ing.quantity || 0),
            unit_id: ing.unit_id || null,
            product_group_id: ing.link?.kind === "group" ? (ing.link as any).product_group_id : null,
            product_id: ing.link?.kind === "product" ? (ing.link as any).product_id : null,
            custom_ingredient_name: ing.link?.kind === "custom" ? (ing.link as any).custom_ingredient_name : null,
            sort_order: idx,
          }))
        ),
        steps: steps.map((s) => ({ step_number: s.step_number, instruction: s.instruction.trim() })).filter((s) => s.instruction),
      };

      const resolved = await params;
      const res = await fetch(`/api/recipes/${resolved.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Speichern fehlgeschlagen");
      }
      setSuccess("Rezept gespeichert.");
      // Optional: zurück zur Detailseite
      // router.push(`/rezepte/${params.id}/${encodeURIComponent(params.slug)}`)
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 py-8"><div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">Laden...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rezept bearbeiten</h1>
          <p className="text-gray-600">Passe dein Rezept an und speichere die Änderungen</p>
        </div>

        {error && <div className="bg-red-50 text-red-800 border border-red-200 rounded p-3 text-sm mb-6">{error}</div>}
        {success && <div className="bg-green-50 text-green-800 border border-green-200 rounded p-3 text-sm mb-6">{success}</div>}

        <form onSubmit={onSave} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Titelbild (optional)</label>
            <div className="mt-1 flex items-center gap-4">
              <input type="file" accept="image/*" onChange={(e)=> { const f=e.target.files?.[0] || null; setImageFile(f); setImagePreview(f ? URL.createObjectURL(f) : imagePreview); }} className="rounded" />
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Vorschau" className="h-16 w-16 object-cover rounded border" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rezeptname</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded" placeholder="z.B. Milchreis" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Zusätzliche Info</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded" placeholder="z.B. nach Omas Art" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Portionen</label>
            <input type="number" min={1} value={portions} onChange={(e) => setPortions(Number(e.target.value))} className="mt-1 w-full rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Kategorie</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded">
              <option value="">- Keine -</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Schwierigkeit</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="mt-1 w-full rounded">
              <option value="einfach">einfach</option>
              <option value="mittel">mittel</option>
              <option value="schwer">schwer</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4 col-span-1 md:col-span-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Arbeitszeit (Minuten)</label>
              <input type="number" min={0} value={workingMinutes} onChange={(e) => setWorkingMinutes(e.target.value)} className="mt-1 w-full rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Koch/Backzeit (Minuten)</label>
              <input type="number" min={0} value={cookingMinutes} onChange={(e) => setCookingMinutes(e.target.value)} className="mt-1 w-full rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ruhezeit (Minuten)</label>
              <input type="number" min={0} value={restingMinutes} onChange={(e) => setRestingMinutes(e.target.value)} className="mt-1 w-full rounded" />
            </div>
          </div>
        </div>

        {/* Ingredients minimal editing: list section + items */}
        <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Zutaten</h3>
            </div>
          <div className="space-y-6">
            {sections.map((section, sIdx) => (
              <div key={section.tempId} className="border rounded p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input value={section.name} onChange={(e) => setSections((prev) => prev.map((s, i) => i === sIdx ? { ...s, name: e.target.value } : s))} className="flex-1 rounded" placeholder="Abschnittsname (optional, z.B. Tortenboden)" />
                  </div>
                <div className="space-y-3">
                  {section.ingredients.map((ing, iIdx) => (
                    <div key={ing.tempId} className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500">Menge</label>
                          <input type="number" min={0} step="0.01" value={ing.quantity} onChange={(e) => setSections((prev) => { const cp=[...prev]; const sec={...cp[sIdx]}; const ings=[...sec.ingredients]; ings[iIdx] = { ...ings[iIdx], quantity: e.target.value }; sec.ingredients=ings; cp[sIdx]=sec; return cp; })} className="mt-1 w-full rounded" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500">Einheit</label>
                          <select value={ing.unit_id || ""} onChange={(e) => setSections((prev) => { const cp=[...prev]; const sec={...cp[sIdx]}; const ings=[...sec.ingredients]; ings[iIdx] = { ...ings[iIdx], unit_id: e.target.value || null }; sec.ingredients=ings; cp[sIdx]=sec; return cp; })} className="mt-1 w-full rounded">
                        <option value="">-</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{u.short_name || u.name}</option>)}
                      </select>
                        </div>
                        <div className="col-span-7">
                          <label className="block text-xs text-gray-500">Zutat</label>
                          <div className="relative">
                            <input
                              value={
                                ing.link?.kind === 'custom'
                                  ? ing.link.custom_ingredient_name
                                  : (searchQueryByIngredientId[ing.tempId] ?? '')
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                // set as custom while typing; selection can override via dropdown
                                updateIngredient(sIdx, iIdx, (cur) => ({
                                  ...cur,
                                  link: val ? { kind: 'custom', custom_ingredient_name: val } as any : null,
                                }));
                                setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: val }));
                                setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: true }));
                                searchIngredients(ing.tempId, val);
                              }}
                              onFocus={() => {
                                const current = searchQueryByIngredientId[ing.tempId] ?? '';
                                if (current.trim()) {
                                  setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: true }));
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  const selecting = !!isSelectingByClickByIngredientId[ing.tempId];
                                  if (selecting) {
                                    setIsSelectingByClickByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                    return;
                                  }
                                  const userText = (searchQueryByIngredientId[ing.tempId] ?? (ing.link?.kind === 'custom' ? ing.link.custom_ingredient_name : '')) || '';
                                  const trimmed = userText.trim();
                                  if (!trimmed) {
                                    setSearchResultsByIngredientId((p) => ({ ...p, [ing.tempId]: [] }));
                                    setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                    return;
                                  }
                                  const results = searchResultsByIngredientId[ing.tempId] || [];
                                  const hasExact = results.some((r) => r.title.toLowerCase() === trimmed.toLowerCase());
                                  if (!hasExact) {
                                    updateIngredient(sIdx, iIdx, (cur) => ({
                                      ...cur,
                                      link: { kind: 'custom', custom_ingredient_name: trimmed },
                                    }));
                                    setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: trimmed }));
                                    setSearchResultsByIngredientId((p) => ({ ...p, [ing.tempId]: [] }));
                                    setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                    return;
                                  }
                                  if (results.length > 0) {
                                    const r = results[0];
                                    updateIngredient(sIdx, iIdx, (cur) => ({
                                      ...cur,
                                      link:
                                        r.type === 'product'
                                          ? { kind: 'product', product_id: r.id, label: r.title }
                                          : { kind: 'group', product_group_id: r.id, label: r.title },
                                    }));
                                    setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: r.title }));
                                    setSearchResultsByIngredientId((p) => ({ ...p, [ing.tempId]: [] }));
                                    setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                  }
                                }, 120);
                              }}
                              className="mt-1 w-full rounded"
                              placeholder="Suche nach Zutat (Produkt oder Produktgruppe) oder frei eingeben"
                            />
                            {(() => {
                              const userText = (searchQueryByIngredientId[ing.tempId] ?? (ing.link?.kind === 'custom' ? ing.link.custom_ingredient_name : '')) || '';
                              const trimmed = userText.trim();
                              const results = searchResultsByIngredientId[ing.tempId] || [];
                              if (!trimmed) return null;
                              const isOpen = !!isDropdownOpenByIngredientId[ing.tempId];
                              if (!isOpen) return null;
                              const hasExact = results.some((r) => r.title.toLowerCase() === trimmed.toLowerCase());
                              return (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow text-gray-900">
                                  <ul className="max-h-56 overflow-auto divide-y divide-gray-100">
                                    {!hasExact && (
                                      <li
                                        key={"custom-" + ing.tempId}
                                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-900"
                                        onMouseDown={() => {
                                          setIsSelectingByClickByIngredientId((p) => ({ ...p, [ing.tempId]: true }));
                                        }}
                                        onClick={() => {
                                          updateIngredient(sIdx, iIdx, (cur) => ({
                                            ...cur,
                                            link: { kind: 'custom', custom_ingredient_name: trimmed },
                                          }));
                                          setSearchResultsByIngredientId((p) => ({ ...p, [ing.tempId]: [] }));
                                          setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: trimmed }));
                                          setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                          setIsSelectingByClickByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                        }}
                                      >
                                        {trimmed}
                                      </li>
                                    )}
                                    {results.map((r) => (
                                      <li
                                        key={r.id + (r.type || '')}
                                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-900"
                                        onMouseDown={() => {
                                          setIsSelectingByClickByIngredientId((p) => ({ ...p, [ing.tempId]: true }));
                                        }}
                                        onClick={() => {
                                          updateIngredient(sIdx, iIdx, (cur) => ({
                                            ...cur,
                                            link:
                                              r.type === 'product'
                                                ? { kind: 'product', product_id: r.id, label: r.title }
                                                : { kind: 'group', product_group_id: r.id, label: r.title },
                                          }));
                                          setSearchResultsByIngredientId((p) => ({ ...p, [ing.tempId]: [] }));
                                          setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: r.title }));
                                          setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                          setIsSelectingByClickByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                        }}
                                      >
                                        {r.title} {r.type ? `(${r.type})` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}
                            {ing.link && (ing as any).label && (
                              <div className="text-xs text-gray-500 mt-1">Ausgewählt: {(ing as any).label}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 flex h-full items-start justify-center pt-3">
                          <button type="button" onClick={() => setSections((prev) => { const cp=[...prev]; const sec={...cp[sIdx]}; sec.ingredients = sec.ingredients.filter((_, j)=> j!==iIdx).map((ing2, j)=> ({...ing2, sort_order: j})); cp[sIdx]=sec; return cp; })} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded">Löschen</button>
                      </div>
                    </div>
                  ))}
                </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSections((prev) => {
                        const copy = [...prev];
                        const sec = { ...copy[sIdx] };
                        const next: IngredientRow = { tempId: generateId('ing'), quantity: '', unit_id: null, link: null, sort_order: sec.ingredients.length };
                        sec.ingredients = [...sec.ingredients, next];
                        copy[sIdx] = sec;
                        return copy;
                      })}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      Zutat hinzufügen
                    </button>
                </div>
              </div>
            ))}
          </div>
            <div className="mt-4">
              <button type="button" onClick={() => setSections((prev)=> [...prev, { tempId: generateId('section'), name: '', sort_order: prev.length, ingredients: [] }])} className="text-sm text-orange-600 hover:text-orange-700">Abschnitt hinzufügen</button>
          </div>
        </div>

        <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Zubereitung</h3>
            </div>
          <div className="space-y-3">
            {steps.map((st, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-1 flex items-center h-10"><span className="text-gray-500 text-sm">{st.step_number}.</span></div>
                  <textarea value={st.instruction} onChange={(e) => setSteps((prev)=> prev.map((s, idx)=> idx===i ? { ...s, instruction: e.target.value } : s))} className="col-span-10 rounded min-h-28" rows={6} />
                  <div className="col-span-1 flex h-full items-center justify-center"><button type="button" onClick={()=> setSteps((prev)=> prev.filter((_, idx)=> idx!==i).map((s, idx)=> ({...s, step_number: idx+1})))} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded">Löschen</button></div>
              </div>
            ))}
          </div>
            <div className="mt-4">
              <button type="button" onClick={() => setSteps((prev)=> [...prev, { step_number: prev.length + 1, instruction: '' }])} className="text-sm text-orange-600 hover:text-orange-700">Schritt hinzufügen</button>
          </div>
        </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50">
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

