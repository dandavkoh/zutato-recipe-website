import React from 'react';
import { createClient } from '@/utils/supabase/server';
import NewCommentClient from '@/components/NewCommentClient';
import EditCommentClient from '@/components/EditCommentClient';

type Comment = {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
};

export default async function CommentsSection({ recipeId, currentUserId }: { recipeId: string; currentUserId: string | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recipe_comments')
    .select('id, user_id, comment, created_at, updated_at')
    .eq('recipe_id', recipeId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  const comments: Comment[] = (data as any[]) || [];

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

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Kommentare</h3>
      {currentUserId && (
        <NewCommentClient recipeId={recipeId} />
      )}
      {comments.length === 0 ? (
        <div className="text-sm text-gray-500">Keine Kommentare vorhanden.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {comments.map((c) => (
            <li key={c.id} className="py-3">
              <div className="text-sm font-medium text-gray-800 mb-1">{nicknameByUserId[c.user_id] || 'Unbekannt'}</div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{c.comment}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(c.created_at).toLocaleString('de-DE')}
                {currentUserId === c.user_id && ' · Dein Kommentar'}
              </div>
              {currentUserId === c.user_id && (
                <div className="mt-2">
                  <EditCommentClient commentId={c.id} recipeId={recipeId} initialText={c.comment} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

