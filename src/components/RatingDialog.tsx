'use client';

import React, { useEffect, useMemo, useState } from 'react';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';

type RatingDialogProps = {
  recipeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

const RATING_LABELS: Record<number, string> = {
  1: 'Mangelhaft',
  2: 'Ausbaufähig',
  3: 'Ganz gut',
  4: 'Sehr gut',
  5: 'Perfekt',
};

export default function RatingDialog({ recipeId, isOpen, onClose, onSubmitted }: RatingDialogProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHoverValue(null);
      setSelectedValue(null);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const activeValue = hoverValue ?? selectedValue ?? 0;
  const activeLabel = useMemo(() => (activeValue ? `${activeValue} Stern${activeValue === 1 ? '' : 'e'} - "${RATING_LABELS[activeValue]}"` : ''), [activeValue]);

  const handleSubmit = async () => {
    if (!selectedValue) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selectedValue }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Bewertung fehlgeschlagen');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onSubmitted();
      onClose();
    } catch (e: any) {
      setError('Bewertung fehlgeschlagen');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Dialog schließen"
        >
          <FontAwesomeIcon icon="xmark" style="solid" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Wie hat es dir geschmeckt?</h3>
        <div className="flex items-center justify-center gap-2 mb-2" role="radiogroup" aria-label="Sternebewertung">
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = value <= activeValue;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selectedValue === value}
                className="p-1"
                onMouseEnter={() => setHoverValue(value)}
                onMouseLeave={() => setHoverValue(null)}
                onClick={() => setSelectedValue(value)}
              >
                {filled ? (
                  <FontAwesomeIcon icon="star" style="solid" className="text-yellow-400 text-2xl" />
                ) : (
                  <FontAwesomeIcon icon="star" style="regular" className="text-gray-300 text-2xl" />
                )}
              </button>
            );
          })}
        </div>
        <div className="min-h-6 text-sm text-gray-700 mb-4 text-center">
          {activeValue ? (
            <span>
              {activeValue} Stern{activeValue === 1 ? '' : 'e'} - {RATING_LABELS[activeValue]}
            </span>
          ) : (
            <span className="text-gray-400">Wähle eine Bewertung aus</span>
          )}
        </div>
        {error && (
          <div className="text-sm text-red-600 mb-3">{error}</div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!selectedValue || submitting}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmit}
          >
            {submitting ? 'Bewerten…' : 'Bewerten'}
          </button>
        </div>
      </div>
    </div>
  );
}

