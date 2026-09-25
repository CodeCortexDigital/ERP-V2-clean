import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Loader2, Mail, Megaphone, MessageSquare, Smartphone } from 'lucide-react';
import messaging from '@/services/messaging.service';

const ICON: Record<string, typeof Mail> = { conversation: MessageSquare, announcement: Megaphone, attendance: Bell, sms: Smartphone, whatsapp: Smartphone };

/** Everything the school has sent to, or discussed about, this student's family. */
export default function CommunicationHistory({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof messaging.history>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { messaging.history(studentId).then(setRows).catch((e) => setError(e?.response?.data?.error || 'Could not load the history.')); }, [studentId]);
  if (error) return <p className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">{error}</p>;
  if (!rows) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">Communication history</h2>
        <Link to="/messages" className="text-sm font-semibold text-brand hover:underline">Open messages</Link>
      </div>
      {rows.length === 0 ? <p className="text-sm text-slate-500">Nothing sent yet.</p> : (
        <ol className="space-y-3">
          {rows.map((r, i) => {
            const Icon = ICON[r.kind] || Mail;
            const body = <><p className="font-semibold">{r.title}</p><p className="text-xs text-slate-500">{new Date(r.at).toLocaleString()} · {r.detail}</p></>;
            return (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-slate-600" /></span>
                <div className="min-w-0">{r.kind === 'conversation' && r.id ? <Link to={`/messages?c=${r.id}`} className="hover:underline">{body}</Link> : body}</div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
