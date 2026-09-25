import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Undo2 } from 'lucide-react';
import gradebook from '@/services/gradebook.service';
import classSectionService, { type ClassWithSections } from '@/services/classSection.service';
import api from '@/services/api';
import { ReportCardView } from '@/components/gradebook/ReportCardView';

const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

/** Office: preview report cards by class and term, write comments, and release them to families. */
export default function ReportCardsPage() {
  const [terms, setTerms] = useState<Array<{ id: string; name: string; is_current: boolean }>>([]);
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [term, setTerm] = useState('');
  const [cls, setCls] = useState('');
  const [students, setStudents] = useState<Array<{ id: string; full_name: string; student_id: string }> | null>(null);
  const [pick, setPick] = useState('');
  const [releases, setReleases] = useState<Awaited<ReturnType<typeof gradebook.releases>>>([]);

  useEffect(() => {
    gradebook.terms().then((t) => { setTerms(t); setTerm((t.find((x) => x.is_current) || t[t.length - 1])?.id || ''); });
    classSectionService.getClassesWithSections().then((r) => { const list = r.data as ClassWithSections[]; setClasses(list); if (list[0]) setCls(list[0].id); });
  }, []);
  const loadReleases = () => term && gradebook.releases(term).then(setReleases);
  useEffect(() => { loadReleases(); }, [term]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cls) return;
    setStudents(null);
    api.get('/students/', { params: { class: cls, status: 'active', page_size: 200 } }).then((r) => {
      const rows = (Array.isArray(r.data) ? r.data : r.data?.results || []) as any[];
      setStudents(rows.map((s) => ({ id: s.id, full_name: s.full_name, student_id: s.student_id })).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    });
  }, [cls]);

  const releasedAll = releases.find((r) => !r.class_id);
  const releasedClass = releases.find((r) => r.class_id === cls);
  const className = useMemo(() => classes.find((c) => c.id === cls)?.name || '', [classes, cls]);

  const release = async (classId?: string) => {
    try { await gradebook.release(term, classId); toast.success('Report cards released. Families have been notified.'); loadReleases(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Could not release.'); }
  };

  return (
    <div className="space-y-4 p-4 text-slate-800">
      <div className="flex flex-wrap items-end gap-2 bg-white rounded-xl border border-slate-200 p-4">
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rc-term">Term</label>
          <select id="rc-term" className={input} value={term} onChange={(e) => setTerm(e.target.value)}>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' (now)' : ''}</option>)}</select></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rc-class">Class</label>
          <select id="rc-class" className={input} value={cls} onChange={(e) => { setCls(e.target.value); setPick(''); }}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="ml-auto flex flex-wrap gap-2 items-center">
          {releasedAll ? (
            <span className="text-sm font-semibold text-emerald-700">Released to all families</span>
          ) : releasedClass ? (
            <button onClick={async () => { await gradebook.unrelease(releasedClass.id); loadReleases(); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold"><Undo2 className="w-4 h-4" /> Hide {className} again</button>
          ) : (
            <button disabled={!term} onClick={() => release(cls)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold"><Send className="w-4 h-4" /> Release {className}</button>
          )}
          {!releasedAll ? <button disabled={!term} onClick={() => window.confirm('Release this term\'s report cards to every family?') && release()} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Release all classes</button>
            : <button onClick={async () => { await gradebook.unrelease(releasedAll.id); loadReleases(); }} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Hide again</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside className="bg-white rounded-xl border border-slate-200 overflow-hidden self-start">
          {!students ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div> : (
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {students.map((s) => (
                <li key={s.id}><button onClick={() => setPick(s.id)} className={`w-full text-left px-3 py-2 text-sm ${pick === s.id ? 'bg-brand-soft font-semibold' : 'hover:bg-slate-50'}`}>{s.full_name}<span className="block text-xs text-slate-500">{s.student_id}</span></button></li>
              ))}
              {students.length === 0 && <li className="px-3 py-6 text-sm text-slate-500">No students in this class.</li>}
            </ul>
          )}
        </aside>
        <div>{pick ? <ReportCardView key={`${pick}-${term}-${releases.map((r) => r.id).join()}`} studentId={pick} staff /> : <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-8">Choose a student to preview their report card and write comments.</p>}</div>
      </div>
    </div>
  );
}
