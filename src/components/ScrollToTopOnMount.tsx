"use client";

import React, { useEffect } from "react";

export default function ScrollToTopOnMount({ when = true }: { when?: boolean }) {
  useEffect(() => {
    if (!when) return;
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  }, [when]);
  return null;
}


