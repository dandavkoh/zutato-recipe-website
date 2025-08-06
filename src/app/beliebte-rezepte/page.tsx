import Link from 'next/link';

export const metadata = {
  title: 'Beliebte Rezepte - KochMeister',
  description: 'Die beliebtesten und bestbewerteten Rezepte unserer Community. Entdecke die Favoriten der KochMeister-Community.',
};

export default function BeliebteRezeptePage() {
  const popularRecipes = [
    {
      id: 1,
      title: 'Pasta Carbonara',
      author: 'Chef Maria',
      time: '25 Min',
      difficulty: 'Einfach',
      rating: 4.9,
      votes: 1247,
      image: '🍝',
      rank: 1,
      category: 'Hauptgerichte'
    },
    {
      id: 2,
      title: 'Chocolate Cake',
      author: 'Bäckerin Anna',
      time: '45 Min',
      difficulty: 'Mittel',
      rating: 4.8,
      votes: 1156,
      image: '🍰',
      rank: 2,
      category: 'Desserts'
    },
    {
      id: 3,
      title: 'Thai Curry',
      author: 'Koch Tom',
      time: '35 Min',
      difficulty: 'Mittel',
      rating: 4.7,
      votes: 987,
      image: '🍛',
      rank: 3,
      category: 'Hauptgerichte'
    },
    {
      id: 4,
      title: 'Avocado Toast',
      author: 'Sarah Müller',
      time: '10 Min',
      difficulty: 'Einfach',
      rating: 4.6,
      votes: 856,
      image: '🥑',
      rank: 4,
      category: 'Frühstück'
    },
    {
      id: 5,
      title: 'Quinoa Bowl',
      author: 'Lisa Schmidt',
      time: '25 Min',
      difficulty: 'Einfach',
      rating: 4.5,
      votes: 743,
      image: '🥗',
      rank: 5,
      category: 'Vegetarisch'
    },
    {
      id: 6,
      title: 'Chocolate Chip Cookies',
      author: 'Max Weber',
      time: '35 Min',
      difficulty: 'Mittel',
      rating: 4.4,
      votes: 689,
      image: '🍪',
      rank: 6,
      category: 'Desserts'
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
                Beliebte Rezepte
              </h1>
              <p className="text-gray-600">
                Die bestbewerteten und beliebtesten Rezepte unserer Community
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

      {/* Stats */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">10.000+</div>
              <div className="text-orange-100">Rezepte bewertet</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50.000+</div>
              <div className="text-orange-100">Community-Mitglieder</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">4.8</div>
              <div className="text-orange-100">Durchschnittliche Bewertung</div>
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
              <option>Frühstück</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Bewertung</option>
              <option>Beliebtheit</option>
              <option>Neueste</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Alle Schwierigkeiten</option>
              <option>Einfach</option>
              <option>Mittel</option>
              <option>Schwer</option>
            </select>
          </div>
        </div>
      </section>

      {/* Top Recipes */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Top 10 Rezepte</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {popularRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
                    {recipe.image}
                  </div>
                  <div className="absolute top-4 left-4 bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    {recipe.rank}
                  </div>
                  <div className="absolute top-4 right-4 bg-white bg-opacity-90 text-gray-600 px-2 py-1 rounded text-xs">
                    {recipe.category}
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
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>👥 {recipe.votes} Bewertungen</span>
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
              Weitere beliebte Rezepte laden
            </button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Beliebte Kategorien
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Hauptgerichte', icon: '🍖', count: '2.5k', rating: 4.7 },
              { name: 'Desserts', icon: '🍰', count: '1.8k', rating: 4.8 },
              { name: 'Vegetarisch', icon: '🥗', count: '1.2k', rating: 4.6 },
              { name: 'Frühstück', icon: '🥞', count: '900', rating: 4.5 },
            ].map((category) => (
              <Link 
                key={category.name}
                href={`/kategorien/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group bg-gray-50 hover:bg-orange-50 rounded-xl p-6 text-center transition-colors"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{category.count} Rezepte</p>
                <p className="text-sm text-orange-600 mt-1">⭐ {category.rating}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
} 