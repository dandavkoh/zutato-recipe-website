import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-orange-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Entdecke die besten
              <span className="text-orange-600 block">Rezepte der Welt</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Tausende von Rezepten von Hobbyköchen und Profis. Teile deine Lieblingsrezepte 
              und lerne neue Koch-Techniken in unserer lebendigen Community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/neue-rezepte" 
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors"
              >
                Neue Rezepte entdecken
              </Link>
              <Link 
                href="/rezept-einreichen" 
                className="bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 px-8 py-4 rounded-full font-semibold text-lg transition-colors"
              >
                Rezept teilen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Beliebte Kategorien
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Hauptgerichte', icon: '🍖', count: '2.5k' },
              { name: 'Desserts', icon: '🍰', count: '1.8k' },
              { name: 'Vegetarisch', icon: '🥗', count: '1.2k' },
              { name: 'Schnell & Einfach', icon: '⚡', count: '3.1k' },
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Recipes */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Empfohlene Rezepte
            </h2>
            <Link 
              href="/beliebte-rezepte" 
              className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Alle anzeigen →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Pasta Carbonara',
                author: 'Chef Maria',
                time: '25 Min',
                difficulty: 'Einfach',
                rating: 4.8,
                image: '🍝'
              },
              {
                title: 'Chocolate Cake',
                author: 'Bäckerin Anna',
                time: '45 Min',
                difficulty: 'Mittel',
                rating: 4.9,
                image: '🍰'
              },
              {
                title: 'Thai Curry',
                author: 'Koch Tom',
                time: '35 Min',
                difficulty: 'Mittel',
                rating: 4.7,
                image: '🍛'
              }
            ].map((recipe) => (
              <div key={recipe.title} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
                  {recipe.image}
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
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Werde Teil unserer Community
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Teile deine Lieblingsrezepte, lerne von anderen Köchen und werde Teil 
              der größten Koch-Community Deutschlands.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">50.000+ Mitglieder</h3>
                <p className="text-gray-600">Aktive Community von Hobbyköchen und Profis</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">📖</div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">10.000+ Rezepte</h3>
                <p className="text-gray-600">Von traditionell bis modern, für jeden Geschmack</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Monatliche Challenges</h3>
                <p className="text-gray-600">Wettbewerbe und Events für alle Kochbegeisterten</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
