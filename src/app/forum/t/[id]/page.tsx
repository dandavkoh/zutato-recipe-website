import React from 'react';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import Script from 'next/script';
import FollowThreadButton from '@/components/forum/FollowThreadButton';
import AdminThreadActions from '@/components/forum/AdminThreadActions';
// import MarkReadButton from '@/components/forum/MarkReadButton';
import OwnerPostActions from '@/components/forum/OwnerPostActions';
import OwnerThreadActions from '@/components/forum/OwnerThreadActions';
import AutoMarkRead from '@/components/forum/AutoMarkRead';
import NewPostEditor from '@/components/forum/NewPostEditor';
import ReportThreadDialog from '@/components/forum/ReportThreadDialog';
import ReportPostDialog from '@/components/forum/ReportPostDialog';
import VoteButton from '@/components/VoteButton';
import PageViewTracker from '@/components/PageViewTracker';
/* Replies UI intentionally not imported for forum (Antworten entfernt) */

export const runtime = 'nodejs'

type RouteParams = { id: string };

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_threads')
    .select('title, is_deleted')
    .eq('id', id)
    .maybeSingle();
  const row: any = data;
  const title = row?.title ? `Thread – ${row.title}` : 'Thread';
  const url = `/forum/t/${id}`;
  return {
    title,
    description: 'Diskussion im Forum',
    alternates: { canonical: url },
    openGraph: {
      title,
      description: 'Diskussion im Forum',
      url,
      images: [{ url: `${url}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'Diskussion im Forum',
      images: [`${url}/opengraph-image`],
      creator: '@zutato',
    },
  };
}

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
  // Votes: thread + posts
  let threadVoteCount = 0;
  let threadVotedByUser = false;
  {
    const { data: vt } = await supabase
      .from('forum_thread_votes')
      .select('thread_id, user_id')
      .eq('thread_id', id);
    const uid = auth?.user?.id;
    threadVoteCount = ((vt as any[]) || []).length;
    threadVotedByUser = Boolean(((vt as any[]) || []).find((r) => uid && r.user_id === uid));
  }
  const postVoteCount: Record<string, number> = {};
  const postVotedByUser = new Set<string>();
  if (postsList.length > 0) {
    const ids = postsList.map((p) => p.id as string);
    const { data: vp } = await supabase
      .from('forum_post_votes')
      .select('post_id, user_id')
      .in('post_id', ids);
    const uid = auth?.user?.id;
    for (const row of (vp as any[]) || []) {
      const pid = row.post_id as string;
      postVoteCount[pid] = (postVoteCount[pid] || 0) + 1;
      if (uid && row.user_id === uid) postVotedByUser.add(pid);
    }
  }
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

  const { default: AdminPostActions } = await import('@/components/forum/AdminPostActions')
  const { default: AdminThreadEditActions } = await import('@/components/forum/AdminThreadEditActions')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const absoluteUrl = `${siteUrl}/forum/t/${id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageViewTracker event="forum_thread_view" contentType="forum_thread" contentId={id} />
      <Script id="discussion-ld-json" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DiscussionForumPosting',
            mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl },
            headline: (thread as any).title,
            datePublished: (thread as any).created_at,
            dateModified: (postsList.length > 0 ? postsList[postsList.length - 1].created_at : (thread as any).created_at),
            author: undefined,
            publisher: { '@type': 'Organization', name: 'ZUTATO' },
            interactionStatistic: {
              '@type': 'InteractionCounter',
              interactionType: { '@type': 'http://schema.org/CommentAction' },
              userInteractionCount: postsTotal,
            },
          }),
        }}
      />
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              {/* Header: Admin Close/Archive */}
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
              {/* Inline owner edit for thread title/body available below */}
              <div className="whitespace-pre-wrap">{(thread as any).body}</div>
              <div className="mt-2">
                <VoteButton
                  kind="forum_thread"
                  targetId={id}
                  initialCount={threadVoteCount}
                  initiallyVoted={threadVotedByUser}
                  enabled={Boolean(auth?.user)}
                />
              </div>
              {/* Replies (level 1) to thread body as the first post, modelled as posts with parent_post_id=null, so we render replies to each post below */}
            </div>
          )}
          {/* Owner Thread Actions nur für Ersteller */}
          {(auth?.user && auth.user.id === (thread as any).created_by) && (
            <OwnerThreadActions threadId={id} initialTitle={(thread as any).title} initialBody={(thread as any).body || null} />
          )}
          {isAdmin && (
            <div className="mt-2">
              {/* Footer: Admin Edit/Hide */}
              <AdminThreadEditActions threadId={id} initialTitle={(thread as any).title} initialBody={(thread as any).body || ''} />
            </div>
          )}
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {(auth?.user && auth.user.id === (p.user_id as string)) ? (
                      <OwnerPostActions postId={p.id as string} initialContent={p.content as string} renderInline />
                    ) : (
                      <>{p.content}</>
                    )}
                  </div>
                  {/* Antworten-Funktion im Forum entfernt */}
                  <div className="mt-2">
                    <VoteButton
                      kind="forum_post"
                      targetId={p.id as string}
                      initialCount={postVoteCount[p.id as string] || 0}
                      initiallyVoted={postVotedByUser.has(p.id as string)}
                      enabled={Boolean(auth?.user)}
                      small
                    />
                  </div>
                  {/* Untere Bearbeiten/Ausblenden-Buttons entfernt – Inline-Variante oben bleibt */}
                  {isAdmin && (
                    <div className="mt-2">
                      <AdminPostActions postId={p.id as string} initialContent={p.content as string} />
                    </div>
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

