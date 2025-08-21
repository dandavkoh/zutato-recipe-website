"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type RecipeCategoryGroup = {
  id: string;
  name: string;
  icon?: string | null;
  sort_order: number;
};

type RecipeCategory = {
  id: string;
  name: string;
  sort_order: number;
  group_id: string;
  parent_category_id?: string | null;
};

export default function CategoryFilter({ initialSelectedIds }: { initialSelectedIds: string[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; height: number; centered: boolean }>({ left: 8, top: 8, width: 520, height: 520, centered: false });

  const [groups, setGroups] = useState<RecipeCategoryGroup[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);

  const [expandedByGroup, setExpandedByGroup] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [groupOpenById, setGroupOpenById] = useState<Record<string, boolean>>({});
  const initializedRef = useRef<boolean>(false);

  // Initialize from URL on first load after categories fetched
  useEffect(() => {
    if (initializedRef.current) return;
    if (categories.length === 0 || groups.length === 0) return;
    const byGroup: Record<string, string[]> = {};
    for (const catId of initialSelectedIds) {
      const cat = categories.find((c) => c.id === catId);
      if (cat) {
        (byGroup[cat.group_id] ||= []).push(cat.id);
      }
    }
    setSelectedByGroup(byGroup);
    initializedRef.current = true;
  }, [categories, groups, initialSelectedIds]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [gr, cr] = await Promise.all([
        supabase.from("recipe_category_groups").select("id, name, icon, sort_order").order("sort_order", { ascending: true }),
        supabase.from("recipe_categories").select("id, name, sort_order, group_id, parent_category_id").order("sort_order", { ascending: true }),
      ]);
      if (!alive) return;
      if (!gr.error && gr.data) setGroups(gr.data as any);
      if (!cr.error && cr.data) setCategories(cr.data as any);
      if (!gr.error && gr.data) {
        const state: Record<string, boolean> = {};
        for (const g of (gr.data as any[])) state[g.id] = false;
        setGroupOpenById(state);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function recalcPosition() {
    if (!buttonRef.current) return;
    const vw = window.innerWidth;
    const margin = 8;
    const headerEl = document.querySelector("header");
    const headerBottom = headerEl ? (headerEl as HTMLElement).getBoundingClientRect().bottom : 0;
    const minTop = headerBottom + margin;
    const isMobile = vw < 640;
    if (isMobile) {
      const width = Math.min(560, vw - margin * 2);
      const vh = window.innerHeight;
      const desired = Math.round(vh * 0.9);
      const maxHeight = Math.max(320, vh - minTop - margin);
      const height = Math.min(desired, maxHeight);
      const top = Math.max(minTop, Math.min(vh / 2 - height / 2, vh - height - margin));
      const left = (vw - width) / 2;
      setPos({ left, top, width, height, centered: true });
      return;
    }
    const width = Math.min(720, vw - margin * 2);
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));
    const vh = window.innerHeight;
    const desired = Math.round(vh * 0.85);
    const maxHeight = Math.max(320, vh - minTop - margin);
    const height = Math.min(desired, maxHeight);
    let top = Math.max(rect.bottom + margin, minTop);
    top = Math.min(top, vh - height - margin);
    setPos({ left, top, width, height, centered: false });
  }

  useLayoutEffect(() => {
    if (!open) return;
    recalcPosition();
    const onResize = () => recalcPosition();
    const onScroll = () => recalcPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    const id = requestAnimationFrame(() => recalcPosition());
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(id);
    };
  }, [open]);

  const flatSelected = Object.values(selectedByGroup).reduce<string[]>((acc, arr) => acc.concat(arr), []);
  const appliedLabel = flatSelected.length === 0 ? "Alle" : `${flatSelected.length} ausgewählt`;

  function toggleExpanded(groupId: string, catId: string) {
    setExpandedByGroup((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], [catId]: !prev[groupId]?.[catId] },
    }));
  }

  function toggleSelected(groupId: string, catId: string) {
    setSelectedByGroup((prev) => {
      const cur = new Set(prev[groupId] || []);
      if (cur.has(catId)) cur.delete(catId); else cur.add(catId);
      return { ...prev, [groupId]: Array.from(cur) };
    });
  }

  function buildTreeForGroup(groupId: string) {
    const cats = categories.filter((c) => c.group_id === groupId);
    const byParent: Record<string, RecipeCategory[]> = {};
    for (const c of cats) {
      const p = c.parent_category_id || "__root__";
      (byParent[p] ||= []).push(c);
    }
    const roots = (byParent["__root__"] || []).sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    function mkNode(cat: RecipeCategory): { id: string; name: string; children: any[] } {
      const children = (byParent[cat.id] || []).sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
      return { id: cat.id, name: cat.name, children: children.map(mkNode) };
    }
    return roots.map(mkNode);
  }

  function renderNode(groupId: string, node: { id: string; name: string; children: any[] }, depth: number): React.ReactElement {
    const expanded = !!expandedByGroup[groupId]?.[node.id];
    const hasChildren = (node.children || []).length > 0;
    const sel = new Set(selectedByGroup[groupId] || []);
    return (
      <div key={node.id} className="pl-2">
        <div className="flex items-center gap-3 py-2 sm:py-1">
          {hasChildren && (
            <button type="button" className="text-gray-600 w-6 sm:w-5 text-lg sm:text-base" onClick={() => toggleExpanded(groupId, node.id)} aria-label={expanded ? "Einklappen" : "Ausklappen"}>
              {expanded ? "▾" : "▸"}
            </button>
          )}
          {!hasChildren && <span className="w-6 sm:w-5" />}
          <label className="inline-flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 sm:h-4 sm:w-4"
              checked={sel.has(node.id)}
              onChange={() => toggleSelected(groupId, node.id)}
            />
            <span className="text-base sm:text-sm text-gray-900">{node.name}</span>
          </label>
        </div>
        {hasChildren && expanded && (
          <div className="ml-5 border-l pl-3">
            {node.children.map((ch: any) => renderNode(groupId, ch, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const encodedSelected = flatSelected.join(",");

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        Kategorien: {appliedLabel}
      </button>

      {open && (
        <>
          {pos.centered && <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setOpen(false)} />}
          <div
            ref={panelRef}
            className="fixed z-40 rounded-xl border border-gray-200 bg-white shadow-lg p-0 overflow-hidden flex flex-col"
            style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">Kategorien</div>
                <div className="text-sm text-gray-600">Mehrfachauswahl möglich</div>
              </div>
              <button type="button" aria-label="Schließen" className="text-gray-600 hover:text-gray-900 text-xl leading-none px-2" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="p-4 overflow-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                {groups.map((g) => {
                  const tree = buildTreeForGroup(g.id);
                  const isOpen = groupOpenById[g.id] ?? false;
                  const selectedCount = (selectedByGroup[g.id] || []).length;
                  return (
                    <div key={g.id} className="border border-gray-200 rounded-lg">
                      <button type="button" className="w-full flex items-center justify-between px-3 py-3 sm:py-2 text-left" onClick={() => setGroupOpenById((prev) => ({ ...prev, [g.id]: !isOpen }))}>
                        <span className="font-semibold text-gray-900 text-base sm:text-sm">{g.name}</span>
                        <span className="flex items-center gap-2 text-gray-600 text-lg sm:text-base">
                          {selectedCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-orange-300 bg-orange-50 text-orange-800 text-xs">
                              {selectedCount}
                            </span>
                          )}
                          <span>{isOpen ? "▾" : "▸"}</span>
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3">
                          {tree.map((n) => renderNode(g.id, n, 0))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t bg-white flex items-center justify-between">
              <button
                type="button"
                className="text-gray-700 hover:text-gray-900 font-semibold"
                onClick={() => {
                  setSelectedByGroup({});
                  setOpen(false);
                }}
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => setOpen(false)}
              >
                Anwenden
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden input posted with the form */}
      <input type="hidden" name="cats" value={encodedSelected} />
    </div>
  );
}

