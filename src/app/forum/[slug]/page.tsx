import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import VoteButton from '@/components/VoteButton';
import PageViewTracker from '@/components/PageViewTracker';

type RouteParams = { slug: string };

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_sections')
    .select('title, description')
    .eq('slug', slug)
    .maybeSingle();
  const row: any = data;
  const title = row?.title ? `Forum – ${row.title}` : `Forum – ${slug}`;
  const description = row?.description || 'Diskussionen im Bereich';
  const url = `/forum/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [
        { url: `${url}/opengraph-image`, width: 1200, height: 630, alt: title },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${url}/opengraph-image`],
      creator: '@zutato',
    },
  };
}

type Thread = {
  id: string;
  title: string;
  posts_count: number;
  views_count: number;
  last_posted_at: string | null;
  is_closed: boolean;
  is_archived: boolean;
  is_deleted: boolean;
};

export default async function ForumSectionPage({ params, searchParams }: { params: Promise<RouteParams>; searchParams?: Promise<{ page?: string; archiv?: string }> }) {
  const { slug } = await params;
  const q = searchParams ? await searchParams : undefined
  const supabase = await createClient();
  const { data: section } = await supabase
    .from('forum_sections')
    .select('id, title, description, is_archived')
    .eq('slug', slug)
    .maybeSingle();

  if (!section) {
    return <div className="min-h-screen bg-gray-50 p-8">Bereich nicht gefunden.</div>;
  }

  const isArchivedView = (q?.archiv === '1')
  const pageSize = 25
  const currentPage = Math.max(1, Number((q?.page as string) || '1') || 1)
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1
  const { data: threads, count: threadsCount } = await supabase
    .from('forum_threads')
    .select('id, title, posts_count, views_count, last_posted_at, is_closed, is_archived, is_deleted', { count: 'exact' })
    .eq('section_id', (section as any).id)
    .eq('is_deleted', false)
    .eq('is_archived', isArchivedView)
    .order('last_posted_at', { ascending: false, nullsFirst: true })
    .order('title', { ascending: true })
    .range(from, to);

  const list = (threads as Thread[] | null) || [];
  const total = threadsCount || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  // Load votes for thread list
  const threadIds = list.map((t) => t.id);
  const threadVoteCount: Record<string, number> = {};
  const userVotedThread = new Set<string>();
  if (threadIds.length > 0) {
    const { data: votes } = await supabase
      .from('forum_thread_votes')
      .select('thread_id, user_id')
      .in('thread_id', threadIds);
    const { data: auth2 } = await supabase.auth.getUser();
    const uid = auth2?.user?.id;
    for (const row of (votes as any[]) || []) {
      const tid = row.thread_id as string;
      threadVoteCount[tid] = (threadVoteCount[tid] || 0) + 1;
      if (uid && row.user_id === uid) userVotedThread.add(tid);
    }
  }
  // Single view; list already filtered by is_archived
  // Fetch read states for current user
  const { data: auth } = await supabase.auth.getUser();
  let readMap: Record<string, string | null> = {};
  const userId = auth?.user?.id as string | undefined
  const isLoggedIn = Boolean(userId)
  if (isLoggedIn && list.length > 0 && userId) {
    const ids = list.map((t) => t.id);
    const { data: reads } = await supabase
      .from('forum_thread_reads')
      .select('thread_id, last_read_at')
      .in('thread_id', ids)
      .eq('user_id', userId);
    readMap = Object.fromEntries(((reads as any[]) || []).map((r) => [r.thread_id as string, r.last_read_at as string]));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageViewTracker event="forum_section_view" contentType="forum_section" contentId={(section as any).id as string} metadata={{ slug }} />
      <section className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <nav className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <Link href="/forum" className="hover:text-orange-700">Forum</Link>
                <span className="text-gray-400">›</span>
                <span className="text-gray-900">{(section as any).title}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">{(section as any).title}</h1>
              {(section as any).description && <p className="text-gray-600 mt-1">{(section as any).description}</p>}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Link href={`/forum/${slug}`} className={`px-3 py-1.5 rounded-lg border ${!isArchivedView ? 'border-orange-600 text-orange-700 bg-orange-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Threads</Link>
                <Link href={`/forum/${slug}?archiv=1`} className={`px-3 py-1.5 rounded-lg border ${isArchivedView ? 'border-orange-600 text-orange-700 bg-orange-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Archiv</Link>
              </div>
            </div>
            {!((section as any).is_archived) && (
              <Link href={`/forum/${slug}/new`} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm">Neuer Thread</Link>
            )}
          </div>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {list.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">Keine Threads vorhanden.</div>
          ) : (
            <>
              {list.length > 0 && !isArchivedView && (
                <div className="bg-white border border-gray-200 rounded-xl">
                  <div className="px-4 py-2 border-b text-sm font-semibold text-gray-700">Threads</div>
                  <div className="divide-y divide-gray-200">
                    {list.map((t) => (
                      <Link key={t.id} href={`/forum/t/${t.id}`} className="block px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {t.title}
                              {t.is_closed && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">geschlossen</span>}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                              <span>Beiträge: {t.posts_count}</span>
                              <span>·</span>
                              <span>Aufrufe: {t.views_count}</span>
                              <span className="ml-2">
                                <VoteButton
                                  kind="forum_thread"
                                  targetId={t.id}
                                  initialCount={threadVoteCount[t.id] || 0}
                                  initiallyVoted={userVotedThread.has(t.id)}
                                  enabled={isLoggedIn}
                                  small
                                />
                              </span>
                              {isLoggedIn && (() => {
                                const lastReadAtIso = readMap[t.id]
                                const isUnread = !lastReadAtIso || (t.last_posted_at ? new Date(t.last_posted_at) > new Date(lastReadAtIso) : false)
                                return isUnread ? (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-orange-50 text-orange-700">neu</span>
                                ) : (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-green-50 text-green-700">gelesen</span>
                                )
                              })()}
                            </div>
                          </div>
                          {t.last_posted_at && <div className="text-xs text-gray-500">Letzter Beitrag: {new Date(t.last_posted_at).toLocaleString('de-DE')}</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {list.length > 0 && isArchivedView && (
                <div className="mt-8 bg-white border border-gray-200 rounded-xl">
                  <div className="px-4 py-2 border-b text-sm font-semibold text-gray-700">Archiv</div>
                  <div className="divide-y divide-gray-200">
                    {list.map((t) => (
                      <Link key={t.id} href={`/forum/t/${t.id}`} className="block px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {t.title}
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">archiv</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                              <span>Beiträge: {t.posts_count}</span>
                              <span>·</span>
                              <span>Aufrufe: {t.views_count}</span>
                            </div>
                          </div>
                          {t.last_posted_at && <div className="text-xs text-gray-500">Letzter Beitrag: {new Date(t.last_posted_at).toLocaleString('de-DE')}</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-600">Seite {currentPage} von {totalPages}</div>
            <div className="flex items-center gap-2">
              <Link href={`/forum/${slug}?page=${Math.max(1, currentPage - 1)}`} className={`px-3 py-1.5 rounded-lg border ${currentPage <= 1 ? 'pointer-events-none opacity-50 border-gray-300 text-gray-400' : 'border-orange-600 text-orange-700 hover:bg-orange-50'}`}>Zurück</Link>
              <Link href={`/forum/${slug}?page=${Math.min(totalPages, currentPage + 1)}`} className={`px-3 py-1.5 rounded-lg border ${currentPage >= totalPages ? 'pointer-events-none opacity-50 border-gray-300 text-gray-400' : 'border-orange-600 text-orange-700 hover:bg-orange-50'}`}>Weiter</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

