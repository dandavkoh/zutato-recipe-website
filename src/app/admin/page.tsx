import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const metadata = {
  title: 'Adminbereich',
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect('/login');
  }

  // Prefer RPC if available, fallback to table lookup
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

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Adminbereich</h1>
              <p className="text-gray-600">Verwaltung und Tools</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/admin/blog" className="group block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="text-xl font-semibold text-gray-900 group-hover:text-orange-700">Blog verwalten</div>
              <div className="mt-2 text-gray-600 text-sm">Beiträge erstellen, bearbeiten und veröffentlichen</div>
            </Link>
            {/* Placeholder for future tools */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-400">
              Weitere Admin-Tools folgen…
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

