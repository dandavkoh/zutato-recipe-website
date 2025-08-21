import { requireAuth } from '@/utils/serverAuthUtils';
import RecipeForm from './RecipeForm';

export default async function RezeptEinreichenPage() {
  const user = await requireAuth('/rezept-einreichen');

  // Nur wenn User angemeldet, die Seite rendern
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rezept einreichen
          </h1>
          <p className="text-gray-600">
            Teile dein Lieblingsrezept mit der ZUTATO-Community
          </p>
        </div>


        <RecipeForm />
      </div>
    </div>
  );
} 