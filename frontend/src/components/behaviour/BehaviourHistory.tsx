import { useEffect, useState } from 'react';
import { Award, Loader2, ThumbsDown, ThumbsUp, Trophy } from 'lucide-react';
import discipline, { type Incident, type StudentSummary } from '@/services/discipline.service';

const STATUS: Record<string, string> = { open: 'Open', in_review: 'In review', resolved: 'Resolved' };

export function IncidentLine({ i, onOpen, showStudent = false }: { i: Incident; onOpen?: (i: Incident) => void; showStudent?: boolean }) {
  const good = i.kind === 'positive';
  return (
    <li className="py-2.5 flex gap-3 items-start">
      <span className={`mt-0.5 shrink-0 rounded-full p-1.5 ${good ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {good ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
      </span>
      <button type="button" disabled={!onOpen} onClick={() => onOpen?.(i)} className="flex-1 text-left disabled:cursor-default">
        <span className="flex flex-wrap items-center gap-x-2">
          {showStudent && <span className="text-sm font-semibold">{i.student.full_name} ·</span>}
          <b className="text-sm">{i.category.name}</b>
          <span className={`text-xs font-bold ${good ? 'text-emerald-700' : 'text-rose-700'}`}>{i.points > 0 ? `+${i.points}` : i.points}</span>
          {!good && <span className="text-[11px] rounded-full bg-slate-100 px-2">{STATUS[i.status]}</span>}
          {i.visible_to_family === false && <span className="text-[11px] rounded-full bg-amber-100 text-amber-800 px-2">Staff only</span>}
        </span>
        <span className="block text-xs text-slate-500">
          {new Date(`${i.date}T00:00`).toLocaleDateString()}{i.location ? ` · ${i.location}` : ''}{i.reported_by ? ` · ${i.reported_by}` : ''}
        </span>
        {i.description && <span className="block text-sm text-slate-700 mt-0.5">{i.description}</span>}
        {i.actions.length > 0 && (
          <span className="block text-xs text-slate-600 mt-1">
            {i.actions.map((a) => `${a.label}${a.start_date ? ` (${a.start_date}${a.end_date && a.end_date !== a.start_date ? ` to ${a.end_date}` : ''})` : ''}`).join(' · ')}
          </span>
        )}
      </button>
    </li>
  );
}

/** A student's behaviour record: points, awards, and the history of merits and incidents. */
export default function BehaviourHistory({ studentId, onOpen, refreshKey = 0 }: { studentId: string; onOpen?: (i: Incident) => void; refreshKey?: number }) {
  const [data, setData] = useState<StudentSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    setError('');
    discipline.summary(studentId).then(setData).catch((e) => setError(e?.response?.data?.error || 'Could not load behaviour.'));
  }, [studentId, refreshKey]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>;
  const toNext = data.next_milestone ? data.next_milestone.points - data.positive_points : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Behaviour points</p><p className={`text-2xl font-black ${data.points >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{data.points}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Merits</p><p className="text-2xl font-black">{data.merits}</p><p className="text-[11px] text-slate-500">+{data.positive_points} points</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Incidents</p><p className="text-2xl font-black">{data.incidents}</p><p className="text-[11px] text-slate-500">{data.open_incidents} open</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500 inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Next award</p>
          {data.next_milestone ? <><p className="font-bold">{data.next_milestone.name}</p><p className="text-[11px] text-slate-500">{toNext} more positive points</p></> : <p className="font-bold text-sm">All awards earned</p>}
        </div>
      </div>
      {data.awards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.awards.map((a) => <span key={a.points} className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-bold"><Award className="w-3.5 h-3.5" /> {a.name} · {new Date(a.at).toLocaleDateString()}</span>)}
        </div>
      )}
      {data.history.length === 0 ? <p className="text-sm text-slate-500">Nothing recorded yet.</p> : (
        <ul className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 px-4">
          {data.history.map((i) => <IncidentLine key={i.id} i={i} onOpen={onOpen} />)}
        </ul>
      )}
    </div>
  );
}
