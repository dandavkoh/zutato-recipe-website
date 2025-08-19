import { createClient } from '@/utils/supabase/server'
import MessageActions from '@/components/inbox/MessageActions'
import ReplyMessageDialog from '@/components/inbox/ReplyMessageDialog'
import ReportMessageDialog from '@/components/inbox/ReportMessageDialog'

export const metadata = { title: 'Postfach' }

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) {
    return <div className="min-h-screen bg-gray-50 p-8">Bitte anmelden.</div>
  }

  const { data: messages } = await supabase
    .from('user_messages')
    .select('id, sender_id, recipient_id, subject, body, thread_id, read_at, created_at')
    .eq('recipient_id', auth.user.id)
    .order('created_at', { ascending: false })

  const list = (messages as any[] | null) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Postfach</h1>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {list.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">Keine Nachrichten vorhanden.</div>
          ) : (
            <div className="space-y-4">
              {list.map((m) => (
                <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{m.subject}</div>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{m.body}</div>
                      {m.thread_id && (
                        <a href={`/forum/t/${m.thread_id}`} className="text-xs text-orange-700 hover:underline mt-2 inline-block">Zum Thread</a>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString('de-DE')}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <MessageActions messageId={m.id} readAt={m.read_at} />
                    <div className="flex items-center gap-2">
                      {!m.thread_id && (
                        <ReplyMessageDialog recipientId={m.sender_id as string} originalSubject={m.subject as string} />
                      )}
                      <ReportMessageDialog messageId={m.id as string} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

