import { createClient } from '@/utils/supabase/server';
import ReplyToggle from '@/components/ReplyToggle';
import EditBlogCommentClient from '@/components/EditBlogCommentClient';
import EditCommentClient from '@/components/EditCommentClient';
import ReportBlogCommentDialog from '@/components/ReportBlogCommentDialog';
import ReportRecipeCommentDialog from '@/components/ReportRecipeCommentDialog';
import LoadMoreRepliesClient from '@/components/LoadMoreRepliesClient';
import RepliesCollapse from '@/components/RepliesCollapse';
import VoteButton from '@/components/VoteButton';
import Link from 'next/link';

type Kind = 'forum_post' | 'blog_comment' | 'recipe_comment';

type BaseReply = {
  id: string;
  user_id: string;
  content?: string; // forum
  comment?: string; // comments
  created_at: string;
};

export default async function RepliesList({
  kind,
  parentId,
  level,
  currentUserId,
  initialLimit = 5,
  threadId,
  postId,
  recipeId,
}: {
  kind: Kind;
  parentId: string;
  level: number; // 1..4
  currentUserId: string | null;
  initialLimit?: number;
  threadId?: string;
  postId?: string;
  recipeId?: string;
}) {
  const supabase = await createClient();
  const pageSize = initialLimit;
  // Fetch immediate children
  let rows: BaseReply[] = [];
  if (kind === 'forum_post') {
    const { data } = await supabase
      .from('forum_posts')
      .select('id, user_id, content, created_at')
      .eq('parent_post_id', parentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(pageSize);
    rows = (data as any[]) || [];
  } else if (kind === 'blog_comment') {
    const { data } = await supabase
      .from('blog_comments')
      .select('id, user_id, comment, created_at')
      .eq('parent_comment_id', parentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(pageSize);
    rows = (data as any[]) || [];
  } else {
    const { data } = await supabase
      .from('recipe_comments')
      .select('id, user_id, comment, created_at')
      .eq('parent_comment_id', parentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(pageSize);
    rows = (data as any[]) || [];
  }

  // Count total children to determine "mehr laden"
  let totalChildren = 0;
  if (kind === 'forum_post') {
    const { count } = await supabase
      .from('forum_posts')
      .select('id', { count: 'exact', head: true })
      .eq('parent_post_id', parentId)
      .eq('is_deleted', false);
    totalChildren = count || 0;
  } else if (kind === 'blog_comment') {
    const { count } = await supabase
      .from('blog_comments')
      .select('id', { count: 'exact', head: true })
      .eq('parent_comment_id', parentId)
      .eq('is_deleted', false);
    totalChildren = count || 0;
  } else {
    const { count } = await supabase
      .from('recipe_comments')
      .select('id', { count: 'exact', head: true })
      .eq('parent_comment_id', parentId)
      .eq('is_deleted', false);
    totalChildren = count || 0;
  }

  // Votes for the replies
  const ids = rows.map((r) => r.id);
  const voteCount: Record<string, number> = {};
  const userVoted = new Set<string>();
  if (ids.length > 0) {
    const table = kind === 'forum_post' ? 'forum_post_votes' : kind === 'blog_comment' ? 'blog_comment_votes' : 'recipe_comment_votes';
    const key = kind === 'forum_post' ? 'post_id' : 'comment_id';
    const { data: vr } = await supabase
      .from(table)
      .select(`${key}, user_id`)
      .in(key, ids);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    for (const row of (vr as any[]) || []) {
      const id = row[key] as string;
      voteCount[id] = (voteCount[id] || 0) + 1;
      if (uid && row.user_id === uid) userVoted.add(id);
    }
  }

  // Fetch public nicknames for reply authors
  const replyUserIds = Array.from(new Set(rows.map((r) => r.user_id)));
  let nicknameByUserId: Record<string, string> = {};
  if (replyUserIds.length > 0) {
    const { data: nickRows } = await supabase
      .from('public_user_profile')
      .select('user_id, nickname')
      .in('user_id', replyUserIds);
    const nrows = (nickRows as { user_id: string; nickname: string | null }[] | null) || [];
    nicknameByUserId = Object.fromEntries(nrows.filter(r => Boolean(r.nickname)).map(r => [r.user_id, r.nickname as string]));
  }

  const canNest = level < 4;

  return (
    <div className="mt-2 ml-6 border-l pl-4">
      {rows.length === 0 ? null : (
        <RepliesCollapse totalCount={totalChildren} initiallyCollapsed={false}>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
              <div className="text-sm font-medium text-gray-800 mb-1 flex items-center justify-between">
                <div>
                  {nicknameByUserId[r.user_id] ? (
                    <Link href={`/user/${r.user_id}`} className="text-orange-700 hover:underline">{nicknameByUserId[r.user_id]}</Link>
                  ) : (
                    'Unbekannt'
                  )}
                </div>
                {currentUserId && (
                  <span>
                    {kind === 'blog_comment' && postId ? (
                      <ReportBlogCommentDialog postId={postId} commentId={r.id} />
                    ) : kind === 'recipe_comment' && recipeId ? (
                      <ReportRecipeCommentDialog recipeId={recipeId} commentId={r.id} />
                    ) : null}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {kind === 'blog_comment' && currentUserId === r.user_id && postId ? (
                  <EditBlogCommentClient commentId={r.id} postId={postId} initialText={(r as any).comment || ''} />
                ) : kind === 'recipe_comment' && currentUserId === r.user_id && recipeId ? (
                  <EditCommentClient commentId={r.id} recipeId={recipeId} initialText={(r as any).comment || ''} />
                ) : (
                  <>{(r as any).content || (r as any).comment}</>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500 flex items-center gap-3">
                <span>{new Date(r.created_at).toLocaleString('de-DE')}</span>
                <VoteButton
                  kind={kind}
                  targetId={r.id}
                  initialCount={voteCount[r.id] || 0}
                  initiallyVoted={userVoted.has(r.id)}
                  enabled={Boolean(currentUserId)}
                  small
                />
              </div>
              {canNest && (
                <ReplyToggle kind={kind} parentId={r.id} threadId={threadId} />
              )}
              {canNest && (
                <RepliesList
                  kind={kind}
                  parentId={r.id}
                  level={level + 1}
                  currentUserId={currentUserId}
                  initialLimit={initialLimit}
                  threadId={threadId}
                  postId={postId}
                  recipeId={recipeId}
                />
              )}
              </li>
            ))}
          </ul>
          {totalChildren > rows.length && (
            <div className="mt-2">
              <LoadMoreRepliesClient
                kind={kind}
                parentId={parentId}
                level={level}
                threadId={threadId}
                alreadyLoaded={rows.length}
                totalCount={totalChildren}
                pageSize={initialLimit}
                currentUserId={currentUserId}
                postId={postId}
                recipeId={recipeId}
              />
            </div>
          )}
        </RepliesCollapse>
      )}
    </div>
  );
}

