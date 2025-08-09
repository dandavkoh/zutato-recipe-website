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

  useEffect(() => {
    const load = async () => {
      try {
        const resolved = await params;
        const [unitsRes, catRes] = await Promise.all([
          supabase.from("recipe_units").select("id, name, short_name").order("name"),
          supabase.from("recipe_categories").select("id, name").order("name"),
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
        setSections(sectionsArr.length > 0 ? sectionsArr : [{ tempId: generateId("section"), name: "", sort_order: 0, ingredients: [] }]);

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
        const { data: storageData, error: storageErr } = await supabase.storage.from('recipes').upload(path, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });
        if (!storageErr && storageData) {
          const { data: publicUrl } = supabase.storage.from('recipes').getPublicUrl(storageData.path);
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

  if (loading) return <div className="max-w-5xl mx-auto p-6">Laden...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Rezept bearbeiten</h1>
      {error && <div className="bg-red-50 text-red-800 border border-red-200 rounded p-3 text-sm mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-800 border border-green-200 rounded p-3 text-sm mb-4">{success}</div>}
      <form onSubmit={onSave} className="space-y-6">
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
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Zusätzliche Info</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded" />
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
          <h2 className="text-lg font-semibold mb-2">Zutaten</h2>
          <div className="space-y-6">
            {sections.map((section, sIdx) => (
              <div key={section.tempId} className="border rounded p-4">
                <input value={section.name} onChange={(e) => setSections((prev) => prev.map((s, i) => i === sIdx ? { ...s, name: e.target.value } : s))} className="w-full rounded mb-3" placeholder="Abschnittsname (optional)" />
                <div className="space-y-3">
                  {section.ingredients.map((ing, iIdx) => (
                    <div key={ing.tempId} className="grid grid-cols-12 gap-3 items-start">
                      <input type="number" min={0} step="0.01" value={ing.quantity} onChange={(e) => setSections((prev) => { const cp=[...prev]; const sec={...cp[sIdx]}; const ings=[...sec.ingredients]; ings[iIdx] = { ...ings[iIdx], quantity: e.target.value }; sec.ingredients=ings; cp[sIdx]=sec; return cp; })} className="col-span-2 rounded" />
                      <select value={ing.unit_id || ""} onChange={(e) => setSections((prev) => { const cp=[...prev]; const sec={...cp[sIdx]}; const ings=[...sec.ingredients]; ings[iIdx] = { ...ings[iIdx], unit_id: e.target.value || null }; sec.ingredients=ings; cp[sIdx]=sec; return cp; })} className="col-span-2 rounded">
                        <option value="">-</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{u.short_name || u.name}</option>)}
                      </select>
                      <input value={ing.link?.kind === 'custom' ? ing.link.custom_ingredient_name : (ing as any).label || ''} onChange={(e) => setSections((prev) => { const cp=[...prev]; const sec={...cp[sIdx]}; const ings=[...sec.ingredients]; const val=e.target.value; ings[iIdx] = { ...ings[iIdx], link: val ? { kind: 'custom', custom_ingredient_name: val } as any : null }; sec.ingredients=ings; cp[sIdx]=sec; return cp; })} className="col-span-7 rounded" placeholder="Zutat" />
                      <div className="col-span-1 flex items-center justify-center">
                        <button type="button" onClick={() => setSections((prev) => { const cp=[...prev]; const sec={...cp[sIdx]}; sec.ingredients = sec.ingredients.filter((_, j)=> j!==iIdx).map((ing2, j)=> ({...ing2, sort_order: j})); cp[sIdx]=sec; return cp; })} className="text-red-600">Löschen</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Zubereitung</h2>
          <div className="space-y-3">
            {steps.map((st, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-1 flex items-center">{st.step_number}.</div>
                <textarea value={st.instruction} onChange={(e) => setSteps((prev)=> prev.map((s, idx)=> idx===i ? { ...s, instruction: e.target.value } : s))} className="col-span-10 rounded" rows={4} />
                <div className="col-span-1 flex items-center justify-center"><button type="button" onClick={()=> setSteps((prev)=> prev.filter((_, idx)=> idx!==i).map((s, idx)=> ({...s, step_number: idx+1})))} className="text-red-600">Löschen</button></div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded">
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}

