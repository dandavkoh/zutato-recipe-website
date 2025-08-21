"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import IngredientsWithPortionScaler from "@/components/IngredientsWithPortionScaler";
import RateRecipeButton from "@/components/RateRecipeButton";
import FontAwesomeIcon from "@/components/FontAwesomeIcon";

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

type StepRow = { id: string; step_number: number; instruction: string };

export default function CookingCompanionDialog({
  isOpen,
  onClose,
  recipeId,
  recipeName,
  initialPortions,
  ingredientGroups,
  steps,
  userHasRated,
}: {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
  initialPortions: number;
  ingredientGroups: IngredientGroup[];
  steps: StepRow[];
  userHasRated: boolean;
}) {
  const [stage, setStage] = useState<"prep" | "steps" | "finish">("prep");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showIngredients, setShowIngredients] = useState<boolean>(false);
  const [portions, setPortions] = useState<number>(Math.max(1, Math.round(initialPortions || 1)));

  // Timer state for current step
  const [minInput, setMinInput] = useState<string>("");
  const [secInput, setSecInput] = useState<string>("");
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Clear timer when closing or stage changes
  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running]);

  useEffect(() => {
    if (remainingMs === 0 && running) {
      setRunning(false);
      // TODO: optional sound/notification
    }
  }, [remainingMs, running]);

  const [timerCollapsed, setTimerCollapsed] = useState<boolean>(false);

  function startTimer() {
    const mins = Math.max(0, parseInt(minInput || "0", 10) || 0);
    const secs = Math.max(0, Math.min(59, parseInt(secInput || "0", 10) || 0));
    const total = (mins * 60 + secs) * 1000;
    setRemainingMs(total);
    setRunning(total > 0);
  }
  function stopTimer() {
    setRunning(false);
  }
  function resetTimer() {
    setRunning(false);
    setRemainingMs(0);
    setMinInput("");
    setSecInput("");
  }

  function toClock(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const totalSteps = steps.length;
  const canPrev = stage === "steps"; // allow going back from Schritt 1 to Zutaten
  const canNext = stage === "steps" && currentIndex < totalSteps - 1;

  function goNext() {
    if (stage === "prep") {
      setStage("steps");
      setCurrentIndex(0);
      return;
    }
    if (stage === "steps") {
      if (currentIndex < totalSteps - 1) {
        setCurrentIndex((i) => i + 1);
        resetTimer();
      } else {
        setStage("finish");
      }
    }
  }
  function goPrev() {
    if (stage === "steps") {
      if (currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else {
        setStage("prep");
      }
      resetTimer();
    }
  }

  function backFromFinish() {
    // Return to the last step so user can review or adjust
    setStage("steps");
    setCurrentIndex(Math.max(0, totalSteps - 1));
  }

  // Prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border flex flex-col h-[90vh]">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FontAwesomeIcon icon="utensils" />
              <span>Koch-Kompagnon</span>
            </div>
            <button type="button" aria-label="Schließen" className="text-gray-600 hover:text-gray-900 text-xl" onClick={onClose}>×</button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-auto flex-1 min-h-0">
            {stage === "prep" && (
              <div>
                <div className="text-gray-900 text-xl font-semibold">Zutaten vorbereiten</div>
                <div className="text-gray-600">Passe die Portionen an und bereite alle Zutaten vor.</div>
                <div className="mt-4">
                  <IngredientsWithPortionScaler
                    initialPortions={initialPortions}
                    initialGroups={ingredientGroups}
                    value={portions}
                    onChangePortions={setPortions}
                  />
                </div>
              </div>
            )}

            {stage === "steps" && (
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-900 text-lg font-semibold">Schritt {steps[currentIndex]?.step_number} von {totalSteps}</div>
                  <button
                    type="button"
                    className="text-sm text-orange-700 hover:underline"
                    onClick={() => setShowIngredients((v) => !v)}
                  >
                    {showIngredients ? "Zutaten ausblenden" : "Zutaten anzeigen"}
                  </button>
                </div>
                {showIngredients && (
                  <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                    <IngredientsWithPortionScaler
                      initialPortions={initialPortions}
                      initialGroups={ingredientGroups}
                      value={portions}
                      onChangePortions={setPortions}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <div className="whitespace-pre-line text-gray-900 text-base">{steps[currentIndex]?.instruction}</div>
                </div>

              </div>
            )}

            {stage === "finish" && (
              <div className="text-center py-8">
                <div className="text-2xl font-bold text-gray-900">Guten Appetit! 🧡</div>
                <div className="mt-2 text-gray-600">{recipeName} erfolgreich gekocht.</div>
                {!userHasRated && (
                  <div className="mt-6 flex justify-center">
                    <RateRecipeButton recipeId={recipeId} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t bg-white flex flex-col gap-3">
            {stage === "steps" && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-100"
                  onClick={() => setTimerCollapsed((v) => !v)}
                  aria-expanded={timerCollapsed}
                  aria-controls="companion-timer-panel"
                >
                  <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                    <FontAwesomeIcon icon="stopwatch" />
                    Timer
                  </span>
                  <span className="text-gray-600">{timerCollapsed ? "▾" : "▴"}</span>
                </button>
                {timerCollapsed && (
                  <div id="companion-timer-panel" className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={minInput}
                        onChange={(e) => setMinInput(e.target.value)}
                        className="w-24 h-11 border rounded px-3 text-base"
                      />
                      <span className="text-lg">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        placeholder="Sek"
                        value={secInput}
                        onChange={(e) => setSecInput(e.target.value)}
                        className="w-24 h-11 border rounded px-3 text-base"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {!running ? (
                        <button type="button" className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700" onClick={startTimer}>Start</button>
                      ) : (
                        <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={stopTimer}>Stopp</button>
                      )}
                      <button type="button" className="px-4 py-2 rounded bg-white border text-gray-900 hover:bg-gray-50" onClick={resetTimer}>Zurücksetzen</button>
                      <div className="ml-auto sm:ml-4 text-2xl font-mono tabular-nums text-gray-900">{toClock(remainingMs)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button type="button" className="text-gray-700 hover:text-gray-900 font-semibold" onClick={onClose}>Schließen</button>
              <div className="ml-auto flex items-center gap-2">
                {stage === "steps" && (
                  <>
                    <button type="button" className={`px-4 py-2 rounded-lg border ${canPrev ? "text-gray-900 hover:bg-gray-50" : "opacity-50 cursor-not-allowed text-gray-400"}`} onClick={goPrev} disabled={!canPrev}>Zurück</button>
                    <button type="button" className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700" onClick={goNext}>
                      {currentIndex < totalSteps - 1 ? "Weiter" : "Fertig"}
                    </button>
                  </>
                )}
                {stage === "prep" && (
                  <button type="button" className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700" onClick={goNext}>Weiter</button>
                )}
                {stage === "finish" && (
                  <>
                    <button type="button" className="px-4 py-2 rounded-lg border text-gray-900 hover:bg-gray-50" onClick={backFromFinish}>Zurück</button>
                    <button type="button" className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700" onClick={onClose}>Beenden</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

