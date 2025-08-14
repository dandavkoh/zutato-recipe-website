'use client';

import React from 'react';

export type AdminBlogFormPost = {
  id?: string;
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string | null;
  cover_image_url?: string;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  language?: string;
};

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function fieldVal(form: HTMLFormElement, name: string): string {
  return (new FormData(form).get(name) as string) || '';
}

function toStatus(val: string): 'draft' | 'published' | 'scheduled' | 'archived' {
  if (val === 'published' || val === 'scheduled' || val === 'archived') return val;
  return 'draft';
}

export default function AdminBlogForm({ mode, post }: { mode: 'create' | 'edit'; post?: AdminBlogFormPost }) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = e.currentTarget;
      const title = fieldVal(form, 'title');
      const slug = slugify(fieldVal(form, 'slug') || title);
      const content = fieldVal(form, 'content');
      const excerpt = fieldVal(form, 'excerpt');
      const cover = fieldVal(form, 'cover');
      const status = toStatus(fieldVal(form, 'status'));
      const language = fieldVal(form, 'language') || 'de';

      if (mode === 'create') {
        const res = await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, slug, content, excerpt, cover_image_url: cover, status, language }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen');
        window.location.href = `/admin/blog/${j.id}/edit`;
        return;
      }

      // edit
      const id = post?.id;
      if (!id) throw new Error('Beitrags-ID fehlt');
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, content, excerpt, cover_image_url: cover, status, language }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen');
      window.location.href = '/admin/blog';
    } catch (err: any) {
      setError(err?.message || 'Speichern fehlgeschlagen');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !post?.id) return;
    if (!confirm('Diesen Beitrag wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Löschen fehlgeschlagen');
      window.location.href = '/admin/blog';
    } catch (err: any) {
      alert(err?.message || 'Löschen fehlgeschlagen');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Titel</label>
        <input name="title" type="text" required className="mt-1 w-full border rounded-md px-3 py-2" defaultValue={post?.title || ''} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Slug</label>
        <input name="slug" type="text" className="mt-1 w-full border rounded-md px-3 py-2" defaultValue={post?.slug || ''} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Cover Bild URL</label>
        <input name="cover" type="text" required className="mt-1 w-full border rounded-md px-3 py-2" defaultValue={post?.cover_image_url || ''} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Kurzbeschreibung (Excerpt)</label>
        <textarea name="excerpt" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" defaultValue={post?.excerpt || ''} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Inhalt</label>
        <textarea name="content" rows={12} required className="mt-1 w-full border rounded-md px-3 py-2" defaultValue={post?.content || ''} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select name="status" className="mt-1 w-full border rounded-md px-3 py-2" defaultValue={post?.status || 'draft'}>
            <option value="draft">Entwurf</option>
            <option value="published">Veröffentlicht</option>
            <option value="scheduled">Geplant</option>
            <option value="archived">Archiviert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sprache</label>
          <input name="language" type="text" className="mt-1 w-full border rounded-md px-3 py-2" defaultValue={post?.language || 'de'} />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-2">
        <button type="submit" disabled={submitting} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-md disabled:opacity-70">
          {submitting ? 'Speichern…' : 'Speichern'}
        </button>
        {mode === 'edit' && (
          <button type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md">Löschen</button>
        )}
      </div>
    </form>
  );
}

