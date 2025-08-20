'use client';

import React, { useState } from 'react';

export default function EditCommentClient({ commentId, recipeId, initialText }: { commentId: string; recipeId: string; initialText: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId, comment: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Kommentar konnte nicht gespeichert werden');
        setSaving(false);
        return;
      }
      setSaving(false);
      setEditing(false);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (e: any) {
      setSaving(false);
      setError('Kommentar konnte nicht gespeichert werden');
    }
  };

  return (
    <div>
      {!editing ? (
        <div>
          <div className="text-sm text-gray-900 whitespace-pre-wrap">{initialText}</div>
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Bearbeiten
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!text.trim() || saving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setText(initialText);
              }}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

