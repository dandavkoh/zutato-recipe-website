"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import VoteButton from '@/components/VoteButton';
import ReplyToggle from '@/components/ReplyToggle';
import ReportBlogCommentDialog from '@/components/ReportBlogCommentDialog';
import ReportRecipeCommentDialog from '@/components/ReportRecipeCommentDialog';
import RepliesCollapse from '@/components/RepliesCollapse';

type Kind = 'forum_post' | 'blog_comment' | 'recipe_comment';

type Row = {
  id: string;
  user_id: string;
  content?: string;
  comment?: string;
  created_at: string;
};

export default function LoadMoreRepliesClient({
  kind,
  parentId,
  level,
  threadId,
  alreadyLoaded,
  totalCount,
  pageSize = 5,
  currentUserId,
  postId,
  recipeId,
}: {
  kind: Kind;
  parentId: string;
  level: number;
  threadId?: string;
  alreadyLoaded: number;
  totalCount: number;
  pageSize?: number;
  currentUserId: string | null;
  postId?: string;
  recipeId?: string;
}) {
  const [loaded, setLoaded] = useState<Row[]>([]);
  const [count, setCount] = useState<number>(alreadyLoaded);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const table = kind === 'forum_post' ? 'forum_posts' : kind === 'blog_comment' ? 'blog_comments' : 'recipe_comments';
  const whereKey = kind === 'forum_post' ? 'parent_post_id' : 'parent_comment_id';
  const voteTable = kind === 'forum_post' ? 'forum_post_votes' : kind === 'blog_comment' ? 'blog_comment_votes' : 'recipe_comment_votes';
  const voteKey = kind === 'forum_post' ? 'post_id' : 'comment_id';

  async function loadMore() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const selectFields = kind === 'forum_post'
      ? 'id, user_id, content, created_at'
      : 'id, user_id, comment, created_at';
    const { data } = await supabase
      .from(table)
      .select(selectFields)
      .eq(whereKey, parentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(count, Math.min(totalCount - 1, count + pageSize - 1));
    const rows: Row[] = (data as any[]) || [];

    // load votes for these rows
    const ids = rows.map((r) => r.id);
    const voteCount: Record<string, number> = {};
    const voted = new Set<string>();
    if (ids.length > 0) {
      const { data: vr } = await supabase
        .from(voteTable)
        .select(`${voteKey}, user_id`)
        .in(voteKey, ids);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      for (const row of (vr as any[]) || []) {
        const id = row[voteKey] as string;
        voteCount[id] = (voteCount[id] || 0) + 1;
        if (uid && row.user_id === uid) voted.add(id);
      }
    }

    // Attach editing and reporting support context keys
    const enhanced = rows.map((r) => ({
      ...r,
      _votes: voteCount[r.id] || 0,
      _voted: voted.has(r.id),
    } as any));
    setLoaded((prev) => [...prev, ...enhanced]);
    setCount((c) => c + rows.length);
    setBusy(false);
    // Ensure counters and nested SSR blocks refresh
    router.refresh();
  }

  const stillMore = count < totalCount;

  return (
    <div>
      {loaded.length > 0 && (
          loaded.map((r) => (
            <div key={r.id} className="mt-3">
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{(r as any).content || (r as any).comment}</div>
              <div className="mt-1 text-xs text-gray-500 flex items-center gap-3">
                <span>{new Date(r.created_at).toLocaleString('de-DE')}</span>
                <VoteButton
                  kind={kind}
                  targetId={r.id}
                  initialCount={(r as any)._votes || 0}
                  initiallyVoted={Boolean((r as any)._voted)}
                  enabled={Boolean(currentUserId)}
                  small
                />
                {currentUserId && (
                  <span className="ml-auto">
                    {kind === 'blog_comment' && postId ? (
                      <ReportBlogCommentDialog postId={postId} commentId={r.id} />
                    ) : kind === 'recipe_comment' && recipeId ? (
                      <ReportRecipeCommentDialog recipeId={recipeId} commentId={r.id} />
                    ) : null}
                  </span>
                )}
              </div>
              {level < 4 && (
                <ReplyToggle kind={kind} parentId={r.id} threadId={threadId} />
              )}
              {level < 4 && (
                <div className="ml-6 border-l pl-4">
                  <LoadMoreRepliesClient
                    kind={kind}
                    parentId={r.id}
                    level={level + 1}
                    threadId={threadId}
                    alreadyLoaded={0}
                    totalCount={0}
                    pageSize={pageSize}
                    currentUserId={currentUserId}
                    postId={postId}
                    recipeId={recipeId}
                  />
                </div>
              )}
            </div>
          ))
      )}
      {stillMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={busy}
          className="mt-2 text-xs text-orange-700 hover:underline disabled:opacity-50"
        >
          Weitere Antworten laden…
        </button>
      )}
    </div>
  );
}

