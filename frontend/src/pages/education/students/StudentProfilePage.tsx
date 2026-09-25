import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Ban, CalendarCheck, CheckCircle2, Edit, GraduationCap, HeartPulse,
  History, Home, Loader2, Mail, MapPin, Phone, Plus, Printer, Receipt, ShieldAlert, Star, Syringe, Trash2,
  User, Users, Wallet,
} from 'lucide-react';
import householdService, {
  RELATIONSHIPS, type Guardian, type GuardianLink, type Health, type Immunization, type LinkFlags,
  type StudentProfile,
} from '@/services/household.service';
import { formatMoney } from '@/utils/currency';
import { Modal } from '@/components/ui/Modal';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';
import EnrollmentAndSchedule from '@/components/students/EnrollmentAndSchedule';

type TabId = 'overview' | 'family' | 'health' | 'attendance' | 'billing' | 'grades';

const TABS: Array<{ id: TabId; label: string; icon: typeof User }> = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'family', label: 'Family & guardians', icon: Users },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'billing', label: 'Billing', icon: Wallet },
  { id: 'grades', label: 'Grades', icon: GraduationCap },
];

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const label = 'block text-xs font-semibold text-slate-600 mb-1';

/** Tabbed student record: overview, family, health, attendance, billing and grades. */
export default function StudentProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id || 'overview') as TabId;
  const [data, setData] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await householdService.profile(id));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand animate-spin" aria-label="Loading student" />
      </div>
    );
  }
  if (failed || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h1 className="text-lg font-bold text-slate-800">Student not found</h1>
        <p className="text-sm text-slate-500">This student doesn't exist or you don't have access to them.</p>
        <button onClick={() => navigate('/education/students')} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold">
          Back to students
        </button>
      </div>
    );
  }

  const s = data.student;
  const restricted = data.guardians.filter((g) => !g.can_pickup || g.custody_notes);
  const photo = s.profile_picture
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=4C469D&color=fff&size=128&bold=true`;

  return (
    <div className="space-y-4 p-4 pb-12 text-slate-800 max-w-6xl mx-auto">
      {/* Header */}
      <div className={`${card} p-5`}>
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <button onClick={() => navigate('/education/students')} className="self-start p-2 rounded-lg hover:bg-slate-100" aria-label="Back to students">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-slate-100" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{s.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span>ID {s.student_id}</span>
              <span>{[s.class_name, s.section_name].filter(Boolean).join(' · ') || 'No class'}</span>
              {data.household && <span className="inline-flex items-center gap-1"><Home className="w-3.5 h-3.5" />{data.household.name}</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {s.is_active !== false ? 'Enrolled' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.health?.has_severe_allergy && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Severe allergy: {data.health.allergies || 'see Health'}
                </span>
              )}
              {restricted.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Pickup or custody restriction
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/education/students/${id}/history`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
              <History className="w-3.5 h-3.5" /> History
            </Link>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            {data.can_edit && (
              <Link to={`/education/students/${id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold">
                <Edit className="w-3.5 h-3.5" /> Edit student
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-5 -mb-5 flex gap-1 overflow-x-auto border-t border-slate-100 pt-2" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setParams(t.id === 'overview' ? {} : { tab: t.id }, { replace: true })}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-[color:var(--app-accent)] text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && <OverviewTab data={data} onTab={(t) => setParams({ tab: t })} />}
      {tab === 'family' && <FamilyTab data={data} studentId={id} reload={load} />}
      {tab === 'health' && <HealthTab data={data} studentId={id} reload={load} />}
      {tab === 'attendance' && <AttendanceCalendar studentId={String(data.student.id)} />}
      {tab === 'billing' && <BillingTab data={data} />}
      {tab === 'grades' && <GradesTab data={data} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function Stat({ label: text, value, hint, onClick }: { label: string; value: string; hint?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`${card} p-4 text-left hover:border-[color:var(--app-accent)] transition-colors`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{text}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </button>
  );
}

function Field({ label: text, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{text}</dt>
      <dd className="text-sm font-medium text-slate-800 break-words">{value || '—'}</dd>
    </div>
  );
}

function OverviewTab({ data, onTab }: { data: StudentProfile; onTab: (t: TabId) => void }) {
  const s = data.student;
  const primary = data.guardians.find((g) => g.is_primary) || data.guardians[0];
  const lastResult = data.results[0];
  // Region-specific fields are only shown when the school filled them in.
  const extra: Array<[string, string]> = ([
    ['Religion', s.religion], ['Birth certificate / B-Form', s.birth_form_id], ['Caste', s.cast],
    ['Previous school', s.previous_school], ['Previous ID', s.previous_id], ['Identification mark', s.identification_mark],
    ['Fee discount', s.discount_in_fee],
  ] as Array<[string, string]>).filter(([, v]) => v && String(v).trim());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Attendance" value={data.attendance.rate == null ? '—' : `${data.attendance.rate}%`}
          hint={`${data.attendance.absent} absent · ${data.attendance.late} tardy`} onClick={() => onTab('attendance')} />
        <Stat label="Balance due" value={formatMoney(data.billing.balance_due)}
          hint={`${data.billing.invoices.length} invoices`} onClick={() => onTab('billing')} />
        <Stat label="Latest result" value={lastResult ? `${Math.round(lastResult.percentage)}%` : '—'}
          hint={lastResult ? `${lastResult.exam} · ${lastResult.grade}` : 'No results yet'} onClick={() => onTab('grades')} />
        <Stat label="Guardians" value={String(data.guardians.length)}
          hint={primary ? `Primary: ${primary.guardian.full_name}` : 'None added'} onClick={() => onTab('family')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={`${card} p-5 lg:col-span-2`}>
          <h2 className="font-bold text-sm mb-4">Personal details</h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Date of birth" value={fmtDate(s.date_of_birth)} />
            <Field label="Gender" value={s.gender} />
            <Field label="Admission date" value={fmtDate(s.admission_date)} />
            <Field label="Email" value={s.email} />
            <Field label="Phone" value={s.phone} />
            <Field label="Blood group" value={s.blood_group} />
            <Field label="Address" value={[s.address, s.city, s.state, s.postal_code].filter(Boolean).join(', ')} />
            {extra.map(([k, v]) => <Field key={k} label={k} value={v} />)}
          </dl>
          {s.additional_note && <p className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">{s.additional_note}</p>}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-bold text-sm mb-4">Emergency contacts</h2>
          {data.guardians.filter((g) => g.is_emergency_contact).length === 0 && (
            <p className="text-sm text-slate-500">No emergency contacts yet.</p>
          )}
          <ol className="space-y-3">
            {data.guardians.filter((g) => g.is_emergency_contact).map((g) => (
              <li key={g.id} className="text-sm">
                <p className="font-semibold">{g.priority}. {g.guardian.full_name} <span className="font-normal text-slate-500">({g.guardian.relationship_label})</span></p>
                {g.guardian.mobile_phone && <a href={`tel:${g.guardian.mobile_phone}`} className="text-brand">{g.guardian.mobile_phone}</a>}
              </li>
            ))}
          </ol>
          {data.siblings.length > 0 && (
            <>
              <h3 className="font-bold text-sm mt-6 mb-2">Siblings at this school</h3>
              <ul className="space-y-1 text-sm">
                {data.siblings.map((sib) => (
                  <li key={sib.id}>
                    <Link to={`/education/students/${sib.id}`} className="text-brand hover:underline">{sib.full_name}</Link>
                    <span className="text-slate-500"> · {sib.class_name || '—'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <EnrollmentAndSchedule data={data} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Family & guardians
// ---------------------------------------------------------------------------

const FLAG_LABELS: Array<[keyof LinkFlags, string]> = [
  ['is_primary', 'Primary contact'], ['lives_with', 'Student lives with them'], ['has_custody', 'Has legal custody'],
  ['can_pickup', 'Allowed to pick up'], ['is_emergency_contact', 'Emergency contact'],
  ['receives_billing', 'Receives invoices'], ['receives_messages', 'Receives school messages'],
  ['portal_access', 'Parent portal access'],
];

function FamilyTab({ data, studentId, reload }: { data: StudentProfile; studentId: string; reload: () => void }) {
  const [editing, setEditing] = useState<GuardianLink | 'new' | null>(null);

  const remove = async (link: GuardianLink) => {
    if (!window.confirm(`Remove ${link.guardian.full_name} from this student?`)) return;
    await householdService.removeLink(studentId, link.id);
    toast.success('Guardian removed');
    reload();
  };

  return (
    <div className="space-y-4">
      {data.household && (
        <section className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Household</p>
            <p className="font-bold text-lg">{data.household.name}</p>
            <p className="text-sm text-slate-500 inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {[data.household.address, data.household.city, data.household.state].filter(Boolean).join(', ') || 'No address'}
            </p>
          </div>
          <Link to={`/education/students/families?household=${data.household.id}`} className="text-sm font-semibold text-brand hover:underline">
            Open household
          </Link>
        </section>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-bold">Guardians ({data.guardians.length})</h2>
        {data.can_edit && (
          <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add guardian
          </button>
        )}
      </div>

      {data.guardians.length === 0 && (
        <div className={`${card} p-8 text-center text-sm text-slate-500`}>No guardians yet.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.guardians.map((link) => {
          const g = link.guardian;
          return (
            <article key={link.id} className={`${card} p-5`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{g.full_name}</p>
                  <p className="text-sm text-slate-500">{g.relationship_label}{g.occupation ? ` · ${g.occupation}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  {link.is_primary && <span className="px-2 py-0.5 rounded-full bg-brand-soft text-xs font-bold inline-flex items-center gap-1"><Star className="w-3 h-3" />Primary</span>}
                  {data.can_edit && (
                    <>
                      <button onClick={() => setEditing(link)} className="p-1.5 rounded-md hover:bg-slate-100" aria-label={`Edit ${g.full_name}`}><Edit className="w-4 h-4" /></button>
                      <button onClick={() => remove(link)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600" aria-label={`Remove ${g.full_name}`}><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {g.mobile_phone && <p className="inline-flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><a href={`tel:${g.mobile_phone}`} className="text-brand">{g.mobile_phone}</a></p>}
                {g.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><a href={`mailto:${g.email}`} className="text-brand break-all">{g.email}</a></p>}
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {FLAG_LABELS.filter(([k]) => k !== 'is_primary').map(([k, text]) => {
                  const on = Boolean(link[k]);
                  const warn = !on && (k === 'can_pickup' || k === 'has_custody');
                  return (
                    <li key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${warn ? 'bg-amber-100 text-amber-800 font-semibold' : on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'}`}>
                      {warn ? <Ban className="w-3 h-3" /> : on ? <CheckCircle2 className="w-3 h-3" /> : null}
                      {warn ? (k === 'can_pickup' ? 'Not allowed to pick up' : 'No legal custody') : text}
                    </li>
                  );
                })}
              </ul>
              {link.custody_notes && (
                <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900">
                  <strong>Custody note:</strong> {link.custody_notes}
                </p>
              )}
              {g.students.length > 1 && (
                <p className="mt-3 text-xs text-slate-500">Also guardian of {g.students.filter((x) => x.id !== data.student.id).map((x) => x.full_name).join(', ')}</p>
              )}
            </article>
          );
        })}
      </div>

      {editing && (
        <GuardianModal
          studentId={studentId}
          link={editing === 'new' ? null : editing}
          nextPriority={Math.max(0, ...data.guardians.map((g) => g.priority)) + 1}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

const EMPTY_GUARDIAN: Partial<Guardian> = {
  first_name: '', last_name: '', relationship: 'mother', email: '', mobile_phone: '', home_phone: '', work_phone: '',
  occupation: '', employer: '', national_id: '', address: '', notes: '',
};
const DEFAULT_FLAGS: LinkFlags = {
  is_primary: false, lives_with: true, has_custody: true, can_pickup: true, is_emergency_contact: true,
  receives_billing: false, receives_messages: true, portal_access: true, custody_notes: '', priority: 1,
};

function GuardianModal({ studentId, link, nextPriority, onClose, onSaved }: {
  studentId: string; link: GuardianLink | null; nextPriority: number; onClose: () => void; onSaved: () => void;
}) {
  const [guardian, setGuardian] = useState<Partial<Guardian>>(link ? { ...link.guardian } : { ...EMPTY_GUARDIAN });
  const [flags, setFlags] = useState<LinkFlags>(() => {
    if (!link) return { ...DEFAULT_FLAGS, priority: nextPriority, is_primary: nextPriority === 1, receives_billing: nextPriority === 1 };
    const { id: _id, guardian: _g, ...rest } = link;
    return rest;
  });
  const [existing, setExisting] = useState<Guardian | null>(null);
  const [matches, setMatches] = useState<Guardian[]>([]);
  const [saving, setSaving] = useState(false);

  // Offer to reuse a guardian who is already on file (e.g. for a sibling).
  useEffect(() => {
    if (link || existing) return;
    const q = `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim() || guardian.mobile_phone || '';
    if (q.length < 3) { setMatches([]); return; }
    const t = window.setTimeout(() => householdService.searchGuardians(q).then(setMatches).catch(() => setMatches([])), 300);
    return () => window.clearTimeout(t);
  }, [guardian.first_name, guardian.last_name, guardian.mobile_phone, link, existing]);

  const setG = (k: keyof Guardian) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setGuardian((g) => ({ ...g, [k]: e.target.value }));

  const save = async () => {
    if (!existing && !guardian.first_name?.trim()) {
      toast.error('Enter the guardian’s first name.');
      return;
    }
    setSaving(true);
    try {
      if (link) {
        await householdService.updateGuardian(link.guardian.id, guardian);
        await householdService.updateLink(studentId, link.id, flags);
      } else if (existing) {
        await householdService.addGuardian(studentId, { ...flags, guardian_id: existing.id });
      } else {
        await householdService.addGuardian(studentId, { ...flags, guardian });
      }
      toast.success('Guardian saved');
      onSaved();
    } catch (err: any) {
      const body = err?.response?.data;
      toast.error(body?.error || (body && typeof body === 'object' ? Object.values(body).flat().join(' ') : 'Could not save the guardian.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={link ? `Edit ${link.guardian.full_name}` : 'Add guardian'} size="xl"
      footer={(
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : 'Save guardian'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {existing ? (
          <div className="rounded-lg bg-brand-soft p-3 text-sm flex items-center justify-between">
            <span>Linking <strong>{existing.full_name}</strong> ({existing.relationship_label}), already on file.</span>
            <button onClick={() => setExisting(null)} className="text-xs font-semibold underline">Enter someone else</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={label} htmlFor="g-first">First name *</label><input id="g-first" className={input} value={guardian.first_name || ''} onChange={setG('first_name')} /></div>
              <div><label className={label} htmlFor="g-last">Last name</label><input id="g-last" className={input} value={guardian.last_name || ''} onChange={setG('last_name')} /></div>
              <div>
                <label className={label} htmlFor="g-rel">Relationship</label>
                <select id="g-rel" className={input} value={guardian.relationship} onChange={setG('relationship')}>
                  {RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div><label className={label} htmlFor="g-mobile">Mobile phone</label><input id="g-mobile" type="tel" className={input} value={guardian.mobile_phone || ''} onChange={setG('mobile_phone')} /></div>
              <div><label className={label} htmlFor="g-email">Email</label><input id="g-email" type="email" className={input} value={guardian.email || ''} onChange={setG('email')} /></div>
              <div><label className={label} htmlFor="g-work">Work phone</label><input id="g-work" type="tel" className={input} value={guardian.work_phone || ''} onChange={setG('work_phone')} /></div>
              <div><label className={label} htmlFor="g-occ">Occupation</label><input id="g-occ" className={input} value={guardian.occupation || ''} onChange={setG('occupation')} /></div>
              <div><label className={label} htmlFor="g-emp">Employer</label><input id="g-emp" className={input} value={guardian.employer || ''} onChange={setG('employer')} /></div>
              <div><label className={label} htmlFor="g-nid">National ID</label><input id="g-nid" className={input} value={guardian.national_id || ''} onChange={setG('national_id')} /></div>
              <div><label className={label} htmlFor="g-addr">Address (if different)</label><input id="g-addr" className={input} value={guardian.address || ''} onChange={setG('address')} /></div>
            </div>
            {!link && matches.length > 0 && (
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Already on file. Link instead of creating a duplicate?</p>
                <ul className="space-y-1">
                  {matches.slice(0, 4).map((m) => (
                    <li key={m.id}>
                      <button onClick={() => setExisting(m)} className="text-sm text-brand hover:underline text-left">
                        {m.full_name} · {m.relationship_label}{m.students.length ? ` · guardian of ${m.students.map((x) => x.full_name).join(', ')}` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <fieldset>
          <legend className="text-sm font-bold mb-2">Permissions for this student</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FLAG_LABELS.map(([k, text]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(flags[k])} onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))} className="w-4 h-4 accent-[color:var(--app-accent)]" />
                {text}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className={label} htmlFor="g-prio">Emergency call order</label>
              <input id="g-prio" type="number" min={1} max={9} className={input} value={flags.priority}
                onChange={(e) => setFlags((f) => ({ ...f, priority: Number(e.target.value) || 1 }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="g-custody">Custody notes or restrictions</label>
              <input id="g-custody" className={input} placeholder="For example: court order, not allowed to collect" value={flags.custody_notes}
                onChange={(e) => setFlags((f) => ({ ...f, custody_notes: e.target.value }))} />
            </div>
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

const EMPTY_HEALTH: Health = {
  allergies: '', has_severe_allergy: false, medical_conditions: '', medications: '', dietary_restrictions: '',
  physician_name: '', physician_phone: '', insurance_provider: '', insurance_policy_number: '',
  emergency_treatment_consent: false, notes: '',
};

function HealthTab({ data, studentId, reload }: { data: StudentProfile; studentId: string; reload: () => void }) {
  const [form, setForm] = useState<Health>({ ...EMPTY_HEALTH, ...(data.health || {}) });
  const [saving, setSaving] = useState(false);
  const [imm, setImm] = useState<Partial<Immunization>>({ vaccine: '', dose: '', date_given: '' });
  const readOnly = !data.can_edit;

  const setText = (k: keyof Health) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await householdService.saveHealth(studentId, form);
      toast.success('Health record saved');
      reload();
    } catch {
      toast.error('Could not save the health record.');
    } finally {
      setSaving(false);
    }
  };

  const addImm = async () => {
    if (!imm.vaccine?.trim()) return toast.error('Enter the vaccine name.');
    try {
      await householdService.addImmunization(studentId, { ...imm, date_given: imm.date_given || null });
      setImm({ vaccine: '', dose: '', date_given: '' });
      reload();
    } catch {
      toast.error('Could not add the immunization.');
    }
  };

  const text = (k: keyof Health, title: string, rows = 2) => (
    <div>
      <label className={label} htmlFor={`h-${k}`}>{title}</label>
      <textarea id={`h-${k}`} rows={rows} className={input} value={String(form[k] ?? '')} onChange={setText(k)} readOnly={readOnly} />
    </div>
  );
  const line = (k: keyof Health, title: string) => (
    <div>
      <label className={label} htmlFor={`h-${k}`}>{title}</label>
      <input id={`h-${k}`} className={input} value={String(form[k] ?? '')} onChange={setText(k)} readOnly={readOnly} />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className={`${card} p-5 lg:col-span-2 space-y-4`}>
        <h2 className="font-bold text-sm">Medical information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('allergies', 'Allergies')}
          {text('medical_conditions', 'Medical conditions')}
          {text('medications', 'Medications taken at school')}
          {text('dietary_restrictions', 'Dietary restrictions')}
          {line('physician_name', 'Doctor')}
          {line('physician_phone', 'Doctor’s phone')}
          {line('insurance_provider', 'Insurance provider')}
          {line('insurance_policy_number', 'Policy number')}
        </div>
        {text('notes', 'Other notes for staff', 3)}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={readOnly} checked={form.has_severe_allergy} onChange={(e) => setForm((f) => ({ ...f, has_severe_allergy: e.target.checked }))} className="w-4 h-4" />
            Severe allergy (show a warning on the profile)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={readOnly} checked={form.emergency_treatment_consent} onChange={(e) => setForm((f) => ({ ...f, emergency_treatment_consent: e.target.checked }))} className="w-4 h-4" />
            Parents consent to emergency treatment
          </label>
        </div>
        {!readOnly && (
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : 'Save health record'}
          </button>
        )}
      </section>

      <section className={`${card} p-5`}>
        <h2 className="font-bold text-sm mb-3 inline-flex items-center gap-2"><Syringe className="w-4 h-4" /> Immunizations</h2>
        {data.immunizations.length === 0 && <p className="text-sm text-slate-500">None recorded.</p>}
        <ul className="divide-y divide-slate-100">
          {data.immunizations.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span>
                <strong>{r.vaccine}</strong>{r.dose ? ` · dose ${r.dose}` : ''}
                <span className="block text-xs text-slate-500">{r.exempt ? `Exempt${r.exemption_reason ? `: ${r.exemption_reason}` : ''}` : fmtDate(r.date_given)}</span>
              </span>
              {!readOnly && (
                <button onClick={async () => { await householdService.removeImmunization(studentId, r.id); reload(); }} className="p-1 text-rose-600 hover:bg-rose-50 rounded" aria-label={`Remove ${r.vaccine}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <input className={input} placeholder="Vaccine, e.g. MMR" value={imm.vaccine || ''} onChange={(e) => setImm((x) => ({ ...x, vaccine: e.target.value }))} aria-label="Vaccine" />
            <div className="grid grid-cols-2 gap-2">
              <input className={input} placeholder="Dose" value={imm.dose || ''} onChange={(e) => setImm((x) => ({ ...x, dose: e.target.value }))} aria-label="Dose" />
              <input className={input} type="date" value={imm.date_given || ''} onChange={(e) => setImm((x) => ({ ...x, date_given: e.target.value }))} aria-label="Date given" />
            </div>
            <button onClick={addImm} className="w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add immunization
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attendance, billing and grades
// ---------------------------------------------------------------------------

function BillingTab({ data }: { data: StudentProfile }) {
  const b = data.billing;
  const billing = useMemo(() => data.guardians.filter((g) => g.receives_billing), [data.guardians]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Balance due" value={formatMoney(b.balance_due)} />
        <Stat label="Invoices" value={String(b.invoices.length)} />
        <div className={`${card} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billed to</p>
          <p className="mt-1 text-sm font-semibold">{billing.map((g) => g.guardian.full_name).join(', ') || 'No billing contact set'}</p>
        </div>
      </div>
      <section className={`${card} overflow-hidden`}>
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <h2 className="font-bold text-sm inline-flex items-center gap-2"><Receipt className="w-4 h-4" /> Recent invoices</h2>
          <Link to="/education/fees/invoices" className="text-sm font-semibold text-brand hover:underline">All invoices</Link>
        </div>
        {b.invoices.length === 0 ? <p className="p-5 text-sm text-slate-500">No invoices yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr><th className="text-left px-4 py-2">Invoice</th><th className="text-left px-4 py-2">Due</th><th className="text-right px-4 py-2">Amount</th><th className="text-right px-4 py-2">Paid</th><th className="text-right px-4 py-2">Balance</th><th className="text-left px-4 py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {b.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2 font-medium">{inv.number}<span className="block text-xs text-slate-500">{inv.description}</span></td>
                    <td className="px-4 py-2">{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(inv.amount)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(inv.paid)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatMoney(inv.balance)}</td>
                    <td className="px-4 py-2 capitalize">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function GradesTab({ data }: { data: StudentProfile }) {
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-slate-100"><h2 className="font-bold text-sm">Recent results</h2></div>
      {data.results.length === 0 ? <p className="p-5 text-sm text-slate-500">No results yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr><th className="text-left px-4 py-2">Assessment</th><th className="text-left px-4 py-2">Date</th><th className="text-right px-4 py-2">Score</th><th className="text-right px-4 py-2">Percent</th><th className="text-left px-4 py-2">Grade</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.results.map((r, i) => (
                <tr key={`${r.exam}-${i}`}>
                  <td className="px-4 py-2 font-medium">{r.exam}</td>
                  <td className="px-4 py-2">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2 text-right">{r.obtained}</td>
                  <td className="px-4 py-2 text-right">{Math.round(r.percentage)}%</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{r.grade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
