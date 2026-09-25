import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarClock, ClipboardList, Copy, ExternalLink, FileText, Globe, Loader2, Plus, RefreshCw, Repeat, Search,
  Settings2, Trash2, Upload, UserCheck,
} from 'lucide-react';
import admissionService, {
  STATUS_META, type AdmissionSettings, type Application, type ApplicationStatus, type Campaign,
} from '@/services/admission.service';
import classSectionService, { type ClassWithSections } from '@/services/classSection.service';
import { Modal } from '@/components/ui/Modal';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
const PIPELINE: ApplicationStatus[] = ['pending', 'reviewing', 'approved', 'waitlisted', 'rejected', 'enrolled', 'withdrawn'];

function StatusPill({ status }: { status: ApplicationStatus }) {
  const m = STATUS_META[status] || { label: status, tone: 'bg-slate-100' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${m.tone}`}>{m.label}</span>;
}

type Tab = 'applications' | 'reenrollment' | 'settings';

/** Admissions: application pipeline, re-enrolment and the online form settings. */
export default function AdmissionsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'applications';
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdmissionSettings | null>(null);

  useEffect(() => { admissionService.settings().then(setSettings).catch(() => undefined); }, []);
  const publicUrl = settings ? `${window.location.origin}/apply/${settings.public_slug}` : '';

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Admissions</h1>
          <p className="text-sm text-slate-500">
            Online applications, review, enrolment and re-enrolment.
            {settings && (
              <span className={`ml-2 inline-flex items-center gap-1 text-xs font-semibold ${settings.online_open ? 'text-emerald-600' : 'text-slate-500'}`}>
                <Globe className="w-3.5 h-3.5" /> Online form {settings.online_open ? 'open' : 'closed'}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings?.online_open && (
            <button onClick={() => { navigator.clipboard?.writeText(publicUrl); toast.success('Application link copied'); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
              <Copy className="w-4 h-4" /> Copy application link
            </button>
          )}
          <button onClick={() => navigate('/education/admissions/new')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> New application
          </button>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-slate-200" role="tablist">
        {([['applications', 'Applications', ClipboardList], ['reenrollment', 'Re-enrolment', Repeat], ['settings', 'Online form settings', Settings2]] as const).map(([id, text, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'applications' ? {} : { tab: id })}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === id ? 'border-[color:var(--app-accent)] text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon className="w-4 h-4" /> {text}
          </button>
        ))}
      </nav>

      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'reenrollment' && <ReenrollmentTab />}
      {tab === 'settings' && <SettingsTab settings={settings} onSaved={setSettings} publicUrl={publicUrl} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applications pipeline
// ---------------------------------------------------------------------------

function ApplicationsTab() {
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('open'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const data = await admissionService.list(params);
      setRows(data.results || []);
      setCounts(data.counts || {});
    } catch {
      toast.error('Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatus('')} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${!status ? 'bg-brand text-white' : 'bg-white border border-slate-200'}`}>
          All <span className="opacity-70">{total}</span>
        </button>
        {PIPELINE.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status === s ? 'bg-brand text-white' : 'bg-white border border-slate-200'}`}>
            {STATUS_META[s].label} <span className="opacity-70">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={`${input} pl-9`} placeholder="Search by name, application number, email or grade" aria-label="Search applications" />
        </div>
        <button onClick={load} className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200" aria-label="Reload"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className={`${card} overflow-hidden`}>
        {loading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
          : rows.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No applications here yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2">Application</th><th className="text-left px-4 py-2">Student</th>
                    <th className="text-left px-4 py-2">Grade</th><th className="text-left px-4 py-2">Source</th>
                    <th className="text-left px-4 py-2">Submitted</th><th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((a) => (
                    <tr key={a.id} onClick={() => setOpenId(a.id)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{a.application_no}</td>
                      <td className="px-4 py-2.5 font-semibold">{a.applicant.full_name}</td>
                      <td className="px-4 py-2.5">{a.applicant.applying_for_class}</td>
                      <td className="px-4 py-2.5">{a.source === 'online' ? <span className="inline-flex items-center gap-1 text-xs"><Globe className="w-3.5 h-3.5" />Online</span> : <span className="text-xs text-slate-500">Office</span>}</td>
                      <td className="px-4 py-2.5">{fmt(a.submitted_at)}</td>
                      <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {openId && <ApplicationDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function ApplicationDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [app, setApp] = useState<Application | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [enroll, setEnroll] = useState({ class_id: '', section_id: '', admission_date: new Date().toISOString().slice(0, 10) });
  const [interview, setInterview] = useState({ interview_date: '', interview_notes: '', interview_rating: '' });
  const [docType, setDocType] = useState('Other');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const a = await admissionService.get(id);
    setApp(a);
    setInterview({
      interview_date: a.interview_date ? a.interview_date.slice(0, 16) : '',
      interview_notes: a.interview_notes || '', interview_rating: a.interview_rating ? String(a.interview_rating) : '',
    });
  }, [id]);

  useEffect(() => { load().catch(() => toast.error('Could not open the application.')); }, [load]);
  useEffect(() => {
    if (app?.status !== 'approved' || classes.length) return;
    classSectionService.getClassesWithSections().then((r) => {
      const list = r.data as ClassWithSections[];
      setClasses(list);
      const match = list.find((c) => c.name.toLowerCase() === app.applicant.applying_for_class.toLowerCase());
      if (match) setEnroll((e) => ({ ...e, class_id: match.id }));
    });
  }, [app, classes.length]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await load();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!app) {
    return <Modal open onClose={onClose} title="Application" size="xl"><div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div></Modal>;
  }

  const a = app.applicant;
  const sections = classes.find((c) => c.id === enroll.class_id)?.sections || [];
  const guardians = a.guardians?.length ? a.guardians : [
    ...(a.father_name ? [{ first_name: a.father_name, last_name: '', relationship: 'father', mobile_phone: a.father_phone, email: '' }] : []),
    ...(a.mother_name ? [{ first_name: a.mother_name, last_name: '', relationship: 'mother', mobile_phone: a.mother_phone, email: '' }] : []),
  ];

  return (
    <Modal open onClose={onClose} title={`${a.full_name} · ${app.application_no}`} size="xl">
      <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={app.status} />
          <span className="text-slate-500">Applying for <strong>{a.applying_for_class}</strong> · {app.academic_year}</span>
          <span className="text-slate-500">· {app.source === 'online' ? 'Online application' : 'Entered by the office'}</span>
        </div>

        {/* Actions */}
        {app.status !== 'enrolled' && (
          <section className="rounded-xl bg-slate-50 p-4 space-y-3">
            <p className="font-bold">Decision</p>
            <textarea className={input} rows={2} placeholder="Optional note (included in the email to the family for accept, waitlist or decline)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {(app.allowed_next || []).map((s) => (
                <button key={s} disabled={busy} onClick={() => act(() => admissionService.setStatus(app.id, s, note), `Moved to ${STATUS_META[s].label}`).then(() => setNote(''))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${s === 'approved' ? 'bg-emerald-600 text-white border-emerald-600' : s === 'rejected' ? 'bg-white text-rose-700 border-rose-300' : 'bg-white border-slate-300'}`}>
                  {s === 'approved' ? 'Accept' : s === 'rejected' ? 'Decline' : s === 'reviewing' ? 'Start review' : s === 'waitlisted' ? 'Waitlist' : s === 'pending' ? 'Back to new' : STATUS_META[s].label}
                </button>
              ))}
            </div>
            {app.status === 'approved' && (
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <p className="font-bold inline-flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> Enrol as a student</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select className={input} value={enroll.class_id} onChange={(e) => setEnroll({ ...enroll, class_id: e.target.value, section_id: '' })} aria-label="Class">
                    <option value="">Choose class…</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className={input} value={enroll.section_id} onChange={(e) => setEnroll({ ...enroll, section_id: e.target.value })} aria-label="Section">
                    <option value="">Section (optional)</option>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="date" className={input} value={enroll.admission_date} onChange={(e) => setEnroll({ ...enroll, admission_date: e.target.value })} aria-label="Admission date" />
                </div>
                <button disabled={busy || !enroll.class_id}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await admissionService.enroll(app.id, enroll);
                      toast.success(res.message);
                      onChanged();
                      navigate(`/education/students/${res.student_uuid}?tab=family`);
                    } catch (err: any) {
                      toast.error(err?.response?.data?.error || 'Could not enrol the student.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-brand text-white font-semibold disabled:opacity-50">
                  Enrol student
                </button>
                <p className="text-xs text-slate-500">Creates the student with their household, parents and health notes from this application.</p>
              </div>
            )}
          </section>
        )}
        {app.status === 'enrolled' && app.converted_to_student && (
          <Link to={`/education/students/${app.converted_to_student}`} className="inline-flex items-center gap-1.5 text-brand font-semibold">
            <ExternalLink className="w-4 h-4" /> Open student record
          </Link>
        )}

        {/* Applicant */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-bold mb-2">Student</p>
            <dl className="space-y-1">
              <div><dt className="inline text-slate-500">Date of birth: </dt><dd className="inline">{fmt(a.date_of_birth)}</dd></div>
              <div><dt className="inline text-slate-500">Gender: </dt><dd className="inline">{({ M: 'Male', F: 'Female', O: 'Other' } as Record<string, string>)[a.gender] || a.gender}</dd></div>
              {a.nationality && <div><dt className="inline text-slate-500">Nationality: </dt><dd className="inline">{a.nationality}</dd></div>}
              {a.home_language && <div><dt className="inline text-slate-500">Home language: </dt><dd className="inline">{a.home_language}</dd></div>}
              <div><dt className="inline text-slate-500">Address: </dt><dd className="inline">{[a.address, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ') || '—'}</dd></div>
              {a.previous_school && <div><dt className="inline text-slate-500">Previous school: </dt><dd className="inline">{a.previous_school}{a.previous_class ? ` (${a.previous_class})` : ''}</dd></div>}
              {a.sibling_at_school && <div><dt className="inline text-slate-500">Sibling at school: </dt><dd className="inline">{a.sibling_at_school}</dd></div>}
            </dl>
            {(a.medical_notes || a.special_needs) && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
                {a.medical_notes && <p><strong>Medical:</strong> {a.medical_notes}</p>}
                {a.special_needs && <p><strong>Learning support:</strong> {a.special_needs}</p>}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold mb-2">Parents / guardians</p>
            <ul className="space-y-2">
              {guardians.map((g: any, i: number) => (
                <li key={i} className="rounded-lg border border-slate-200 p-2.5">
                  <p className="font-semibold">{`${g.first_name} ${g.last_name || ''}`.trim()} <span className="font-normal text-slate-500 capitalize">({String(g.relationship).replace('_', ' ')})</span></p>
                  <p className="text-slate-600">{[g.mobile_phone, g.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                  {g.can_pickup === false && <p className="text-xs font-semibold text-amber-700">Not allowed to pick up</p>}
                </li>
              ))}
            </ul>
            {app.signature_name && (
              <p className="mt-3 text-xs text-slate-500">Signed by <span className="font-serif italic text-slate-800">{app.signature_name}</span> on {app.signed_at ? new Date(app.signed_at).toLocaleString() : ''}</p>
            )}
          </div>
        </section>

        {/* Documents */}
        <section>
          <p className="font-bold mb-2 inline-flex items-center gap-1.5"><FileText className="w-4 h-4" /> Documents</p>
          {(app.documents || []).length === 0 && <p className="text-slate-500">No documents yet.</p>}
          <ul className="divide-y divide-slate-100">
            {(app.documents || []).map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                <a href={d.url} target="_blank" rel="noreferrer" className="text-brand hover:underline truncate">{d.doc_type}: {d.name}</a>
                <button onClick={() => act(() => admissionService.deleteDocument(app.id, d.id), 'Document removed')} className="p-1 rounded text-rose-600 hover:bg-rose-50" aria-label={`Remove ${d.name}`}><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <input className={`${input} max-w-[200px]`} value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type" />
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer">
              <Upload className="w-4 h-4" /> Upload
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) act(() => admissionService.uploadDocument(app.id, docType || 'Other', f), 'Document uploaded');
                e.target.value = '';
              }} />
            </label>
          </div>
        </section>

        {/* Interview */}
        <section>
          <p className="font-bold mb-2 inline-flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Interview or assessment</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="datetime-local" className={input} value={interview.interview_date} onChange={(e) => setInterview({ ...interview, interview_date: e.target.value })} aria-label="Interview date" />
            <select className={input} value={interview.interview_rating} onChange={(e) => setInterview({ ...interview, interview_rating: e.target.value })} aria-label="Rating">
              <option value="">Rating…</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
            <button disabled={busy} onClick={() => act(() => admissionService.update(app.id, {
              interview_date: interview.interview_date ? new Date(interview.interview_date).toISOString() : null,
              interview_notes: interview.interview_notes, interview_rating: interview.interview_rating ? Number(interview.interview_rating) : null,
            } as Partial<Application>), 'Interview saved')} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold">Save interview</button>
          </div>
          <textarea className={`${input} mt-2`} rows={2} placeholder="Interview notes" value={interview.interview_notes} onChange={(e) => setInterview({ ...interview, interview_notes: e.target.value })} />
        </section>

        {/* Timeline */}
        <section>
          <p className="font-bold mb-2">History</p>
          <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
            {(app.events || []).map((e) => (
              <li key={e.id}>
                <p className="text-xs text-slate-500">{new Date(e.at).toLocaleString()}{e.by ? ` · ${e.by}` : ''}</p>
                <p>
                  {e.to_status && e.to_status !== e.from_status && <StatusPill status={e.to_status as ApplicationStatus} />} {e.note}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            <input className={input} placeholder="Add an internal note" value={note} onChange={(e) => setNote(e.target.value)} />
            <button disabled={busy || !note.trim()} onClick={() => act(() => admissionService.addNote(app.id, note), 'Note added').then(() => setNote(''))}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold disabled:opacity-50">Add</button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Re-enrolment
// ---------------------------------------------------------------------------

const INTENT_LABEL: Record<string, string> = { pending: 'No answer yet', returning: 'Returning', not_returning: 'Not returning', undecided: 'Undecided' };
const INTENT_TONE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600', returning: 'bg-emerald-100 text-emerald-700',
  not_returning: 'bg-rose-100 text-rose-700', undecided: 'bg-amber-100 text-amber-800',
};

function ReenrollmentTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [open, setOpen] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', academic_year: '', message: '', closes_on: '' });
  const [filter, setFilter] = useState('');

  const load = useCallback(() => admissionService.campaigns().then(setCampaigns).catch(() => toast.error('Could not load re-enrolment.')), []);
  useEffect(() => { load(); }, [load]);

  const openCampaign = async (id: string) => setOpen(await admissionService.campaign(id));
  const rows = useMemo(() => (open?.responses || []).filter((r) => !filter || r.intent === filter), [open, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Ask every family whether their child is returning next year. Parents answer and sign in the parent portal.</p>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold"><Plus className="w-4 h-4" /> New re-enrolment</button>
      </div>

      {campaigns.length === 0 && <div className={`${card} p-10 text-center text-sm text-slate-500`}>No re-enrolment campaigns yet.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((c) => (
          <button key={c.id} onClick={() => openCampaign(c.id)} className={`${card} p-4 text-left hover:border-[color:var(--app-accent)]`}>
            <div className="flex items-center justify-between">
              <p className="font-bold">{c.title}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{c.is_open ? 'Open' : 'Closed'}</span>
            </div>
            <p className="text-xs text-slate-500">{c.academic_year}{c.closes_on ? ` · closes ${fmt(c.closes_on)}` : ''}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden flex">
              {(['returning', 'undecided', 'not_returning'] as const).map((k) => (
                <span key={k} style={{ width: `${c.total ? (c.counts[k] / c.total) * 100 : 0}%` }} className={k === 'returning' ? 'bg-emerald-500' : k === 'undecided' ? 'bg-amber-400' : 'bg-rose-500'} />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {c.counts.returning} returning · {c.counts.not_returning} not returning · {c.counts.undecided} undecided · {c.counts.pending} no answer
            </p>
          </button>
        ))}
      </div>

      {creating && (
        <Modal open onClose={() => setCreating(false)} title="New re-enrolment" size="lg"
          footer={(
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button>
              <button onClick={async () => {
                try {
                  await admissionService.createCampaign({ ...form, closes_on: form.closes_on || undefined });
                  toast.success('Re-enrolment started for all current students');
                  setCreating(false);
                  load();
                } catch (err: any) { toast.error(err?.response?.data?.error || 'Could not start re-enrolment.'); }
              }} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Start</button>
            </div>
          )}>
          <div className="space-y-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="re-title">Title</label><input id="re-title" className={input} placeholder="Returning for 2027–28?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="re-year">School year</label><input id="re-year" className={input} placeholder="2027-2028" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="re-close">Closes on</label><input id="re-close" type="date" className={input} value={form.closes_on} onChange={(e) => setForm({ ...form, closes_on: e.target.value })} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="re-msg">Message to families</label><textarea id="re-msg" rows={3} className={input} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          </div>
        </Modal>
      )}

      {open && (
        <Modal open onClose={() => { setOpen(null); load(); }} title={open.title} size="xl">
          <div className="space-y-3 max-h-[70vh] overflow-y-auto text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {(['', 'pending', 'returning', 'undecided', 'not_returning'] as const).map((k) => (
                <button key={k || 'all'} onClick={() => setFilter(k)} className={`px-3 py-1 rounded-full text-xs font-semibold ${filter === k ? 'bg-brand text-white' : 'bg-slate-100'}`}>
                  {k ? INTENT_LABEL[k] : 'All'} {k ? open.counts[k] : open.total}
                </button>
              ))}
              <button onClick={async () => { setOpen(await admissionService.updateCampaign(open.id, { is_open: !open.is_open })); }}
                className="ml-auto px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
                {open.is_open ? 'Close re-enrolment' : 'Reopen'}
              </button>
            </div>
            <table className="w-full">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50"><tr><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Class</th><th className="text-left px-3 py-2">Answer</th><th className="text-left px-3 py-2">Signed</th><th className="px-3 py-2" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2"><Link to={`/education/students/${r.student_id}`} className="text-brand font-medium hover:underline">{r.student}</Link></td>
                    <td className="px-3 py-2">{r.class_name || '—'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${INTENT_TONE[r.intent]}`}>{INTENT_LABEL[r.intent]}</span>{r.reason && <span className="block text-xs text-slate-500">{r.reason}</span>}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{r.signature_name ? `${r.signature_name}, ${fmt(r.responded_at)}` : '—'}</td>
                    <td className="px-3 py-2">
                      <select aria-label={`Record answer for ${r.student}`} className="rounded border border-slate-300 text-xs px-1 py-1" value=""
                        onChange={async (e) => { await admissionService.recordAnswer(r.id, e.target.value); setOpen(await admissionService.campaign(open.id)); }}>
                        <option value="">Record answer…</option><option value="returning">Returning</option><option value="undecided">Undecided</option><option value="not_returning">Not returning</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Online form settings
// ---------------------------------------------------------------------------

function SettingsTab({ settings, onSaved, publicUrl }: { settings: AdmissionSettings | null; onSaved: (s: AdmissionSettings) => void; publicUrl: string }) {
  const [form, setForm] = useState<AdmissionSettings | null>(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(settings), [settings]);
  if (!form) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;

  const save = async () => {
    setSaving(true);
    try {
      onSaved(await admissionService.saveSettings(form));
      toast.success('Admission settings saved');
    } catch {
      toast.error('Could not save the settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${card} p-5 space-y-4 max-w-3xl`}>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="w-5 h-5" checked={form.online_open} onChange={(e) => setForm({ ...form, online_open: e.target.checked })} />
        <span><span className="font-bold">Accept online applications</span><span className="block text-sm text-slate-500">Families can apply from the public link below, without an account.</span></span>
      </label>
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm flex flex-wrap items-center gap-2">
        <span className="text-slate-500">Public link:</span>
        <a href={publicUrl} target="_blank" rel="noreferrer" className="text-brand font-medium break-all">{publicUrl}</a>
        <button onClick={() => { navigator.clipboard?.writeText(publicUrl); toast.success('Link copied'); }} className="ml-auto p-1.5 rounded hover:bg-slate-200" aria-label="Copy link"><Copy className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="as-year">Admissions for school year</label><input id="as-year" className={input} placeholder="2027-2028" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="as-mail">Email new applications to</label><input id="as-mail" type="email" className={input} placeholder="admissions@school.org" value={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.value })} /></div>
      </div>
      <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="as-intro">Welcome text on the form</label><textarea id="as-intro" rows={3} className={input} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} /></div>
      <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="as-docs">Documents to upload (one per line)</label><textarea id="as-docs" rows={4} className={input} value={form.required_documents.join('\n')} onChange={(e) => setForm({ ...form, required_documents: e.target.value.split('\n') })} /></div>
      <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="as-decl">Declaration parents sign</label><textarea id="as-decl" rows={3} className={input} value={form.declaration} onChange={(e) => setForm({ ...form, declaration: e.target.value })} /></div>
      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save settings'}</button>
    </div>
  );
}
