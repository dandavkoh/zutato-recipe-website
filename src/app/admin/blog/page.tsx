import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

type AdminPost = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at: string | null;
  updated_at: string | null;
  is_deleted: boolean | null;
};

export const metadata = {
  title: 'Blog verwalten',
};

export default async function AdminBlogListPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect('/login');
  }

  // Check admin
  let isAdmin = false;
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
    isAdmin = Boolean(rpcVal);
  } catch {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('is_admin')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    isAdmin = Boolean((settings as any)?.is_admin);
  }
  if (!isAdmin) redirect('/');

  const { data } = await supabase
    .from('blog_posts')
    .select('id, slug, title, status, published_at, updated_at, is_deleted')
    .order('updated_at', { ascending: false });
  const posts: AdminPost[] = (data as AdminPost[]) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog verwalten</h1>
              <p className="text-gray-600">Beiträge erstellen, bearbeiten und verwalten</p>
            </div>
            <Link href="/admin/blog/new" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-medium transition-colors">Neuer Beitrag</Link>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">Noch keine Beiträge.</div>
          ) : (
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Titel</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Veröffentlicht</th>
                    <th className="px-4 py-3">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                      <td className="px-4 py-3">{p.is_deleted ? 'gelöscht' : p.status}</td>
                      <td className="px-4 py-3">{p.published_at ? new Date(p.published_at).toLocaleDateString('de-DE') : '–'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <Link href={`/admin/blog/${p.id}/edit`} className="text-orange-700 hover:underline">Bearbeiten</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

