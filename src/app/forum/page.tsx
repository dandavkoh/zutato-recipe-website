import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export const metadata = {
  title: 'Forum',
  description: 'Diskussionen nach Bereichen',
};

type Section = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_archived: boolean;
};

export default async function ForumHomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_sections')
    .select('id, slug, title, description, sort_order, is_archived')
    .order('is_archived', { ascending: true })
    .order('sort_order', { ascending: true });
  const sections = (data as Section[] | null) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Forum</h1>
          <p className="text-gray-600 mt-2">Bereiche und Diskussionen</p>
        </div>
      </section>
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {sections.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">Noch keine Bereiche vorhanden.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((s) => (
                <Link key={s.id} href={`/forum/${s.slug}`} className="group block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-700">{s.title}</h3>
                      {s.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.description}</p>}
                    </div>
                    {s.is_archived && <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">Archiv</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

