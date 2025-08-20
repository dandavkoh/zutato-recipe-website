import React from 'react';
import { createClient } from '@/utils/supabase/server';
import NewBlogCommentClient from '@/components/NewBlogCommentClient';
import EditBlogCommentClient from '@/components/EditBlogCommentClient';
import AdminCommentActions from '@/components/AdminCommentActions';
import AdminEditBlogCommentClient from '@/components/AdminEditBlogCommentClient';
import ReportBlogCommentDialog from '@/components/ReportBlogCommentDialog';
import Link from 'next/link';
import VoteButton from '@/components/VoteButton';
import RepliesList from '@/components/RepliesList';
import ReplyToggle from '@/components/ReplyToggle';

type Comment = {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
};

export default async function BlogCommentsSection({ postId, slug, currentUserId, page = 1 }: { postId: string; slug: string; currentUserId: string | null; page?: number }) {
  const supabase = await createClient();
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from('blog_comments')
    .select('id, user_id, comment, created_at, updated_at', { count: 'exact' })
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .range(from, to);
  const comments: Comment[] = (data as any[]) || [];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Votes
  const commentIds = comments.map((c) => c.id);
  const voteCountByCommentId: Record<string, number> = {};
  const userVotedSet = new Set<string>();
  if (commentIds.length > 0) {
    const { data: voteRows } = await supabase
      .from('blog_comment_votes')
      .select('comment_id, user_id')
      .in('comment_id', commentIds);
    for (const row of (voteRows as any[]) || []) {
      const cid = row.comment_id as string;
      voteCountByCommentId[cid] = (voteCountByCommentId[cid] || 0) + 1;
      if (row.user_id && currentUserId && row.user_id === currentUserId) userVotedSet.add(cid);
    }
  }

  // Fetch public nicknames for commenters
  const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
  let nicknameByUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: nickRows } = await supabase
      .from('public_user_profile')
      .select('user_id, nickname')
      .in('user_id', userIds);
    const rows = (nickRows as { user_id: string; nickname: string | null }[] | null) || [];
    nicknameByUserId = Object.fromEntries(rows.filter(r => Boolean(r.nickname)).map(r => [r.user_id, r.nickname as string]));
  }

  // Admin check
  let isAdmin = false;
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
    isAdmin = Boolean(rpcVal);
  } catch {}

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Kommentare</h3>
      {currentUserId && (
        <NewBlogCommentClient postId={postId} />
      )}
      {comments.length === 0 ? (
        <div className="text-sm text-gray-500">Keine Kommentare vorhanden.</div>
      ) : (
        <>
        <ul className="divide-y divide-gray-200">
          {comments.map((c) => (
            <li key={c.id} className="py-3">
              <div className="text-sm font-medium text-gray-800 mb-1 flex items-center justify-between">
                <div>
                  {nicknameByUserId[c.user_id] ? (
                    <Link href={`/user/${c.user_id}`} className="text-orange-700 hover:underline">{nicknameByUserId[c.user_id]}</Link>
                  ) : (
                    'Unbekannt'
                  )}
                </div>
                {currentUserId && !isAdmin && (
                  <span>
                    <ReportBlogCommentDialog postId={postId} commentId={c.id} />
                  </span>
                )}
              </div>
              <EditBlogCommentClient commentId={c.id} postId={postId} initialText={c.comment} />
              <div className="text-xs text-gray-500 mt-1 flex items-center">
                <span>
                  {new Date(c.created_at).toLocaleString('de-DE')}
                  {currentUserId === c.user_id && ' · Dein Kommentar'}
                </span>
                <span className="ml-3">
                  <VoteButton
                    kind="blog_comment"
                    targetId={c.id}
                    initialCount={voteCountByCommentId[c.id] || 0}
                    initiallyVoted={userVotedSet.has(c.id)}
                    enabled={Boolean(currentUserId)}
                    small
                  />
                </span>
              </div>
              {/* Replies level 1 */}
              <RepliesList kind="blog_comment" parentId={c.id} level={1} currentUserId={currentUserId} initialLimit={5} postId={postId} />
              {currentUserId && <ReplyToggle kind="blog_comment" parentId={c.id} />}
              <div className="mt-2">
                {isAdmin && (
                  <div className="mt-2 flex items-center gap-2">
                    <AdminEditBlogCommentClient commentId={c.id} postId={postId} initialText={c.comment} />
                    <AdminCommentActions kind="blog" parentId={postId} commentId={c.id} />
                  </div>
                )}
                {/* Melden ist in der Zeile mit dem Datum eingeblendet */}
              </div>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href={`/blog/${slug}?commentsPage=${Math.max(1, page - 1)}`} className={`px-3 py-1.5 rounded-lg border ${page <= 1 ? 'pointer-events-none opacity-50 border-gray-300 text-gray-400' : 'border-orange-600 text-orange-700 hover:bg-orange-50'}`}>Zurück</Link>
            <div className="text-gray-600">Seite {page} von {totalPages}</div>
            <Link href={`/blog/${slug}?commentsPage=${Math.min(totalPages, page + 1)}`} className={`px-3 py-1.5 rounded-lg border ${page >= totalPages ? 'pointer-events-none opacity-50 border-gray-300 text-gray-400' : 'border-orange-600 text-orange-700 hover:bg-orange-50'}`}>Weiter</Link>
          </div>
        )}
        </>
      )}
    </div>
  );
}

