"use client";

import { useState } from 'react';

export default function RepliesCollapse({
  totalCount,
  initiallyCollapsed = false,
  children,
}: {
  totalCount?: number;
  initiallyCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(initiallyCollapsed);
  const label = collapsed
    ? `Antworten anzeigen${typeof totalCount === 'number' ? ` (${totalCount})` : ''}`
    : 'Antworten einklappen';

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="text-xs text-orange-700 hover:underline"
      >
        {label}
      </button>
      {!collapsed && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}

