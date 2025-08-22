"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import FontAwesomeIcon from "@/components/FontAwesomeIcon";
import { showToast } from "@/utils/showToast";

type Difficulty = "einfach" | "mittel" | "schwer";

interface Unit {
  id: string;
  name: string;
  short_name?: string | null;
}

interface RecipeCategoryGroup {
  id: string;
  name: string;
  icon?: string | null;
  sort_order: number;
}

interface RecipeCategory {
  id: string;
  name: string;
  sort_order: number;
  group_id: string;
  parent_category_id?: string | null;
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
  category_ids: string[];
  working_time_minutes?: number | null;
  cooking_time_minutes?: number | null;
  resting_time_minutes?: number | null;
  image_url?: string | null;
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function RecipeForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<RecipeCategoryGroup[]>([]);
  const [allCategories, setAllCategories] = useState<RecipeCategory[]>([]);
  const [selectedCategoryIdsByGroup, setSelectedCategoryIdsByGroup] = useState<Record<string, string[]>>({});
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState<Record<string, boolean>>({});
  const [expandedByGroup, setExpandedByGroup] = useState<Record<string, Record<string, boolean>>>({});
  const dropdownRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const wizardHeaderWrapperRef = React.useRef<HTMLDivElement | null>(null);
  const wizardHeaderScrollerRef = React.useRef<HTMLDivElement | null>(null);

  // form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [portions, setPortions] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>("mittel");
  const [workingMinutes, setWorkingMinutes] = useState<string>("");
  const [cookingMinutes, setCookingMinutes] = useState<string>("");
  const [restingMinutes, setRestingMinutes] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  // Wizard state (5 steps)
  const wizardSteps = ["Rezept", "Zubereitung", "Kategorien", "Rezeptbild", "Vorschau"] as const;
  type WizardStep = typeof wizardSteps[number];
  const [wizardStepIdx, setWizardStepIdx] = useState<number>(0);

  function gotoStep(idx: number) {
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    setWizardStepIdx(Math.max(0, Math.min(wizardSteps.length - 1, idx)));
  }

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Toast notifications for error/success
  useEffect(() => {
    if (error) {
      showToast(error, 'error', 2600);
      setError(null);
    }
  }, [error]);
  useEffect(() => {
    if (success) {
      showToast(success, 'success', 2000);
      setSuccess(null);
    }
  }, [success]);

  useEffect(() => {
    const loadBasics = async () => {
      setLoading(true);
      try {
        const [unitsRes, catGroupsRes, catsRes] = await Promise.all([
          supabase.from("recipe_units").select("id, name, short_name, sort_order").order("sort_order", { ascending: true }),
          supabase.from("recipe_category_groups").select("id, name, icon, sort_order").order("sort_order", { ascending: true }),
          supabase.from("recipe_categories").select("id, name, sort_order, group_id, parent_category_id").order("sort_order", { ascending: true }),
        ]);

        if (!unitsRes.error && unitsRes.data) setUnits(unitsRes.data as Unit[]);
        if (!catGroupsRes.error && catGroupsRes.data) setCategoryGroups(catGroupsRes.data as RecipeCategoryGroup[]);
        if (!catsRes.error && catsRes.data) setAllCategories(catsRes.data as RecipeCategory[]);
      } finally {
        setLoading(false);
      }
    };
    loadBasics();
  }, [supabase]);

