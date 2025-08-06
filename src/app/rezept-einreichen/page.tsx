'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RezeptEinreichenPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Wenn nicht geladen, warten
    if (loading) return;

    // Wenn kein User angemeldet, zur Login-Seite weiterleiten
    if (!user) {
      setIsRedirecting(true);
      const currentPath = '/rezept-einreichen';
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
  }, [user, loading, router]);

  // Loading-Zustand anzeigen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade...</p>
        </div>
      </div>
    );
  }

  // Wenn kein User oder Weiterleitung läuft, Loading anzeigen
  if (!user || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Weiterleitung...</p>
        </div>
      </div>
    );
  }

  // Nur wenn User angemeldet, die Seite rendern
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rezept einreichen
          </h1>
          <p className="text-gray-600">
            Teile dein Lieblingsrezept mit der ZUTATO-Community
          </p>
        </div>

        {/* Willkommensnachricht */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-semibold">
                {user.firstName ? user.firstName.charAt(0) : user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Hallo, {user.firstName || user.email}!
              </h2>
              <p className="text-sm text-gray-500">
                Bereit, dein Rezept zu teilen?
              </p>
            </div>
          </div>
        </div>

        {/* Test Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎉 Willkommen auf der Rezept-Einreichen-Seite!
          </h2>
          <p className="text-gray-600 mb-4">
            Du bist erfolgreich angemeldet und kannst jetzt dein Rezept einreichen.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-800">
              <strong>Status:</strong> Authentifiziert ✅
            </p>
            <p className="text-orange-700 text-sm mt-1">
              User ID: {user.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 