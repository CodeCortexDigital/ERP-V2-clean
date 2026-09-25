import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Trash2, X } from 'lucide-react';
import discipline, { ACTION_TYPES, type Incident } from '@/services/discipline.service';
import { useAuth } from '@/contexts/AuthContext';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

/** Staff view of one merit or incident: status, follow-up, family visibility and the actions taken. */
export default function IncidentPanel({ incident, onClose, onChanged }: { incident: Incident; onClose: () => void; onChanged: () => void }) {
  const { role } = useAuth();
  const [inc, setInc] = useState(incident);
  const [act, setAct] = useState({ action_type: 'verbal_warning', start_date: '', end_date: '', notes: '', notify_family: false });
  useEffect(() => { setInc(incident); }, [incident]);

  const patch = async (body: Record<string, unknown>) => {
    try { setInc(await discipline.update(inc.id, body)); onChanged(); } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save.'); }
  };
  const addAction = async () => {
    try {
      await discipline.addAction(inc.id, { ...act, start_date: act.start_date || null, end_date: act.end_date || null });
      setInc(await discipline.incident(inc.id));
      setAct({ ...act, notes: '', start_date: '', end_date: '' });
      toast.success('Action recorded');
      onChanged();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not record the action.'); }
  };
  const toggleAction = async (id: string, completed: boolean) => {
    try { await discipline.updateAction(id, { completed }); setInc(await discipline.incident(inc.id)); } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save.'); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this record?')) return;
    await discipline.remove(inc.id);
    onChanged();
    onClose();
  };
  const needsDates = ['detention', 'suspension', 'in_school_suspension', 'community_service', 'loss_of_privilege', 'parent_meeting'].includes(act.action_type);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <aside className="bg-white w-full max-w-lg h-full overflow-y-auto p-5 space-y-4 text-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Behaviour record">
        <div className="flex justify-between gap-2">
          <div>
            <h3 className="font-bold text-lg">{inc.category.name} <span className={inc.points >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{inc.points > 0 ? `+${inc.points}` : inc.points}</span></h3>
            <p className="text-slate-600">{inc.student.full_name}{inc.student.class_name ? ` · ${inc.student.class_name}` : ''}</p>
            <p className="text-xs text-slate-500">{new Date(`${inc.date}T00:00`).toLocaleDateString()}{inc.time ? ` ${inc.time}` : ''}{inc.location ? ` · ${inc.location}` : ''} · logged by {inc.reported_by || '—'}</p>
          </div>
          <button aria-label="Close" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {inc.description && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{inc.description}</p>}
        <p className="text-xs text-slate-500">{inc.family_notified_at ? `Family told ${new Date(inc.family_notified_at).toLocaleString()}` : 'Family not told'}</p>

        {inc.editable && (
          <div className="grid grid-cols-2 gap-3">
            {inc.kind === 'negative' && (
              <label>Status
                <select className={input} aria-label="Status" value={inc.status} onChange={(e) => patch({ status: e.target.value })}>
                  <option value="open">Open</option><option value="in_review">In review</option><option value="resolved">Resolved</option>
                </select></label>
            )}
            <label>Follow up by<input type="date" className={input} value={inc.follow_up_date || ''} onChange={(e) => patch({ follow_up_date: e.target.value || null })} /></label>
            <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!inc.visible_to_family} onChange={(e) => patch({ visible_to_family: e.target.checked })} /> Families can see this record</label>
            {!inc.family_notified_at && inc.visible_to_family && <button onClick={() => patch({ notify_family: true })} className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 font-semibold">Tell the family now</button>}
          </div>
        )}

        <section>
          <h4 className="font-bold mb-2">Actions and follow-ups</h4>
          {inc.actions.length === 0 ? <p className="text-slate-500">None yet.</p> : (
            <ul className="space-y-2">
              {inc.actions.map((a) => (
                <li key={a.id} className="flex gap-2 items-start">
                  <button aria-label={a.completed ? 'Mark not done' : 'Mark done'} onClick={() => toggleAction(a.id, !a.completed)} className="mt-0.5">
                    {a.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-400" />}
                  </button>
                  <span className="flex-1"><b>{a.label}</b>{a.start_date ? ` · ${a.start_date}${a.end_date && a.end_date !== a.start_date ? ` to ${a.end_date}` : ''}` : ''}
                    <span className="block text-xs text-slate-500">{a.by} · {new Date(a.at).toLocaleDateString()}</span>
                    {a.notes && <span className="block">{a.notes}</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 p-3 space-y-2">
          <h4 className="font-bold">Record an action</h4>
          <select className={input} aria-label="Action" value={act.action_type} onChange={(e) => setAct({ ...act, action_type: e.target.value })}>
            {ACTION_TYPES.filter(([k]) => role === 'admin' || !['suspension', 'in_school_suspension'].includes(k)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {needsDates && (
            <div className="grid grid-cols-2 gap-2">
              <label>From<input type="date" className={input} value={act.start_date} onChange={(e) => setAct({ ...act, start_date: e.target.value })} /></label>
              <label>To<input type="date" className={input} value={act.end_date} onChange={(e) => setAct({ ...act, end_date: e.target.value })} /></label>
            </div>
          )}
          <textarea className={input} rows={2} placeholder="Notes" aria-label="Action notes" value={act.notes} onChange={(e) => setAct({ ...act, notes: e.target.value })} />
          {act.action_type !== 'follow_up' && <label className="flex items-center gap-2"><input type="checkbox" checked={act.notify_family} onChange={(e) => setAct({ ...act, notify_family: e.target.checked })} /> Tell the family</label>}
          <button onClick={addAction} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Save action</button>
        </section>

        {inc.editable && <button onClick={remove} className="inline-flex items-center gap-1 text-rose-600 font-semibold"><Trash2 className="w-4 h-4" /> Delete record</button>}
      </aside>
    </div>
  );
}