  // Close any open category dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const openGroups = Object.entries(isGroupDropdownOpen).filter(([, v]) => v).map(([k]) => k);
      if (openGroups.length === 0) return;
      const next: Record<string, boolean> = { ...isGroupDropdownOpen };
      for (const gid of openGroups) {
        const container = dropdownRefs.current[gid];
        if (container && !container.contains(target)) {
          next[gid] = false;
        }
      }
      if (JSON.stringify(next) !== JSON.stringify(isGroupDropdownOpen)) {
        setIsGroupDropdownOpen(next);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isGroupDropdownOpen]);

  // On step change: after layout settles, move focus to header (preventScroll),
  // scroll page to top, and center active step horizontally in the header container
  useEffect(() => {
    const wrapper = wizardHeaderWrapperRef.current;
    const scroller = wizardHeaderWrapperRef.current;
    const run = () => {
      try { (wrapper as any)?.focus?.({ preventScroll: true }); } catch {}
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      if (scroller) {
        const activeBtn = scroller.querySelector<HTMLButtonElement>(`button[data-step-idx="${wizardStepIdx}"]`);
        if (activeBtn) {
          const btnRect = activeBtn.getBoundingClientRect();
          const contRect = scroller.getBoundingClientRect();
          const deltaLeft = (btnRect.left + btnRect.width / 2) - (contRect.left + contRect.width / 2);
          const targetLeft = Math.max(0, scroller.scrollLeft + deltaLeft);
          scroller.scrollTo({ left: targetLeft, behavior: 'smooth' });
        }
      }
    };
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(run);
      (run as any)._id2 = id2;
    });
    return () => {
      cancelAnimationFrame(id1);
      const id2 = (run as any)._id2;
      if (typeof id2 === 'number') cancelAnimationFrame(id2);
    };
  }, [wizardStepIdx]);

  function flattenCategoriesForGroup(groupId: string): Array<{ id: string; name: string; depth: number }> {
    const cats = allCategories.filter((c) => c.group_id === groupId);
    const byParent: Record<string, RecipeCategory[]> = {};
    for (const c of cats) {
      const parentId = c.parent_category_id || "__root__";
      if (!byParent[parentId]) byParent[parentId] = [];
      byParent[parentId].push(c);
    }
    const result: Array<{ id: string; name: string; depth: number }> = [];
    function dfs(parentId: string | null, depth: number) {
      const children = byParent[parentId || "__root__"] || [];
      // ensure stable sort by sort_order then name
      children.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
      for (const ch of children) {
        result.push({ id: ch.id, name: ch.name, depth });
        dfs(ch.id, depth + 1);
      }
    }
    dfs(null, 0);
    return result;
  }

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  // Ingredient search state per row
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

    // If not on the last step, treat submit like clicking "Weiter"
    if (wizardStepIdx < wizardSteps.length - 1) {
      if (wizardStepIdx === 0) {
        if (!name.trim()) { setError("Bitte einen Rezeptnamen eingeben."); return; }
        const anyIng = sections.some((sec) => sec.ingredients.some((ing) => ing.quantity.trim() && (ing.link != null)));
        if (!anyIng) { setError("Bitte mindestens eine Zutat mit Menge und Namen auswählen."); return; }
      }
      if (wizardStepIdx === 1) {
        const anyStep = steps.some((s) => s.instruction.trim());
        if (!anyStep) { setError("Bitte mindestens einen Zubereitungsschritt eingeben."); return; }
      }
      gotoStep(wizardStepIdx + 1);
      return;
    }

    // Only on the last step we actually create the recipe
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      // Upload image if present
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

      const body: CreateRecipeRequestBody = {
        name: name.trim(),
        description: description.trim() || undefined,
        portions,
        difficulty,
        category_ids: Object.values(selectedCategoryIdsByGroup).flat().filter(Boolean),
        working_time_minutes: workingMinutes ? Number(workingMinutes) : null,
        cooking_time_minutes: cookingMinutes ? Number(cookingMinutes) : null,
        resting_time_minutes: restingMinutes ? Number(restingMinutes) : null,
        image_url: uploadedImageUrl,
        sections: sections.map((s) => ({ tempId: s.tempId, name: s.name.trim(), sort_order: s.sort_order })),
        ingredients: sections.flatMap((s) =>
          s.ingredients
            .filter((ing) => ing.quantity.trim() && ing.link)
            .map((ing, idx) => ({
              sectionTempId: s.name.trim() ? s.tempId : null, // unnamed/default section -> null section_id
              quantity: Number(ing.quantity),
              unit_id: ing.unit_id || null,
              product_group_id: ing.link?.kind === "group" ? ing.link.product_group_id : null,
              product_id: ing.link?.kind === "product" ? ing.link.product_id : null,
              custom_ingredient_name: ing.link?.kind === "custom" ? ing.link.custom_ingredient_name : null,
              sort_order: idx,
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
      const createdId = (data as any)?.id as string | undefined;
      const slug = slugify(name || "");
      if (createdId) {
        router.push(`/rezepte/${createdId}/${slug}?success=created`);
      } else {
        setSuccess("Rezept erfolgreich erstellt.");
      }
    } catch (e: any) {
      setError(e?.message || "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && wizardStepIdx < wizardSteps.length - 1) {
          e.preventDefault();
          // mimic Weiter button validation per step
          if (wizardStepIdx === 0) {
            if (!name.trim()) { setError("Bitte einen Rezeptnamen eingeben."); return; }
            const anyIng = sections.some((sec) => sec.ingredients.some((ing) => ing.quantity.trim() && (ing.link != null)));
            if (!anyIng) { setError("Bitte mindestens eine Zutat mit Menge und Namen auswählen."); return; }
          }
          if (wizardStepIdx === 1) {
            const anyStep = steps.some((s) => s.instruction.trim());
            if (!anyStep) { setError("Bitte mindestens einen Zubereitungsschritt eingeben."); return; }
          }
          setError(null);
          gotoStep(wizardStepIdx + 1);
        }
      }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8"
    >


      {/* Wizard header */}
      <div className="overflow-x-auto pb-1" ref={wizardHeaderWrapperRef} tabIndex={-1}>
        <div className="flex items-center gap-6 justify-start md:justify-center px-4 min-w-max" ref={wizardHeaderScrollerRef}>
        {wizardSteps.map((label, idx) => {
          const isActive = idx === wizardStepIdx;
          const isDone = idx < wizardStepIdx;
          const bgClass = isActive ? 'bg-orange-600 text-white' : isDone ? 'bg-orange-100 text-orange-900' : 'bg-gray-200 text-gray-800';
          const hoverClass = isActive ? '' : 'hover:brightness-95';
          return (
            <button
              key={label}
              type="button"
              data-step-idx={idx}
              onClick={() => gotoStep(idx)}
              className={`${bgClass} ${hoverClass} relative rounded-md pl-2 pr-7 py-2 font-semibold shadow-sm transition-colors inline-flex items-center`}
            >
              <span className={`inline-flex items-center gap-2`}> 
                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full border ${isActive ? 'border-white text-white' : isDone ? 'border-orange-900/30' : 'border-gray-600/40'}`}>
                  {idx + 1}
                </span>
                <span>{label}</span>
              </span>
              <span
                className={`${bgClass} absolute top-1/2 left-full w-8 h-8 rounded-md transition-colors`}
                style={{ transform: 'translate(-22px, -50%) rotate(45deg)' }}
                aria-hidden="true"
              />
            </button>
          );
        })}
        </div>
      </div>

      {/* Step 1: Rezept (Basics + Zutaten) */}
      {wizardStepIdx === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Rezeptname</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded"
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
                className="mt-1 w-full rounded"
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
                className="mt-1 w-full rounded"
              />
            </div>
          </div>

          {/* Zutaten */}
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
                      className="flex-1 rounded"
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
                            className="mt-1 w-full rounded"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500">Einheit</label>
                          <select
                            value={ing.unit_id || ""}
                            onChange={(e) => updateIngredient(sIdx, iIdx, (cur) => ({ ...cur, unit_id: e.target.value || null }))}
                            className="mt-1 w-full rounded"
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
                                updateIngredient(sIdx, iIdx, (cur) => ({
                                  ...cur,
                                  link: val ? { kind: "custom", custom_ingredient_name: val } : null,
                                }));
                                setSearchQueryByIngredientId((p) => ({ ...p, [ing.tempId]: val }));
                                setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: true }));
                                searchIngredients(ing.tempId, val);
                              }}
                              onFocus={() => {
                                const current = searchQueryByIngredientId[ing.tempId] ?? "";
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
                                  const userText = (searchQueryByIngredientId[ing.tempId] ?? (ing.link?.kind === "custom" ? ing.link.custom_ingredient_name : "")) || "";
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
                                      link: { kind: "custom", custom_ingredient_name: trimmed },
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
                                        r.type === "product"
                                          ? { kind: "product", product_id: r.id, label: r.title }
                                          : { kind: "group", product_group_id: r.id, label: r.title },
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
                              const userText = (searchQueryByIngredientId[ing.tempId] ?? (ing.link?.kind === "custom" ? ing.link.custom_ingredient_name : "")) || "";
                              const trimmed = userText.trim();
                              const results = searchResultsByIngredientId[ing.tempId] || [];
                              if (!trimmed) return null;
                              const hasExact = results.some((r) => r.title.toLowerCase() === trimmed.toLowerCase());
                              const isOpen = !!isDropdownOpenByIngredientId[ing.tempId];
                              if (!isOpen) return null;
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
                                            link: { kind: "custom", custom_ingredient_name: trimmed },
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
                                        key={r.id + (r.type || "")}
                                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-900"
                                        onMouseDown={() => {
                                          setIsSelectingByClickByIngredientId((p) => ({ ...p, [ing.tempId]: true }));
                                        }}
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
                                          setIsDropdownOpenByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                          setIsSelectingByClickByIngredientId((p) => ({ ...p, [ing.tempId]: false }));
                                        }}
                                      >
                                        {r.title} {r.type ? `(${r.type})` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}
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
        </div>
      )}

      {/* Step 2: Zubereitung (Schritte, dann Zeiten und Schwierigkeit) */}
      {wizardStepIdx === 1 && (
        <div className="space-y-6">
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
                      className="w-full rounded min-h-28"
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

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Dauer & Schwierigkeit</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Arbeitszeit (Minuten)</label>
              <input
                type="number"
                min={0}
                value={workingMinutes}
                onChange={(e) => setWorkingMinutes(e.target.value)}
                className="mt-1 w-full rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Koch/Backzeit (Minuten)</label>
              <input
                type="number"
                min={0}
                value={cookingMinutes}
                onChange={(e) => setCookingMinutes(e.target.value)}
                className="mt-1 w-full rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ruhezeit (Minuten)</label>
              <input
                type="number"
                min={0}
                value={restingMinutes}
                onChange={(e) => setRestingMinutes(e.target.value)}
                className="mt-1 w-full rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Schwierigkeit</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="mt-1 w-full rounded md:w-64"
            >
              <option value="einfach">einfach</option>
              <option value="mittel">mittel</option>
              <option value="schwer">schwer</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 3: Kategorien */}
      {wizardStepIdx === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoryGroups.map((group) => {
              // Build tree for group
              const cats = allCategories.filter((c) => c.group_id === group.id);
              const byParent: Record<string, RecipeCategory[]> = {};
              for (const c of cats) {
                const p = c.parent_category_id || "__root__";
                (byParent[p] ||= []).push(c);
              }
              const roots = (byParent["__root__"] || []).sort((a,b)=>(a.sort_order-b.sort_order)||a.name.localeCompare(b.name));
              function mkNode(cat: RecipeCategory): { id: string; name: string; children: any[] } {
                const children = (byParent[cat.id] || []).sort((a,b)=>(a.sort_order-b.sort_order)||a.name.localeCompare(b.name));
                return { id: cat.id, name: cat.name, children: children.map(mkNode) };
              }
              const tree = roots.map(mkNode);

              const selected = selectedCategoryIdsByGroup[group.id] || [];
              const isOpen = !!isGroupDropdownOpen[group.id];
              const expandedForGroup = expandedByGroup[group.id] || {};

              function toggleExpanded(catId: string) {
                setExpandedByGroup((prev) => ({
                  ...prev,
                  [group.id]: { ...prev[group.id], [catId]: !prev[group.id]?.[catId] },
                }));
              }

              function toggleSelected(catId: string) {
                setSelectedCategoryIdsByGroup((prev) => {
                  const cur = new Set(prev[group.id] || []);
                  if (cur.has(catId)) cur.delete(catId); else cur.add(catId);
                  return { ...prev, [group.id]: Array.from(cur) };
                });
              }

              function renderNode(node: { id: string; name: string; children: any[] }, depth: number): React.ReactElement {
                const hasChildren = node.children.length > 0;
                const expanded = expandedForGroup[node.id] ?? false;
                const checked = selected.includes(node.id);
                return (
                  <li key={node.id} className="border-t border-gray-100 first:border-t-0">
                    <div className="flex items-center justify-between py-1.5 text-sm text-gray-900">
                      <div
                        className="flex items-center gap-2 cursor-pointer select-none flex-1"
                        style={{ paddingLeft: Math.max(0, depth) * 14 }}
                        onClick={() => toggleSelected(node.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelected(node.id); } }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(node.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                        <span className="select-none">{node.name}</span>
                      </div>
                      {hasChildren ? (
                        <button
                          type="button"
                          aria-label="Toggle children"
                          aria-expanded={expanded}
                          onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id); }}
                          className="p-2 text-gray-600 hover:text-gray-800 transition-colors ml-2 mr-1"
                        >
                          <FontAwesomeIcon icon={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
                        </button>
                      ) : (
                        <span className="w-5" />
                      )}
                    </div>
                    {hasChildren && (
                      <div
                        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
                        style={{ maxHeight: expanded ? 800 : 0, opacity: expanded ? 1 : 0 }}
                      >
                        <ul>
                          {node.children.map((ch) => renderNode(ch, depth + 1))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <div
                  key={group.id}
                  ref={(el) => {
                    dropdownRefs.current[group.id] = el as HTMLDivElement | null;
                  }}
                  className="relative"
                >
                  <label className="block text-sm font-medium text-gray-700">{group.name}</label>
                  <button
                    type="button"
                    onClick={() => setIsGroupDropdownOpen((p) => ({ ...p, [group.id]: !p[group.id] }))}
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span className={selected.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                      {selected.length > 0 ? `${selected.length} ausgewählt` : 'Keine Auswahl'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow p-2 max-h-64 overflow-auto">
                      <ul>
                        {tree.map((n) => renderNode(n, 0))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Rezeptbild */}
      {wizardStepIdx === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titelbild (optional)</label>
            <div className="mt-1 flex items-center gap-4">
              <input type="file" accept="image/*" onChange={onImageChange} className="rounded" />
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Vorschau" className="h-16 w-16 object-cover rounded border" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Vorschau */}
      {wizardStepIdx === 4 && (
        <div className="space-y-6 text-gray-900">
          <div>
            <h3 className="text-lg font-semibold mb-2">Rezept</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-600">Name:</span> {name || '–'}</div>
              <div><span className="text-gray-600">Info:</span> {description || '–'}</div>
              <div><span className="text-gray-600">Portionen:</span> {portions}</div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Zubereitung</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div><span className="text-gray-600">Arbeitszeit:</span> {workingMinutes || '–'} Min</div>
              <div><span className="text-gray-600">Koch/Backzeit:</span> {cookingMinutes || '–'} Min</div>
              <div><span className="text-gray-600">Ruhezeit:</span> {restingMinutes || '–'} Min</div>
            </div>
            <div className="mt-2 text-sm"><span className="text-gray-600">Schwierigkeit:</span> {difficulty}</div>
            <div className="mt-2 text-sm"><span className="text-gray-600">Schritte:</span> {steps.filter(s => s.instruction.trim()).length}</div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Kategorien</h3>
            <ul className="list-disc pl-5 text-sm">
              {categoryGroups.map((g) => {
                const ids = selectedCategoryIdsByGroup[g.id] || [];
                if (ids.length === 0) return null;
                const names = allCategories.filter(c => ids.includes(c.id)).map(c => c.name);
                return <li key={g.id}><span className="text-gray-600">{g.name}:</span> {names.join(', ')}</li>;
              })}
              {Object.values(selectedCategoryIdsByGroup).flat().length === 0 && <li>–</li>}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Rezeptbild</h3>
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Vorschau" className="h-24 w-24 object-cover rounded border" />
            ) : (
              <div className="text-sm text-gray-600">Kein Bild ausgewählt</div>
            )}
          </div>
        </div>
      )}

      {/* Wizard navigation */}
      <div className="pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => gotoStep(wizardStepIdx - 1)}
          disabled={wizardStepIdx === 0 || loading}
          className="inline-flex items-center px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          Zurück
        </button>
        {wizardStepIdx < wizardSteps.length - 1 ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (wizardStepIdx === 0) {
                if (!name.trim()) { setError("Bitte einen Rezeptnamen eingeben."); return; }
                const anyIng = sections.some((sec) => sec.ingredients.some((ing) => ing.quantity.trim() && (ing.link != null)));
                if (!anyIng) { setError("Bitte mindestens eine Zutat mit Menge und Namen auswählen."); return; }
              }
              if (wizardStepIdx === 1) {
                const anyStep = steps.some((s) => s.instruction.trim());
                if (!anyStep) { setError("Bitte mindestens einen Zubereitungsschritt eingeben."); return; }
              }
              setError(null);
              gotoStep(wizardStepIdx + 1);
            }}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
          >
            Weiter
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Speichern..." : "Rezept erstellen"}
          </button>
        )}
      </div>
    </form>
  );
}

