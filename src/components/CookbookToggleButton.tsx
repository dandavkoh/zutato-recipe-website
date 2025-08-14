'use client';

import React from 'react';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';

type Props = {
  recipeId: string;
  initialInCookbook: boolean;
};

export default function CookbookToggleButton({ recipeId, initialInCookbook }: Props) {
  const [inCookbook, setInCookbook] = React.useState<boolean>(initialInCookbook);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const hideToastLater = () => {
    window.setTimeout(() => setToast(null), 1800);
  };

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const method = inCookbook ? 'DELETE' : 'POST';
      const res = await fetch(`/api/recipes/${recipeId}/cookbook`, { method });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Aktion fehlgeschlagen');
      }
      setInCookbook(!inCookbook);
      setToast(inCookbook ? 'Aus Kochbuch entfernt' : 'Zum Kochbuch hinzugefügt');
      hideToastLater();
    } catch (e) {
      setToast('Aktion fehlgeschlagen');
      hideToastLater();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full md:w-auto ${inCookbook ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-900'} text-white px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-70`}
        aria-label={inCookbook ? 'Aus Kochbuch entfernen' : 'Zum Kochbuch hinzufügen'}
      >
        <FontAwesomeIcon icon="bookmark" style={inCookbook ? 'solid' : 'regular'} className="text-white" />
        {inCookbook ? 'Im Kochbuch' : 'Zum Kochbuch'}
      </button>

      {toast && (
        <div className="fixed top-4 right-4 z-[1000]">
          <div className="bg-black/85 text-white px-4 py-2 rounded-md shadow-md text-sm">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

