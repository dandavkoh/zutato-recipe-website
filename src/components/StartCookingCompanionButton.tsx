"use client";

import React from "react";
import FontAwesomeIcon from "@/components/FontAwesomeIcon";

export default function StartCookingCompanionButton() {
  function onClick() {
    (window as any).__openCookingCompanion?.();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
    >
      <FontAwesomeIcon icon="user-chef" size="lg" />
      <span>Koch-Kompagnon starten</span>
    </button>
  );
}

