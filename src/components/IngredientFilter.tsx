"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type KeyToken = `p:${string}` | `g:${string}`;

type ProductOrGroup = {
  kind: "product" | "group";
  id: string;
  label: string;
};

export default function IngredientFilter({ initialTokens }: { initialTokens: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; centered: boolean }>({ left: 8, top: 8, width: 420, centered: false });

  const [applied, setApplied] = useState<KeyToken[]>(() => parseTokens(initialTokens));
  const [draft, setDraft] = useState<KeyToken[]>(() => parseTokens(initialTokens));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOrGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [labelByToken, setLabelByToken] = useState<Record<string, string>>({});

  const appliedLabel = applied.length === 0 ? "Alle" : `${applied.length} ausgewählt`;

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
      const width = Math.min(440, vw - margin * 2);
      const vh = window.innerHeight;
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
      const top = Math.max(minTop, Math.min(vh / 2 - (panelHeight || 0) / 2, vh - (panelHeight || 0) - margin));
      const left = (vw - width) / 2;
      setPos({ left, top, width, centered: true });
      return;
    }
    const width = Math.min(520, vw - margin * 2);
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));
    let top = Math.max(rect.bottom + margin, minTop);
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
    const vh = window.innerHeight;
    if (panelHeight) {
      const maxTop = Math.max(minTop, vh - panelHeight - margin);
      top = Math.min(top, maxTop);
    }
    setPos({ left, top, width, centered: false });
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

  // Load labels for already applied tokens (e.g., after navigation with query params)
  useEffect(() => {
    if (!open && applied.length === 0) return;
    const missing = applied.filter((t) => !labelByToken[t]);
    if (missing.length === 0) return;
    const productIds = missing
      .filter((t) => t.startsWith("p:"))
      .map((t) => t.slice(2));
    const groupIds = missing
      .filter((t) => t.startsWith("g:"))
      .map((t) => t.slice(2));
    let alive = true;
    (async () => {
      try {
        const labels: Record<string, string> = {};
        if (productIds.length > 0) {
          const { data } = await supabase
            .from('products')
            .select('id, title')
            .in('id', productIds);
          for (const row of (data as any[]) || []) {
            const key = `p:${row.id}`;
            labels[key] = String(row.title ?? row.id);
          }
        }
        if (groupIds.length > 0) {
          const { data } = await supabase
            .from('product_groups')
            .select('id, title')
            .in('id', groupIds);
          for (const row of (data as any[]) || []) {
            const key = `g:${row.id}`;
            labels[key] = String(row.title ?? row.id);
          }
        }
        if (alive && Object.keys(labels).length > 0) {
          setLabelByToken((prev) => ({ ...prev, ...labels }));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, applied, labelByToken, supabase]);

  // Debounced search
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc("search_products_and_groups", { term, limit_fts: 10, limit_fuzzy: 5 });
        const res = (data as any[] | null) || [];
        const mapped: ProductOrGroup[] = res.map((r: any) => {
          const kind = (r.type === "group" ? "group" : "product") as const;
          const id = String(r.id);
          const label = String(r.title ?? r.label ?? r.name ?? id);
          return { kind, id, label };
        });
        if (alive) setResults(mapped);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [query, supabase]);

  function addToken(t: ProductOrGroup) {
    const key: KeyToken = t.kind === "product" ? (`p:${t.id}` as const) : (`g:${t.id}` as const);
    setDraft((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setLabelByToken((prev) => ({ ...prev, [key]: t.label }));
    setQuery("");
    setResults([]);
  }

  function removeToken(key: KeyToken) {
    setDraft((prev) => prev.filter((k) => k !== key));
  }

  const encodedApplied = applied.join(",");
  const encodedDraft = draft.join(",");

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        Zutaten: {appliedLabel}
      </button>

      {open && (
        <>
          {pos.centered && <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setOpen(false)} />}
          <div
            ref={panelRef}
            className="fixed z-40 rounded-xl border border-gray-200 bg-white shadow-lg p-4"
            style={{ left: pos.left, top: pos.top, width: pos.width }}
          >
            <div className="mb-3">
              <div className="text-base font-semibold text-gray-900">Zutaten</div>
              <div className="text-sm text-gray-600">Rezepte dürfen maximal diese Zutaten enthalten</div>
            </div>

            <div className="mt-3">
              <input
                className="w-full border border-gray-400 rounded px-3 py-2 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Zutat suchen..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && <div className="mt-2 text-sm text-gray-500">Suche...</div>}
              {!loading && results.length > 0 && (
                <ul className="mt-2 max-h-56 overflow-auto bg-white border border-gray-300 rounded-lg shadow-sm divide-y divide-gray-200">
                  {results.map((r) => (
                    <li key={`${r.kind}:${r.id}`} className="text-gray-900">
                      <button
                        type="button"
                        onClick={() => addToken(r)}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 focus:bg-orange-50 focus:outline-none"
                      >
                        {r.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="mt-2 text-sm text-gray-500">Keine Ergebnisse</div>
              )}
            </div>

            {draft.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.map((k) => (
                  <span key={k} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-orange-50 text-orange-900 border border-orange-300 text-sm">
                    {labelForToken(k, labelByToken)}
                    <button type="button" aria-label="Entfernen" className="text-orange-600 hover:text-orange-800" onClick={() => removeToken(k)}>×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="text-gray-700 hover:text-gray-900 font-semibold"
                onClick={() => {
                  setDraft([]);
                  setApplied([]);
                  setOpen(false);
                }}
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => {
                  setApplied(draft);
                  setOpen(false);
                }}
              >
                Anwenden
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">Hinweis: Rezepte dürfen nur die ausgewählten Zutaten enthalten (müssen aber nicht alle enthalten).</div>
          </div>
        </>
      )}

      {/* Hidden input posted with the form */}
      <input type="hidden" name="ing" value={encodedApplied} />
    </div>
  );
}

function parseTokens(s: string): KeyToken[] {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^([pg]):[A-Za-z0-9-]+$/.test(t)) as KeyToken[];
}

function labelForToken(t: KeyToken, labelByToken: Record<string, string>): string {
  const known = labelByToken[t];
  if (known) return known;
  const [prefix, id] = t.split(":");
  return `${prefix === "p" ? "Produkt" : "Gruppe"} ${id.slice(0, 8)}…`;
}

