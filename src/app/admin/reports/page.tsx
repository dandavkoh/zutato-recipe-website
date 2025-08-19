import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminReportActions from '@/components/admin/AdminReportActions'
import AdminReportNotesInput from '@/components/admin/AdminReportNotesInput'

type ReportRow = {
  id: string
  created_at: string
  status: 'open' | 'in_review' | 'resolved' | 'rejected'
  reason: string
  details: string | null
  reported_by: string
  recipe_id: string | null
  recipe_comment_id?: string | null
  blog_comment_id?: string | null
  forum_thread_id?: string | null
  forum_post_id?: string | null
  user_message_id?: string | null
  profile_user_id?: string | null
  resolution_notes: string | null
}

export const metadata = { title: 'Admin – Meldungen' }

export default async function AdminReportsPage({ searchParams }: { searchParams?: Promise<{ status?: string; type?: string; from?: string; to?: string }> }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) redirect('/login')
  let isAdmin = false
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin')
    isAdmin = Boolean(rpcVal)
  } catch {}
  if (!isAdmin) redirect('/')

  // Parse filters
  const q = searchParams ? await searchParams : undefined
  const statusFilter = (q?.status as string) || ''
  const typeFilter = (q?.type as string) || '' // recipe|recipe_comment|blog_comment|forum_thread|forum_post|user_message|user_profile
  const fromFilter = (q?.from as string) || ''
  const toFilter = (q?.to as string) || ''

  // Load reports (first pass: all, client filters by type; status/date filters server-side)
  let query = supabase
    .from('content_reports')
    .select('id, created_at, status, reason, details, reported_by, recipe_id, recipe_comment_id, blog_comment_id, forum_thread_id, forum_post_id, user_message_id, profile_user_id, resolution_notes')
    .order('created_at', { ascending: false })
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }
  if (fromFilter) {
    query = query.gte('created_at', fromFilter)
  }
  if (toFilter) {
    query = query.lte('created_at', toFilter)
  }
  const { data: rows } = await query as any
  const allReports: ReportRow[] = ((rows as any[]) || [])
  const reports: ReportRow[] = allReports.filter(r => {
    const isRecipe = !!r.recipe_id
    const isRecipeComment = !!r.recipe_comment_id
    const isBlogComment = !!r.blog_comment_id
    const isForumThread = !!r.forum_thread_id
    const isForumPost = !!r.forum_post_id
    const isUserMessage = !!r.user_message_id
    const isUserProfile = !!r.profile_user_id
    if (!typeFilter) return isRecipe || isRecipeComment || isBlogComment || isForumThread || isForumPost || isUserMessage || isUserProfile
    if (typeFilter === 'recipe') return isRecipe
    if (typeFilter === 'recipe_comment') return isRecipeComment
    if (typeFilter === 'blog_comment') return isBlogComment
    if (typeFilter === 'forum_thread') return isForumThread
    if (typeFilter === 'forum_post') return isForumPost
    if (typeFilter === 'user_message') return isUserMessage
    if (typeFilter === 'user_profile') return isUserProfile
    return false
  })

  // Fetch extra info for recipe/title and reporter nickname
  const recipeIdsFromReports = reports.map(r => r.recipe_id).filter(Boolean) as string[]
  const recipeCommentIds = reports.map(r => r.recipe_comment_id).filter(Boolean) as string[]
  const blogCommentIds = reports.map(r => r.blog_comment_id).filter(Boolean) as string[]
  const forumThreadIds = reports.map(r => r.forum_thread_id).filter(Boolean) as string[]
  const forumPostIds = reports.map(r => r.forum_post_id).filter(Boolean) as string[]
  const userMessageIds = reports.map(r => r.user_message_id).filter(Boolean) as string[]
  const profileUserIds = reports.map(r => r.profile_user_id).filter(Boolean) as string[]
  // Load comment targets to resolve their parents
  const recipeIdByRecipeCommentId: Record<string, string> = {}
  const recipeCommentTextById: Record<string, string> = {}
  if (recipeCommentIds.length > 0) {
    const { data: rcx } = await supabase
      .from('recipe_comments')
      .select('id, recipe_id, comment')
      .in('id', recipeCommentIds)
    for (const row of ((rcx as any[]) || [])) {
      recipeIdByRecipeCommentId[row.id as string] = row.recipe_id as string
      recipeCommentTextById[row.id as string] = (row.comment as string) || ''
    }
  }
  const blogPostIdByBlogCommentId: Record<string, string> = {}
  const blogCommentTextById: Record<string, string> = {}
  if (blogCommentIds.length > 0) {
    const { data: bcx } = await supabase
      .from('blog_comments')
      .select('id, post_id, comment')
      .in('id', blogCommentIds)
    for (const row of ((bcx as any[]) || [])) {
      blogPostIdByBlogCommentId[row.id as string] = row.post_id as string
      blogCommentTextById[row.id as string] = (row.comment as string) || ''
    }
  }
  let threadTitleById: Record<string, string> = {}
  if (forumThreadIds.length > 0) {
    const { data: ftx } = await supabase
      .from('forum_threads')
      .select('id, title')
      .in('id', forumThreadIds)
    threadTitleById = Object.fromEntries(((ftx as any[]) || []).map(t => [t.id as string, (t.title as string) || 'Thread']))
  }
  const postThreadIdByPostId: Record<string, string> = {}
  const postContentById: Record<string, string> = {}
  if (forumPostIds.length > 0) {
    const { data: fpx } = await supabase
      .from('forum_posts')
      .select('id, thread_id, content')
      .in('id', forumPostIds)
    for (const row of ((fpx as any[]) || [])) {
      postThreadIdByPostId[row.id as string] = row.thread_id as string
      postContentById[row.id as string] = (row.content as string) || ''
    }
  }
  const messageSubjectById: Record<string, string> = {}
  const messageBodyById: Record<string, string> = {}
  if (userMessageIds.length > 0) {
    const { data: umx } = await supabase
      .from('user_messages')
      .select('id, subject, body')
      .in('id', userMessageIds)
    for (const row of ((umx as any[]) || [])) {
      messageSubjectById[row.id as string] = (row.subject as string) || 'Nachricht'
      messageBodyById[row.id as string] = (row.body as string) || ''
    }
  }
  // Collect final recipeIds and blogPostIds for title/slug
  const recipeIds = Array.from(new Set([
    ...recipeIdsFromReports,
    ...Object.values(recipeIdByRecipeCommentId),
  ].filter(Boolean))) as string[]
  const blogPostIds = Array.from(new Set(Object.values(blogPostIdByBlogCommentId))) as string[]
  const reporterIds = Array.from(new Set(reports.map(r => r.reported_by).filter(Boolean))) as string[]
  let recipeNameById: Record<string, string> = {}
  let reporterNameById: Record<string, string> = {}
  const profileNameById: Record<string, string> = {}
  const blogSlugById: Record<string, string> = {}
  const blogTitleById: Record<string, string> = {}
  if (recipeIds.length > 0) {
    const { data: rx } = await supabase.from('recipes_with_details').select('id, name').in('id', recipeIds)
    recipeNameById = Object.fromEntries(((rx as any[]) || []).map(r => [r.id as string, r.name as string]))
  }
  const userIdsToFetch = Array.from(new Set([...
    reporterIds,
    ...profileUserIds,
  ])) as string[]
  if (userIdsToFetch.length > 0) {
    const { data: px } = await supabase.from('public_user_profile').select('user_id, nickname').in('user_id', userIdsToFetch)
    for (const row of ((px as any[]) || [])) {
      const uid = row.user_id as string
      const name = (row.nickname as string) || 'Nutzer'
      reporterNameById[uid] = name
      profileNameById[uid] = name
    }
  }
  if (blogPostIds.length > 0) {
    const { data: bpx } = await supabase.from('blog_posts').select('id, slug, title').in('id', blogPostIds)
    for (const row of ((bpx as any[]) || [])) {
      blogSlugById[row.id as string] = row.slug as string
      blogTitleById[row.id as string] = (row.title as string) || 'Artikel'
    }
  }

  function slugify(input: string): string {
    return (input || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Meldungen</h1>
          <p className="text-gray-600 mt-1">Gemeldete Beiträge</p>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" action="/admin/reports" method="get">
            <select name="status" defaultValue={statusFilter} className="text-sm border rounded px-2 py-2">
              <option value="">Status (alle)</option>
              <option value="open">offen</option>
              <option value="in_review">in Prüfung</option>
              <option value="resolved">gelöst</option>
              <option value="rejected">abgelehnt</option>
            </select>
            <select name="type" defaultValue={typeFilter} className="text-sm border rounded px-2 py-2">
              <option value="">Typ (alle)</option>
              <option value="recipe">Rezept</option>
              <option value="recipe_comment">Rezept-Kommentar</option>
              <option value="blog_comment">Blog-Kommentar</option>
              <option value="forum_thread">Forum-Thread</option>
              <option value="forum_post">Forum-Beitrag</option>
              <option value="user_message">Nachricht</option>
              <option value="user_profile">Profil</option>
            </select>
            <input type="date" name="from" defaultValue={fromFilter} className="text-sm border rounded px-2 py-2" />
            <input type="date" name="to" defaultValue={toFilter} className="text-sm border rounded px-2 py-2" />
            <div className="sm:col-span-2 lg:col-span-4">
              <button className="text-sm px-3 py-2 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50">Filtern</button>
            </div>
          </form>
          {reports.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">Keine Meldungen vorhanden.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Datum</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Ziel</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Typ</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Gemeldet von</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Grund</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Details</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Auszug</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Notizen</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{new Date(r.created_at).toLocaleString('de-DE')}</td>
                        <td className="px-4 py-3">
                          {r.recipe_id ? (
                            <Link href={`/rezepte/${r.recipe_id}/${slugify(recipeNameById[r.recipe_id] || 'rezept')}`} className="text-orange-700 hover:underline">
                              {recipeNameById[r.recipe_id] || 'Rezept'}
                            </Link>
                          ) : r.recipe_comment_id ? (
                            (() => {
                              const recId = recipeIdByRecipeCommentId[r.recipe_comment_id as string]
                              const name = recipeNameById[recId]
                              return recId ? (
                                <Link href={`/rezepte/${recId}/${slugify(name || 'rezept')}`} className="text-orange-700 hover:underline">{(name || 'Rezept')}</Link>
                              ) : (<span>-</span>)
                            })()
                          ) : r.blog_comment_id ? (
                            (() => {
                              const postId = blogPostIdByBlogCommentId[r.blog_comment_id as string]
                              const slug = blogSlugById[postId]
                              const title = blogTitleById[postId]
                              return slug ? (
                                <Link href={`/blog/${slug}`} className="text-orange-700 hover:underline">{(title || 'Artikel')}</Link>
                              ) : (<span>-</span>)
                            })()
                          ) : r.forum_thread_id ? (
                            (() => {
                              const title = threadTitleById[r.forum_thread_id as string]
                              return (
                                <Link href={`/forum/t/${r.forum_thread_id}`} className="text-orange-700 hover:underline">{(title || 'Thread')}</Link>
                              )
                            })()
                          ) : r.forum_post_id ? (
                            (() => {
                              const thrId = postThreadIdByPostId[r.forum_post_id as string]
                              const title = threadTitleById[thrId]
                              return thrId ? (
                                <Link href={`/forum/t/${thrId}`} className="text-orange-700 hover:underline">{(title || 'Thread')}</Link>
                              ) : (<span>-</span>)
                            })()
                          ) : r.user_message_id ? (
                            <span className="text-gray-900">Nachricht</span>
                          ) : r.profile_user_id ? (
                            <Link href={`/user/${r.profile_user_id}`} className="text-orange-700 hover:underline">{profileNameById[r.profile_user_id] || 'Profil'}</Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {r.recipe_id ? 'Rezept' : r.recipe_comment_id ? 'Rezept-Kommentar' : r.blog_comment_id ? 'Blog-Kommentar' : r.forum_thread_id ? 'Forum-Thread' : r.forum_post_id ? 'Forumbeitrag' : r.user_message_id ? 'Nachricht' : r.profile_user_id ? 'Profil' : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <Link href={`/user/${r.reported_by}`} className="text-gray-700 hover:underline">
                            {reporterNameById[r.reported_by] || r.reported_by}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{r.reason}</td>
                        <td className="px-4 py-3 text-gray-700">{r.details || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {r.recipe_comment_id ? (recipeCommentTextById[r.recipe_comment_id] || '-').slice(0, 120)
                            : r.blog_comment_id ? (blogCommentTextById[r.blog_comment_id] || '-').slice(0, 120)
                            : r.forum_post_id ? (postContentById[r.forum_post_id] || '-').slice(0, 120)
                            : r.user_message_id ? (messageBodyById[r.user_message_id] || messageSubjectById[r.user_message_id] || '-').slice(0, 120)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 min-w-[220px]">
                          <AdminReportNotesInput reportId={r.id} initialNotes={r.resolution_notes || ''} />
                        </td>
                        <td className="px-4 py-3">
                          <AdminReportActions reportId={r.id} initialStatus={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

