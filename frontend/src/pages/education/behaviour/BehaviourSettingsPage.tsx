import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import discipline, { type BehaviourCategory } from '@/services/discipline.service';
import { useAuth } from '@/contexts/AuthContext';

const input = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm';

/** Merit and incident categories, their points, and the awards students earn for positive points. */
export default function BehaviourSettingsPage() {
  const { role } = useAuth();
  const admin = role === 'admin';
  const [cats, setCats] = useState<BehaviourCategory[]>([]);
  const [draft, setDraft] = useState({ name: '', kind: 'positive', points: 1, severity: 'low', notify_family: false });
  const [ms, setMs] = useState<Array<{ points: number; name: string }>>([]);
  const [notifyMs, setNotifyMs] = useState(true);

  const load = () => discipline.categories().then(setCats).catch(() => undefined);
  useEffect(() => {
    load();
    discipline.settings().then((s) => { setMs(s.milestones); setNotifyMs(s.notify_milestones); }).catch(() => undefined);
  }, []);

  const save = async (c: Partial<BehaviourCategory>) => {
    try { await discipline.saveCategory(c); load(); } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save.'); }
  };
  const add = async () => {
    try {
      await discipline.saveCategory(draft as Partial<BehaviourCategory>);
      setDraft({ ...draft, name: '' });
      load();
      toast.success('Category added');
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not add the category.'); }
  };
  const remove = async (c: BehaviourCategory) => {
    if (!window.confirm(`Remove "${c.name}"? If it has been used it will be retired instead.`)) return;
    await discipline.removeCategory(c.id);
    load();
  };
  const saveMs = async () => {
    try { const r = await discipline.saveSettings({ milestones: ms, notify_milestones: notifyMs }); setMs(r.milestones); toast.success('Awards saved'); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save.'); }
  };

  const table = (kind: 'positive' | 'negative') => (
    <section className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-bold mb-2">{kind === 'positive' ? 'Merits (add points)' : 'Incidents (take points away)'}</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500"><th className="py-1">Name</th><th>Points</th>{kind === 'negative' && <th>Severity</th>}<th>Tell family</th><th>In use</th><th /></tr></thead>
        <tbody>
          {cats.filter((c) => c.kind === kind).map((c) => (
            <tr key={c.id} className={`border-t border-slate-100 ${c.is_active ? '' : 'opacity-50'}`}>
              <td className="py-1">{c.name}</td>
              <td><input type="number" disabled={!admin} className={`${input} w-20`} defaultValue={Math.abs(c.points)} aria-label={`Points for ${c.name}`} onBlur={(e) => Number(e.target.value) !== Math.abs(c.points) && save({ id: c.id, points: Number(e.target.value) })} /></td>
              {kind === 'negative' && <td><select disabled={!admin} className={input} value={c.severity} onChange={(e) => save({ id: c.id, severity: e.target.value })}>{['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></td>}
              <td><input type="checkbox" disabled={!admin} checked={c.notify_family} onChange={(e) => save({ id: c.id, notify_family: e.target.checked })} /></td>
              <td><input type="checkbox" disabled={!admin} checked={c.is_active} onChange={(e) => save({ id: c.id, is_active: e.target.checked })} /></td>
              <td className="text-right">{admin && <button aria-label={`Remove ${c.name}`} onClick={() => remove(c)} className="text-rose-600"><Trash2 className="w-4 h-4" /></button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4 text-slate-800">
      <h1 className="text-xl font-bold">Behaviour categories & awards</h1>
      {!admin && <p className="text-sm text-slate-500">Only the office can change these.</p>}
      {admin && (
        <section className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-2 items-end text-sm">
          <label className="flex flex-col">Name<input className={input} aria-label="New category name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="flex flex-col">Type<select className={input} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}><option value="positive">Merit</option><option value="negative">Incident</option></select></label>
          <label className="flex flex-col">Points<input type="number" min={0} className={`${input} w-20`} value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} /></label>
          {draft.kind === 'negative' && <label className="flex flex-col">Severity<select className={input} value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>{['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>}
          <label className="flex items-center gap-1.5 pb-2"><input type="checkbox" checked={draft.notify_family} onChange={(e) => setDraft({ ...draft, notify_family: e.target.checked })} /> Tell family</label>
          <button onClick={add} className="px-3 py-2 rounded-lg bg-brand text-white font-semibold inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
        </section>
      )}
      <div className="grid lg:grid-cols-2 gap-4">{table('positive')}{table('negative')}</div>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
        <h2 className="font-bold">Awards for positive points</h2>
        <p className="text-slate-500">Students earn each award once, when their merits reach the points below. Families are told when that's switched on.</p>
        {ms.map((m, n) => (
          <div key={n} className="flex gap-2 items-center">
            <input type="number" min={1} disabled={!admin} className={`${input} w-24`} aria-label="Award points" value={m.points} onChange={(e) => setMs(ms.map((x, i) => (i === n ? { ...x, points: Number(e.target.value) } : x)))} />
            <span>points →</span>
            <input disabled={!admin} className={`${input} flex-1`} aria-label="Award name" value={m.name} onChange={(e) => setMs(ms.map((x, i) => (i === n ? { ...x, name: e.target.value } : x)))} />
            {admin && <button aria-label="Remove award" onClick={() => setMs(ms.filter((_, i) => i !== n))} className="text-rose-600"><Trash2 className="w-4 h-4" /></button>}
          </div>
        ))}
        {admin && (
          <div className="flex flex-wrap gap-3 items-center pt-1">
            <button onClick={() => setMs([...ms, { points: (ms[ms.length - 1]?.points || 0) + 25, name: '' }])} className="text-brand font-semibold inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add award</button>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={notifyMs} onChange={(e) => setNotifyMs(e.target.checked)} /> Tell the family when an award is earned</label>
            <button onClick={saveMs} className="ml-auto px-4 py-2 rounded-lg bg-brand text-white font-semibold">Save awards</button>
          </div>
        )}
      </section>
    </div>
  );
}
