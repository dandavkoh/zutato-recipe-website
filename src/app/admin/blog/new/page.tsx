import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminBlogForm from '@/components/admin/AdminBlogForm';

export const metadata = { title: 'Neuer Blogbeitrag' };

export default async function AdminBlogNewPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect('/login');

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Neuer Blogbeitrag</h1>
        <AdminBlogForm mode="create" />
      </div>
    </div>
  );
}
