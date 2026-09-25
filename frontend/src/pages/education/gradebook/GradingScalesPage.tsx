import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import gradebook, { type Band, type Scale } from '@/services/gradebook.service';

const input = 'rounded border border-slate-300 px-2 py-1 text-sm';

/** Grading scales: letter grades with GPA points, or standards levels. One is the school default. */
export default function GradingScalesPage() {
  const [scales, setScales] = useState<Scale[] | null>(null);
  const [edit, setEdit] = useState<Record<string, Band[]>>({});
  const load = () => gradebook.scales().then(setScales).catch(() => toast.error('Could not load grading scales.'));
  useEffect(() => { load(); }, []);

  const save = async (s: Scale, patch: Partial<Scale>) => {
    try { await gradebook.saveScale(s.id, { name: s.name, ...patch }); toast.success('Grading scale saved'); setEdit((e) => { const n = { ...e }; delete n[s.id]; return n; }); load(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save the scale.'); }
  };

  if (!scales) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;
  return (
    <div className="space-y-4 p-4 max-w-5xl text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-xl font-bold">Grading scales</h1><p className="text-sm text-slate-500">The default scale turns percentages into letter grades and GPA points on report cards and transcripts.</p></div>
        <div className="flex gap-2">
          <button onClick={() => gradebook.addPreset('us').then(load)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold"><Plus className="w-4 h-4" /> US A–F with +/−</button>
          <button onClick={() => gradebook.addPreset('standards').then(load)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold"><Plus className="w-4 h-4" /> Standards 4–1</button>
        </div>
      </div>
      {scales.map((s) => {
        const bands = edit[s.id] || s.bands;
        const editing = Boolean(edit[s.id]);
        const setBand = (i: number, patch: Partial<Band>) => setEdit((e) => ({ ...e, [s.id]: bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
        return (
          <section key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold inline-flex items-center gap-2">{s.name}{s.is_default && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Default</span>}</p>
              <div className="flex gap-2 text-sm">
                {!s.is_default && <button onClick={() => save(s, { is_default: true } as any)} className="px-3 py-1.5 rounded-lg bg-brand text-white font-semibold">Make default</button>}
                {!editing ? <button onClick={() => setEdit((e) => ({ ...e, [s.id]: s.bands.map((b) => ({ ...b })) }))} className="px-3 py-1.5 rounded-lg bg-slate-100 font-semibold">Edit grades</button>
                  : <button onClick={() => save(s, { bands })} className="px-3 py-1.5 rounded-lg bg-brand text-white font-semibold">Save</button>}
                {!s.is_default && <button onClick={async () => { await gradebook.deleteScale(s.id); load(); }} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" aria-label={`Delete ${s.name}`}><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
            <table className="text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="text-left pr-4">Grade</th><th className="text-left pr-4">From %</th><th className="text-left pr-4">GPA points</th><th className="text-left">Meaning</th>{editing && <th />}</tr></thead>
              <tbody>
                {bands.map((b, i) => (
                  <tr key={i}>
                    <td className="pr-4 py-1">{editing ? <input className={`${input} w-16`} value={b.label} aria-label="Grade" onChange={(e) => setBand(i, { label: e.target.value })} /> : <b>{b.label}</b>}</td>
                    <td className="pr-4 py-1">{editing ? <input type="number" className={`${input} w-20`} value={b.min_percent} aria-label="Minimum percent" onChange={(e) => setBand(i, { min_percent: Number(e.target.value) })} /> : b.min_percent}</td>
                    <td className="pr-4 py-1">{editing ? <input type="number" step={0.1} className={`${input} w-20`} value={b.gpa_points} aria-label="GPA points" onChange={(e) => setBand(i, { gpa_points: Number(e.target.value) })} /> : b.gpa_points}</td>
                    <td className="py-1">{editing ? <input className={`${input} w-56`} value={b.description} aria-label="Meaning" onChange={(e) => setBand(i, { description: e.target.value })} /> : b.description}</td>
                    {editing && <td><button onClick={() => setEdit((e) => ({ ...e, [s.id]: bands.filter((_, j) => j !== i) }))} className="p-1 text-rose-600" aria-label="Remove grade"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {editing && <button onClick={() => setEdit((e) => ({ ...e, [s.id]: [...bands, { label: '', min_percent: 0, gpa_points: 0, description: '' }] }))} className="text-sm font-semibold text-brand">+ Add a grade</button>}
            <p className="text-xs text-slate-500">Passing: {s.passing_percent}% and above.</p>
          </section>
        );
      })}
    </div>
  );
}
