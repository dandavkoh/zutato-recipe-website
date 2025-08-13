'use client';

import React, { useState } from 'react';

export default function NewCommentClient({ recipeId }: { recipeId: string }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Kommentar konnte nicht gespeichert werden');
        setSubmitting(false);
        return;
      }
      setText('');
      setSubmitting(false);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (e: any) {
      setSubmitting(false);
      setError('Kommentar konnte nicht gespeichert werden');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <label htmlFor="new-comment" className="sr-only">Kommentar</label>
      <textarea
        id="new-comment"
        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        rows={3}
        placeholder="Schreibe einen Kommentar..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Senden…' : 'Kommentieren'}
        </button>
      </div>
    </form>
  );
}

