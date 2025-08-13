import React from 'react';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';

export type RecipeRatingSummaryData = {
  average: number | null;
  count: number;
};

export default function RecipeRatingSummary({ average, count }: RecipeRatingSummaryData) {
  const hasRatings = typeof average === 'number' && count > 0;
  return (
    <div className="inline-flex items-center gap-1 text-gray-700">
      <FontAwesomeIcon icon="star" style="solid" className="text-yellow-400" />
      {hasRatings ? (
        <>
          <span>{average!.toFixed(1)}/5</span>
          <span>({count})</span>
        </>
      ) : (
        <span>Keine Bewertungen</span>
      )}
    </div>
  );
}

