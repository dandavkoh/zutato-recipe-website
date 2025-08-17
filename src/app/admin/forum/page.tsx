import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminCreateForumSection from '@/components/admin/AdminCreateForumSection'
import AdminManageForumSections from '@/components/admin/AdminManageForumSections'

export const metadata = { title: 'Admin – Forum' }

export default async function AdminForumPage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) redirect('/login')

  let isAdmin = false
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin')
    isAdmin = Boolean(rpcVal)
  } catch {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('is_admin')
      .eq('user_id', auth.user.id)
      .maybeSingle()
    isAdmin = Boolean((settings as any)?.is_admin)
  }
  if (!isAdmin) redirect('/')

  const { data: sections } = await supabase
    .from('forum_sections')
    .select('slug, title, description, sort_order, is_archived')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Forum verwalten</h1>
          <p className="text-gray-600 mt-1">Bereiche erstellen, bearbeiten und löschen</p>
        </div>
      </section>
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-xl font-semibold text-gray-900 mb-4">Bereich erstellen</div>
            <AdminCreateForumSection />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-xl font-semibold text-gray-900 mb-4">Bereiche verwalten</div>
            <AdminManageForumSections initialSections={((sections as any[]) || [])} />
          </div>
        </div>
      </section>
    </div>
  )
}

