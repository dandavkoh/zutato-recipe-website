import Link from 'next/link';

export const metadata = {
  title: 'Neue Rezepte - KochMeister',
  description: 'Entdecke die neuesten Rezepte unserer Community. Frische Ideen und innovative Gerichte von Hobbyköchen und Profis.',
};

export default function NeueRezeptePage() {
  const newRecipes = [
    {
      id: 1,
      title: 'Avocado Toast mit Ei',
      author: 'Sarah Müller',
      time: '10 Min',
      difficulty: 'Einfach',
      rating: 4.6,
      image: '🥑',
      isNew: true,
      date: 'vor 2 Stunden'
    },
    {
      id: 2,
      title: 'Quinoa Buddha Bowl',
      author: 'Lisa Schmidt',
      time: '25 Min',
      difficulty: 'Einfach',
      rating: 4.8,
      image: '🥗',
      isNew: true,
      date: 'vor 4 Stunden'
    },
    {
      id: 3,
      title: 'Chocolate Chip Cookies',
      author: 'Max Weber',
      time: '35 Min',
      difficulty: 'Mittel',
      rating: 4.9,
      image: '🍪',
      isNew: true,
      date: 'vor 6 Stunden'
    },
    {
      id: 4,
      title: 'Pasta Arrabbiata',
      author: 'Marco Rossi',
      time: '20 Min',
      difficulty: 'Einfach',
      rating: 4.7,
      image: '🍝',
      isNew: true,
      date: 'vor 8 Stunden'
    },
    {
      id: 5,
      title: 'Smoothie Bowl',
      author: 'Anna Klein',
      time: '15 Min',
      difficulty: 'Einfach',
      rating: 4.5,
      image: '🥤',
      isNew: true,
      date: 'vor 10 Stunden'
    },
    {
      id: 6,
      title: 'Thai Green Curry',
      author: 'Tom Chen',
      time: '40 Min',
      difficulty: 'Mittel',
      rating: 4.8,
      image: '🍛',
      isNew: true,
      date: 'vor 12 Stunden'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Neue Rezepte
              </h1>
              <p className="text-gray-600">
                Entdecke die neuesten Kreationen unserer Community
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link 
                href="/rezept-einreichen" 
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                Rezept einreichen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Alle Kategorien</option>
              <option>Hauptgerichte</option>
              <option>Desserts</option>
              <option>Vegetarisch</option>
              <option>Schnell & Einfach</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Alle Schwierigkeiten</option>
              <option>Einfach</option>
              <option>Mittel</option>
              <option>Schwer</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Neueste zuerst</option>
              <option>Bewertung</option>
              <option>Zeit</option>
            </select>
          </div>
        </div>
      </section>

      {/* Recipes Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
                    {recipe.image}
                  </div>
                  {recipe.isNew && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Neu
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white bg-opacity-90 text-gray-600 px-2 py-1 rounded text-xs">
                    {recipe.date}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {recipe.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    von {recipe.author}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>⏱️ {recipe.time}</span>
                    <span>📊 {recipe.difficulty}</span>
                    <span>⭐ {recipe.rating}</span>
                  </div>
                  <Link 
                    href={`/rezepte/${recipe.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2 rounded-lg font-medium transition-colors"
                  >
                    Rezept anzeigen
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          <div className="text-center mt-12">
            <button className="bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 px-8 py-3 rounded-full font-medium transition-colors">
              Weitere Rezepte laden
            </button>
          </div>
        </div>
      </section>
    </div>
  );
} 