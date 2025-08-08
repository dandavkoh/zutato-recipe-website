import { requireAuth } from '@/utils/serverAuthUtils';
import RecipeForm from './RecipeForm';

export default async function RezeptEinreichenPage() {
  const user = await requireAuth();

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

        <RecipeForm />
      </div>
    </div>
  );
} 