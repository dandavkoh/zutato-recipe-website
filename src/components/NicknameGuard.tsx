'use client';

import React, { useEffect, useState } from 'react';
import { AuthApi } from '@/lib/authApi';

export default function NicknameGuard() {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/user/nickname', { method: 'GET', cache: 'no-store' });
        if (res.status === 401) {
          // not logged in -> no blocking
          if (!cancelled) setOpen(false);
          return;
        }
        const j = await res.json();
        if (!cancelled) {
          setOpen(!j?.hasNickname);
          setNickname(j?.nickname || '');
        }
      } catch (err) {
        const { reportError } = await import('@/utils/reportError');
        reportError(err, { where: 'NicknameGuard.check' });
        // fail open
        if (!cancelled) setOpen(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    // Re-check when visibility changes (returning to tab)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const { data: sub } = AuthApi.onAuthStateChange((user) => {
      if (user) {
        setChecking(true);
        check();
      } else {
        // logged out; no blocking
        setOpen(false);
      }
    });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSave = async () => {
    const value = nickname.trim().toLowerCase();
    if (!value) {
      setError('Bitte gib einen Accountnamen ein.');
      return;
    }
    if (!/^[a-zA-Z0-9_\-.]+$/.test(value)) {
      setError('Nur Buchstaben, Zahlen, Unterstrich, Punkt oder Bindestrich erlaubt (keine Leerzeichen).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Konnte Accountnamen nicht speichern');
        setSaving(false);
        return;
      }
      setSaving(false);
      setOpen(false);
    } catch (err) {
      const { reportError } = await import('@/utils/reportError');
      reportError(err, { where: 'NicknameGuard.handleSave' });
      setSaving(false);
      setError('Konnte Accountnamen nicht speichern');
    }
  };

  if (checking || !open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Accountname festlegen</h3>
        <p className="text-sm text-gray-600 mb-4 text-center">Bitte wähle einen öffentlichen Namen, der bei deinen Rezepten und Kommentaren angezeigt wird.</p>
        <input
          type="text"
          autoFocus
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="z. B. kochmeister42"
        />
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

