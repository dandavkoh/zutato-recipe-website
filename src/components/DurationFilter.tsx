"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Key = "15" | "30" | "60" | "120" | "gt120" | "all";

export default function DurationFilter({ initialKey }: { initialKey: Key }) {
  const POSITIONS: Key[] = ["15", "30", "60", "120", "gt120", "all"];
  const KEY_TO_INDEX = new Map(POSITIONS.map((k, i) => [k, i] as const));
  const [open, setOpen] = useState<boolean>(false);
  const [index, setIndex] = useState<number>(KEY_TO_INDEX.get(initialKey) ?? POSITIONS.length - 1);
  const [appliedKey, setAppliedKey] = useState<Key>(initialKey);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; centered: boolean }>({ left: 8, top: 8, width: 320, centered: false });

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    // Reset draft to server-applied value whenever the URL changes
    setIndex(KEY_TO_INDEX.get(initialKey) ?? POSITIONS.length - 1);
    setAppliedKey(initialKey);
  }, [initialKey]);

  function recalcPosition() {
    if (!buttonRef.current) return;
    const vw = window.innerWidth;
    const margin = 8;
    const headerEl = document.querySelector("header");
    const headerBottom = headerEl ? (headerEl as HTMLElement).getBoundingClientRect().bottom : 0;
    const minTop = headerBottom + margin;

    const isMobile = vw < 640; // Tailwind sm breakpoint
    if (isMobile) {
      const width = Math.min(384, vw - margin * 2);
      const vh = window.innerHeight;
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
      const top = Math.max(minTop, Math.min(vh / 2 - (panelHeight || 0) / 2, vh - (panelHeight || 0) - margin));
      const left = (vw - width) / 2;
      setPos({ left, top, width, centered: true });
      return;
    }

    const width = Math.min(384, vw - margin * 2);
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));
    let top = Math.max(rect.bottom + margin, minTop);
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
    const vh = window.innerHeight;
    // Always open below the button; clamp so it doesn't overflow bottom
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
    // Recalc once after render to capture panel height
    const id = requestAnimationFrame(() => recalcPosition());
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(id);
    };
  }, [open]);

  const appliedLabel = appliedKey === "all" ? "Alle" : appliedKey === "gt120" ? "> 120 Min" : `bis ${appliedKey} Min`;

  const currentKey = POSITIONS[index] ?? "all";
  const currentLabel = currentKey === "all" ? "Alle" : currentKey === "gt120" ? "> 120 Min" : `bis ${currentKey} Min`;

  function closePanel() {
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        Gesamtdauer: {appliedLabel}
      </button>

      {open && (
        <>
          {pos.centered && (
            <div className="fixed inset-0 z-30 bg-black/30" onClick={closePanel} />
          )}
          <div
            ref={panelRef}
            className="fixed z-40 rounded-xl border border-gray-200 bg-white shadow-lg p-4"
            style={{ left: pos.left, top: pos.top, width: pos.width }}
          >
            <div className="mb-4">
              <div className="text-base font-semibold text-gray-900">Maximale Gesamtdauer</div>
              <div className="text-sm text-gray-600">in Minuten</div>
            </div>

            <div className="px-2">
              <input
                type="range"
                min={0}
                max={POSITIONS.length - 1}
                step={1}
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
                className="w-full accent-orange-600"
              />
              <div className="mt-3 grid grid-cols-6 text-sm text-gray-700">
                <div className="text-center">15</div>
                <div className="text-center">30</div>
                <div className="text-center">60</div>
                <div className="text-center">120</div>
                <div className="text-center">&gt;120</div>
                <div className="text-center">Alle</div>
              </div>
              <div className="mt-2 text-right text-sm text-gray-500">Auswahl: {currentLabel}</div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="text-gray-700 hover:text-gray-900 font-semibold"
                onClick={() => {
                  const idxAll = KEY_TO_INDEX.get("all") ?? POSITIONS.length - 1;
                  setIndex(idxAll);
                  setAppliedKey("all");
                  closePanel();
                }}
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => {
                  setAppliedKey(currentKey);
                  closePanel();
                }}
              >
                Anwenden
              </button>
            </div>
          </div>
        </>
      )}
      {/* Hidden input used on form submit ("Filtern") */}
      <input type="hidden" name="max" value={appliedKey} />
    </div>
  );
}

