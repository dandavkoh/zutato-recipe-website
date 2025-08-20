"use client";

import { useState } from 'react';
import ReplyForm from '@/components/ReplyForm';

type Kind = 'forum_post' | 'blog_comment' | 'recipe_comment';

export default function ReplyToggle({
  kind,
  parentId,
  threadId,
  buttonLabel = 'Antworten',
}: {
  kind: Kind;
  parentId: string;
  threadId?: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-orange-700 hover:underline"
        >
          {buttonLabel}
        </button>
      ) : (
        <div>
          <ReplyForm
            kind={kind}
            parentId={parentId}
            threadId={threadId}
            onAdded={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

