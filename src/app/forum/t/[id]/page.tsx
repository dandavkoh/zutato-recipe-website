import React from 'react';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import FollowThreadButton from '@/components/forum/FollowThreadButton';
import AdminThreadActions from '@/components/forum/AdminThreadActions';
// import MarkReadButton from '@/components/forum/MarkReadButton';
import OwnerPostActions from '@/components/forum/OwnerPostActions';
import OwnerThreadActions from '@/components/forum/OwnerThreadActions';
import AutoMarkRead from '@/components/forum/AutoMarkRead';
import NewPostEditor from '@/components/forum/NewPostEditor';
import ReportThreadDialog from '@/components/forum/ReportThreadDialog';
import ReportPostDialog from '@/components/forum/ReportPostDialog';

type RouteParams = { id: string };

export const runtime = 'nodejs'

export default async function ThreadPage({ params, searchParams }: { params: Promise<RouteParams>; searchParams?: Promise<{ page?: string; nav?: string }> }) {
  const { id } = await params;
  const q = searchParams ? await searchParams : undefined
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from('forum_threads')
    .select('id, title, body, is_closed, is_archived, is_deleted, posts_count, views_count, created_by, section_id, created_at')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  // Admin check
  let isAdmin = false
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin')
    isAdmin = Boolean(rpcVal)
  } catch {}

  if (!thread || (thread as any).is_deleted) {
    return <div className="min-h-screen bg-gray-50 p-8">Thread nicht gefunden.</div>;
  }

  // Following state
  let initiallyFollowing = false
  const { data: auth } = await supabase.auth.getUser()
  if (auth?.user) {
    const { data: followRow } = await supabase
      .from('forum_thread_follows')
      .select('id')
      .eq('thread_id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    initiallyFollowing = Boolean(followRow)
  }

  const postsPageSize = 10
  const postsCurrentPage = Math.max(1, Number((q?.page as string) || '1') || 1)
  const pFrom = (postsCurrentPage - 1) * postsPageSize
  const pTo = pFrom + postsPageSize - 1
  const { data: posts, count: postsCount } = await supabase
    .from('forum_posts')
    .select('id, user_id, content, is_deleted, created_at, updated_at', { count: 'exact' })
    .eq('thread_id', id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .range(pFrom, pTo);
  // Load section info for breadcrumb
  let sectionSlug: string | null = null
  let sectionTitle: string | null = null
  if ((thread as any).section_id) {
    const { data: sec } = await supabase
      .from('forum_sections')
      .select('slug, title')
      .eq('id', (thread as any).section_id)
      .maybeSingle()
    if (sec) { sectionSlug = (sec as any).slug as string; sectionTitle = (sec as any).title as string }
  }

  const postsList = (posts as any[] | null) || [];
  const postsTotal = postsCount || 0
  const postsTotalPages = Math.max(1, Math.ceil(postsTotal / postsPageSize))
  const lastPostId = postsList.length > 0 ? postsList[postsList.length - 1].id as string : null
  // Increment views only on visit, not when paging through posts via our pagination links (nav=1).
  const isPaginationNav = (q?.nav === '1')
  if (!isPaginationNav) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const nextViews = Number((thread as any).views_count || 0) + 1
      if (supabaseUrl && serviceKey) {
        const admin = createServiceClient(supabaseUrl, serviceKey)
        await admin.from('forum_threads').update({ views_count: nextViews }).eq('id', id)
      } else {
        await supabase.from('forum_threads').update({ views_count: nextViews }).eq('id', id)
      }
    } catch {}
  }
  // Collect involved user IDs (thread author + post authors)
  const involvedUserIds: string[] = Array.from(new Set([
    (thread as any).created_by as string,
    ...postsList.map((p) => p.user_id as string),
  ].filter(Boolean)))
  // Load public profiles (nickname, avatar)
  let profileByUserId: Record<string, { nickname: string | null; avatar_url: string | null }> = {}
  if (involvedUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('public_user_profile')
      .select('user_id, nickname, avatar_url')
      .in('user_id', involvedUserIds)
    profileByUserId = Object.fromEntries(((profiles as any[]) || []).map((p) => [p.user_id as string, { nickname: (p as any).nickname ?? null, avatar_url: (p as any).avatar_url ?? null }]))
  }
  // Mark thread as read on open for logged-in users
  if (auth?.user) {
    const nowIso = new Date().toISOString()
    await supabase
      .from('forum_thread_reads')
      .upsert({
        thread_id: id,
        user_id: auth.user.id,
        last_read_post_id: lastPostId,
        last_read_at: nowIso,
      })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <nav className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <Link href="/forum" className="hover:text-orange-700">Forum</Link>
                <span className="text-gray-400">›</span>
                {sectionSlug ? (
                  <Link href={`/forum/${sectionSlug}`} className="hover:text-orange-700">{sectionTitle || 'Bereich'}</Link>
                ) : (
                  <span className="text-gray-900">Bereich</span>
                )}
                <span className="text-gray-400">›</span>
                <span className="text-gray-900 truncate">{(thread as any).title}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">{(thread as any).title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {auth?.user && (
                <FollowThreadButton threadId={id} initiallyFollowing={initiallyFollowing} />
              )}
              {/* Antworten-Link entfernt – Inline-Editor am Seitenende */}
              {isAdmin && (
                <AdminThreadActions threadId={id} isClosed={(thread as any).is_closed} isArchived={(thread as any).is_archived} />
              )}
            </div>
          </div>
          {(thread as any).is_closed && <div className="mt-2 text-xs inline-block px-2 py-1 rounded bg-gray-100 text-gray-600">geschlossen</div>}
          {(thread as any).is_archived && <div className="mt-2 ml-2 text-xs inline-block px-2 py-1 rounded bg-gray-100 text-gray-600">archiv</div>}
          {(thread as any).body && (
            <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-white text-gray-900">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const profile = profileByUserId[(thread as any).created_by as string] || { nickname: null, avatar_url: null }
                    const name = profile.nickname || 'Unbekannt'
                    const avatar = profile.avatar_url
                    return (
                      <>
                        {avatar ? (
                          <img src={avatar} alt={name} className="h-8 w-8 rounded-full object-cover border" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs border">
                            {(name || '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <Link href={`/user/${(thread as any).created_by}`} className="text-sm text-gray-700 hover:underline">{name}</Link>
                        <span className="text-xs text-gray-500">{new Date((thread as any).created_at).toLocaleString('de-DE')}</span>
                      </>
                    )
                  })()}
                </div>
                {auth?.user && !isAdmin && <ReportThreadDialog threadId={id} />}
              </div>
              <div className="whitespace-pre-wrap">{(thread as any).body}</div>
            </div>
          )}
          {/* Owner Thread Actions nur für Ersteller */}
          {(isAdmin || (auth?.user && auth.user.id === (thread as any).created_by)) && (
            <OwnerThreadActions threadId={id} initialTitle={(thread as any).title} initialBody={(thread as any).body || null} />
          )}
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {postsList.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">Noch keine Beiträge vorhanden.</div>
          ) : (
            <div className="space-y-4">
              {postsList.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const profile = profileByUserId[p.user_id as string] || { nickname: null, avatar_url: null }
                        const name = profile.nickname || 'Unbekannt'
                        const avatar = profile.avatar_url
                        return (
                          <>
                            {avatar ? (
                              <img src={avatar} alt={name} className="h-8 w-8 rounded-full object-cover border" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs border">
                                {(name || '?').slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <Link href={`/user/${p.user_id}`} className="text-sm text-gray-700 hover:underline">{name}</Link>
                            <span className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString('de-DE')}</span>
                          </>
                        )
                      })()}
                    </div>
                    {auth?.user && !isAdmin && (
                      <ReportPostDialog postId={p.id as string} />
                    )}
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">{p.content}</div>
                  {(isAdmin || (auth?.user && auth.user.id === (p.user_id as string))) && (
                    <OwnerPostActions postId={p.id as string} initialContent={p.content as string} />
                  )}
                </div>
              ))}
            </div>
          )}
          {/* "Gelesen" Button entfernt – AutoMarkRead markiert automatisch */}
          {auth?.user && <AutoMarkRead threadId={id} lastPostId={lastPostId} />}
          <div className="mt-6 flex items-center justify-between text-sm">
            <div className="text-gray-600">Seite {postsCurrentPage} von {postsTotalPages}</div>
            <div className="flex items-center gap-2">
              <Link href={`/forum/t/${id}?page=${Math.max(1, postsCurrentPage - 1)}&nav=1`} className={`px-3 py-1.5 rounded-lg border ${postsCurrentPage <= 1 ? 'pointer-events-none opacity-50 border-gray-300 text-gray-400' : 'border-orange-600 text-orange-700 hover:bg-orange-50'}`}>Zurück</Link>
              <Link href={`/forum/t/${id}?page=${Math.min(postsTotalPages, postsCurrentPage + 1)}&nav=1`} className={`px-3 py-1.5 rounded-lg border ${postsCurrentPage >= postsTotalPages ? 'pointer-events-none opacity-50 border-gray-300 text-gray-400' : 'border-orange-600 text-orange-700 hover:bg-orange-50'}`}>Weiter</Link>
            </div>
          </div>
          {auth?.user && (
            <NewPostEditor threadId={id} disabled={(thread as any).is_closed || (thread as any).is_archived} />
          )}
        </div>
      </section>
    </div>
  );
}

