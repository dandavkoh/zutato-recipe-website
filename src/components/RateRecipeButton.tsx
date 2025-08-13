'use client';

import React from 'react';
import RatingDialog from '@/components/RatingDialog';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';

export default function RateRecipeButton({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const handleSubmitted = () => {
    setRefreshKey((k) => k + 1);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2"
        aria-label="Rezept bewerten"
      >
        <FontAwesomeIcon icon="star" style="regular" className="text-white" />
        Bewerten
      </button>
      <RatingDialog
        key={refreshKey}
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmitted={handleSubmitted}
        recipeId={recipeId}
      />
    </div>
  );
}

