import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Repeat } from 'lucide-react';
import admissionService from '@/services/admission.service';

type Row = Awaited<ReturnType<typeof admissionService.myReenrollments>>[number];

const LABEL: Record<string, string> = { returning: 'Returning', not_returning: 'Not returning', undecided: 'Undecided' };

/** Parent portal: answer "is your child returning next year?" and sign. Hidden when nothing is open. */
export default function ReenrollmentCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [answer, setAnswer] = useState<Record<string, { intent: string; name: string; reason: string }>>({});

  const load = () => admissionService.myReenrollments().then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  if (!rows.length) return null;

  const send = async (r: Row) => {
    const a = answer[r.id];
    if (!a?.intent) return toast.error('Choose an answer first.');
    if (!a.name?.trim()) return toast.error('Type your full name to sign.');
    try {
      await admissionService.respond(r.id, a.intent, a.name, a.reason);
      toast.success('Thank you, your answer was sent to the school.');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not send your answer.');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h2 className="font-bold inline-flex items-center gap-2"><Repeat className="w-4 h-4 text-brand" /> Re-enrolment for next year</h2>
      {rows.map((r) => {
        const a = answer[r.id] || { intent: '', name: '', reason: '' };
        const set = (patch: Partial<typeof a>) => setAnswer((s) => ({ ...s, [r.id]: { ...a, ...patch } }));
        return (
          <div key={r.id} className="rounded-lg border border-slate-200 p-4 text-sm space-y-2">
            <p className="font-semibold">{r.student} · {r.academic_year}</p>
            {r.message && <p className="text-slate-600">{r.message}</p>}
            {r.responded_at ? (
              <p className="text-emerald-700 font-semibold">Answered: {LABEL[r.intent] || r.intent}. You can change it until the school closes re-enrolment.</p>
            ) : r.closes_on ? <p className="text-xs text-slate-500">Please answer by {new Date(r.closes_on).toLocaleDateString()}.</p> : null}
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Is ${r.student} returning?`}>
              {Object.entries(LABEL).map(([k, text]) => (
                <button key={k} role="radio" aria-checked={a.intent === k} onClick={() => set({ intent: k })}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${a.intent === k ? 'bg-brand text-white border-transparent' : 'bg-white border-slate-300'}`}>
                  {text}
                </button>
              ))}
            </div>
            {a.intent === 'not_returning' && (
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Optional: tell us why" value={a.reason} onChange={(e) => set({ reason: e.target.value })} />
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <input className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 font-serif italic" placeholder="Type your full name to sign"
                value={a.name} onChange={(e) => set({ name: e.target.value })} aria-label="Signature" />
              <button onClick={() => send(r)} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Send answer</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
