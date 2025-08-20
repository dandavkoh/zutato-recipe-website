"use client";

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

type ResourceKind = 'forum_thread' | 'forum_post' | 'blog_comment' | 'recipe_comment';

function tableAndKeyFor(kind: ResourceKind): { table: string; key: string } {
  switch (kind) {
    case 'forum_thread':
      return { table: 'forum_thread_votes', key: 'thread_id' };
    case 'forum_post':
      return { table: 'forum_post_votes', key: 'post_id' };
    case 'blog_comment':
      return { table: 'blog_comment_votes', key: 'comment_id' };
    case 'recipe_comment':
      return { table: 'recipe_comment_votes', key: 'comment_id' };
  }
}

export default function VoteButton({
  kind,
  targetId,
  initialCount,
  initiallyVoted,
  enabled,
  small,
}: {
  kind: ResourceKind;
  targetId: string;
  initialCount: number;
  initiallyVoted: boolean;
  enabled: boolean;
  small?: boolean;
}) {
  const [count, setCount] = useState<number>(initialCount);
  const [voted, setVoted] = useState<boolean>(initiallyVoted);
  const [busy, setBusy] = useState<boolean>(false);

  const onToggle = useCallback(async () => {
    if (!enabled || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setBusy(false);
      window.location.href = '/login';
      return;
    }
    const { table, key } = tableAndKeyFor(kind);
    try {
      if (voted) {
        // Optimistic update
        setVoted(false);
        setCount((c) => Math.max(0, c - 1));
        const { error } = await supabase
          .from(table)
          .delete()
          .eq(key, targetId)
          .eq('user_id', userId);
        if (error) {
          // revert
          setVoted(true);
          setCount((c) => c + 1);
        }
      } else {
        setVoted(true);
        setCount((c) => c + 1);
        const { error } = await supabase
          .from(table)
          .insert({ [key]: targetId, user_id: userId });
        if (error) {
          setVoted(false);
          setCount((c) => Math.max(0, c - 1));
        }
      }
    } finally {
      setBusy(false);
    }
  }, [enabled, busy, kind, targetId, voted]);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!enabled || busy}
      className={`inline-flex items-center ${small ? 'text-xs' : 'text-sm'} ${enabled ? 'text-gray-700 hover:text-orange-700' : 'text-gray-400'} transition-colors`}
      aria-pressed={voted}
      aria-label={voted ? 'Gefällt mir entfernt' : 'Gefällt mir'}
    >
      <i className={`${voted ? 'fa-solid' : 'fa-regular'} fa-thumbs-up`} style={{ marginRight: 6 }} />
      <span>{count}</span>
    </button>
  );
}

