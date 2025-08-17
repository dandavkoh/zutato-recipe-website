'use client';

import React from 'react';

export type ToastType = 'success' | 'error' | 'info';

export default function Toast({ message, type = 'info', onClose, durationMs = 2000 }: { message: string; type?: ToastType; onClose: () => void; durationMs?: number }) {
  React.useEffect(() => {
    const id = window.setTimeout(onClose, Math.max(1000, durationMs));
    return () => window.clearTimeout(id);
  }, [onClose, durationMs]);

  const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-900';

  return (
    <div className="fixed top-4 right-4 z-[1000]">
      <div className={`${bg} text-white px-4 py-2 rounded-md shadow-md text-sm`}>{message}</div>
    </div>
  );
}