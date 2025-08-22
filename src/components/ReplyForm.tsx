"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { showToast } from '@/utils/showToast';

type Kind = 'forum_post' | 'blog_comment' | 'recipe_comment';

export default function ReplyForm({
  kind,
  parentId,
  threadId,
  onAdded,
  placeholder,
  onCancel,
}: {
  kind: Kind;
  parentId: string;
  threadId?: string; // required for forum_post
  onAdded?: () => void;
  placeholder?: string;
  onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setBusy(false);
      window.location.href = '/login';
      return;
    }
    try {
      if (kind === 'forum_post') {
        if (!threadId) throw new Error('threadId required for forum replies');
        await supabase.from('forum_posts').insert({
          thread_id: threadId,
          user_id: userId,
          content: text,
          parent_post_id: parentId,
        });
      } else if (kind === 'blog_comment') {
        // Need post_id for blog replies; fetch parent to derive
        const { data: parent } = await supabase
          .from('blog_comments')
          .select('post_id')
          .eq('id', parentId)
          .maybeSingle();
        await supabase.from('blog_comments').insert({
          post_id: (parent as any).post_id,
          user_id: userId,
          comment: text,
          parent_comment_id: parentId,
        });
      } else if (kind === 'recipe_comment') {
        const { data: parent } = await supabase
          .from('recipe_comments')
          .select('recipe_id')
          .eq('id', parentId)
          .maybeSingle();
        await supabase.from('recipe_comments').insert({
          recipe_id: (parent as any).recipe_id,
          user_id: userId,
          comment: text,
          parent_comment_id: parentId,
        });
      }
      setText('');
      onAdded?.();
      // Trigger a refresh so SSR reply lists update instantly
      router.refresh();
      showToast('Antwort veröffentlicht.', 'success', 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
        placeholder={placeholder || 'Antwort schreiben...'}
        aria-label="Antwort schreiben"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded"
          >
            Abbrechen
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !text.trim()}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-1.5 rounded"
        >
          Antworten
        </button>
      </div>
    </div>
  );
}

