import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, Ban, Database, FileLock2, Mail, ChevronLeft, ChevronRight, Download, KeyRound, Loader2, LockOpen, LogOut, Power,
  RefreshCw, ScrollText, Search, ShieldCheck, SlidersHorizontal, UserRound, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import security, { ActivityRow, Overview, Paged, Person, PersonAction, SecurityRules, SignInRow } from '@/services/security.service';
import RetentionPanel from '@/components/security/RetentionPanel';
import MySecurityPanel from '@/components/security/MySecurityPanel';
import DataPanel from '@/components/security/DataPanel';
import PrivacyAdminPanel from '@/components/privacy/PrivacyAdminPanel';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white';
const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any) : '—');

type Tab = 'overview' | 'people' | 'sign-ins' | 'activity' | 'emails' | 'roles' | 'rules' | 'privacy' | 'data' | 'mine';
const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'people', label: 'People & access', icon: Users },
  { id: 'sign-ins', label: 'Sign-ins', icon: KeyRound },
  { id: 'activity', label: 'Activity log', icon: ScrollText },
  { id: 'emails', label: 'Emails sent', icon: Mail },
  { id: 'roles', label: 'Roles & access', icon: Activity },
  { id: 'rules', label: 'Rules & retention', icon: SlidersHorizontal },
  { id: 'privacy', label: 'Privacy & consent', icon: FileLock2 },
  { id: 'data', label: 'Data export & deletion', icon: Database },
  { id: 'mine', label: 'My sign-ins & data', icon: UserRound },
];

/** Settings → Security & privacy. Administrators see the school's side; everyone sees their own sign-ins and data. */
export default function SecurityPage() {
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === 'admin';
  const [params, setParams] = useSearchParams();
  const tab = (isAdmin ? (params.get('tab') as Tab) || 'overview' : 'mine') as Tab;
  const go = (t: Tab, extra: Record<string, string> = {}) => setParams({ tab: t, ...extra });

  if (!isAdmin) return <div className="max-w-4xl mx-auto"><MySecurityPanel /></div>;
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Security sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${tab === t.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab go={go} />}
      {tab === 'people' && <PeopleTab initialStatus={params.get('status') || ''} />}
      {tab === 'sign-ins' && <SignInsTab initialOutcome={params.get('outcome') || ''} initialUser={params.get('user') || ''} />}
      {tab === 'activity' && <ActivityTab initialAction={params.get('action') || ''} initialUser={params.get('user') || ''} />}
      {tab === 'emails' && <EmailsTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'privacy' && <PrivacyAdminPanel />}
      {tab === 'data' && <DataPanel />}
      {tab === 'mine' && <MySecurityPanel />}
    </div>
  );
}

function Pager({ data, page, setPage }: { data: Paged<unknown> | null; page: number; setPage: (n: number) => void }) {
  if (!data || data.pages <= 1) return data ? <p className="text-xs text-slate-500 px-4 py-3">{data.total} in all</p> : null;
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-600">
      <span>{data.total} in all · page {data.page} of {data.pages}</span>
      <span className="flex gap-1">
        <button className={`${input} py-1`} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
        <button className={`${input} py-1`} disabled={page >= data.pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
      </span>
    </div>
  );
}

function usePaged<T>(load: (q: Record<string, any>) => Promise<Paged<T>>, query: Record<string, any>) {
  const [data, setData] = useState<(Paged<T> & Record<string, any>) | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(query);
  useEffect(() => { setPage(1); }, [key]);
  const reload = useCallback(() => {
    setLoading(true);
    load({ ...query, page }).then(setData).catch((e) => toast.error(errorText(e, 'Could not load.'))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);
  useEffect(() => { reload(); }, [reload]);
  return { data, page, setPage, loading, reload };
}

// ---- Overview -------------------------------------------------------------------------------------------------

function Tile({ label, value, note, tone = 'slate', onClick }: { label: string; value: number | string; note?: string; tone?: 'slate' | 'amber' | 'rose'; onClick?: () => void }) {
  const tones = { slate: 'text-slate-800', amber: 'text-amber-700', rose: 'text-rose-700' };
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`${card} p-4 text-left enabled:hover:border-slate-400`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</p>
      {note && <p className="text-[11px] text-slate-500 mt-0.5">{note}</p>}
    </button>
  );
}

function OverviewTab({ go }: { go: (t: Tab, extra?: Record<string, string>) => void }) {
  const [ov, setOv] = useState<Overview | null>(null);
  useEffect(() => { security.overview().then(setOv).catch((e) => toast.error(errorText(e, 'Could not load.'))); }, []);
  if (!ov) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  const w = ov.week;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="People who can sign in" value={ov.people} note={`${ov.admins} administrator${ov.admins === 1 ? '' : 's'}`} onClick={() => go('people')} />
        <Tile label="Blocked for now" value={ov.locked} note="Too many wrong passwords" tone={ov.locked ? 'amber' : 'slate'} onClick={() => go('people', { status: 'locked' })} />
        <Tile label="Switched off" value={ov.disabled} onClick={() => go('people', { status: 'disabled' })} />
        <Tile label="Never signed in" value={ov.never_signed_in} onClick={() => go('people', { status: 'never' })} />
      </div>
      {ov.deletion_requests > 0 && (
        <button onClick={() => go('people', { status: 'deletion' })} className="w-full flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
          <AlertTriangle size={16} /> {ov.deletion_requests} {ov.deletion_requests === 1 ? 'person has' : 'people have'} asked for their account to be deleted. Review and switch the account off once any records the school must keep are saved.
        </button>
      )}
      <h3 className="text-sm font-bold text-slate-700 pt-2">Last 7 days</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Sign-ins" value={w.sign_ins} onClick={() => go('sign-ins', { outcome: 'success' })} />
        <Tile label="Wrong passwords" value={w.failed} tone={w.failed > 20 ? 'amber' : 'slate'} onClick={() => go('sign-ins', { outcome: 'failed' })} />
        <Tile label="Blocked sign-ins" value={w.blocked} tone={w.blocked ? 'amber' : 'slate'} onClick={() => go('sign-ins', { outcome: 'locked' })} />
        <Tile label="Changes made" value={w.changes} onClick={() => go('activity')} />
        <Tile label="Refused actions" value={w.refused} tone={w.refused ? 'rose' : 'slate'} note="Someone tried something their role can't do" onClick={() => go('activity', { action: 'PERMISSION_DENIED' })} />
      </div>
      <div className={`${card} p-4 text-sm text-slate-600`}>
        <p className="font-semibold text-slate-800 mb-1">Current rules</p>
        <p>After {ov.rules.lockout_attempts} wrong passwords in a row an account is blocked for {ov.rules.lockout_minutes} minutes.
          Passwords need at least {ov.rules.password_min_length} characters.
          {ov.rules.idle_minutes ? ` People are signed out after ${ov.rules.idle_minutes} minutes without activity.` : ' People stay signed in while the browser is open.'}
          {' '}The activity log is kept for {ov.rules.activity_days} days and sign-in history for {ov.rules.sign_in_days} days.</p>
        <button className="text-blue-600 font-semibold text-xs mt-2" onClick={() => go('rules')}>Change the rules</button>
      </div>
    </div>
  );
}

// ---- People ---------------------------------------------------------------------------------------------------

function StatusBadge({ p }: { p: Person }) {
  if (!p.active) return <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700"><Ban size={11} /> Switched off</span>;
  if (p.locked_minutes) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"><AlertTriangle size={11} /> Blocked, {p.locked_minutes} min left</span>;
  if (!p.last_sign_in) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">Never signed in</span>;
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Active</span>;
}

const CONFIRM: Record<PersonAction, (n: string) => string> = {
  unlock: (n) => `Let ${n} try signing in again now?`,
  sign_out: (n) => `Sign ${n} out on every device? They can sign in again with their password.`,
  disable: (n) => `Switch off ${n}'s account? They are signed out at once and can't sign in until it's switched back on.`,
  enable: (n) => `Switch ${n}'s account back on?`,
  reset_two_factor: (n) => `Turn off ${n}'s two-step sign-in (lost phone)? Do this only after checking it is really them. They are signed out and can set it up again.`,
};

function PeopleTab({ initialStatus }: { initialStatus: string }) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState('');
  const { data, page, setPage, loading, reload } = usePaged(security.people, { q: search, role, status });
  const act = async (p: Person, action: PersonAction) => {
    if (!window.confirm(CONFIRM[action](p.name))) return;
    setBusy(p.id + action);
    try { toast.success((await security.act(p.id, action)).message); reload(); } catch (e) { toast.error(errorText(e, 'Could not do that.')); } finally { setBusy(''); }
  };
  return (
    <div className={card}>
      <form className="flex flex-wrap gap-2 p-4 border-b border-slate-100" onSubmit={(e) => { e.preventDefault(); setSearch(q); }}>
        <label className="relative flex-1 min-w-[200px]"><span className="sr-only">Search people</span>
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input className={`${input} w-full pl-8`} placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className={input} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          {(data?.roles || []).filter((r: any) => r.count).map((r: any) => <option key={r.code} value={r.code}>{r.label} ({r.count})</option>)}
        </select>
        <select className={input} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option><option value="locked">Blocked for now</option><option value="disabled">Switched off</option>
          <option value="failed">Recent wrong passwords</option><option value="never">Never signed in</option><option value="deletion">Asked to delete their account</option>
        </select>
        <button className={`${input} font-semibold`}>Search</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
            <th className="px-4 py-2 font-semibold">Person</th><th className="px-4 py-2 font-semibold">Role</th>
            <th className="px-4 py-2 font-semibold">Last sign-in</th><th className="px-4 py-2 font-semibold">Status</th><th className="px-4 py-2" /></tr></thead>
          <tbody>
            {loading && !data && <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="inline animate-spin text-slate-400" /></td></tr>}
            {data?.results.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 align-top">
                <td className="px-4 py-2.5"><p className="font-semibold text-slate-800">{p.name}{p.is_me && <span className="ml-1 text-[11px] text-slate-500">(you)</span>}</p><p className="text-xs text-slate-500">{p.email}</p></td>
                <td className="px-4 py-2.5 text-slate-600">{p.role_label}</td>
                <td className="px-4 py-2.5 text-slate-600">{when(p.last_sign_in)}{p.last_ip && <p className="text-[11px] text-slate-400">from {p.last_ip}</p>}
                  {p.failed_attempts > 0 && <p className="text-[11px] text-amber-700">{p.failed_attempts} wrong password{p.failed_attempts === 1 ? '' : 's'} since</p>}</td>
                <td className="px-4 py-2.5"><StatusBadge p={p} />{p.deletion_requested && <p className="mt-1 text-[11px] font-semibold text-amber-800">Asked to be deleted</p>}</td>
                <td className="px-4 py-2.5">
                  {!p.platform_owner && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {p.locked_minutes > 0 && <button disabled={!!busy} onClick={() => act(p, 'unlock')} className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800"><LockOpen size={12} /> Unlock</button>}
                      {p.two_factor && <button disabled={!!busy} onClick={() => act(p, 'reset_two_factor')} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Reset two-step</button>}
                      {p.active && <button disabled={!!busy} onClick={() => act(p, 'sign_out')} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"><LogOut size={12} /> Sign out</button>}
                      {!p.is_me && (p.active
                        ? <button disabled={!!busy} onClick={() => act(p, 'disable')} className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"><Power size={12} /> Switch off</button>
                        : <button disabled={!!busy} onClick={() => act(p, 'enable')} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700"><Power size={12} /> Switch on</button>)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data && !data.results.length && <tr><td colSpan={5} className="py-10 text-center text-slate-500">No one matches.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager data={data} page={page} setPage={setPage} />
    </div>
  );
}

// ---- Sign-ins -------------------------------------------------------------------------------------------------

const OUTCOME_TONE: Record<string, string> = { success: 'bg-emerald-100 text-emerald-700', failed: 'bg-amber-100 text-amber-800', locked: 'bg-rose-100 text-rose-700', disabled: 'bg-slate-200 text-slate-700' };

function Filters({ children, onExport }: { children: React.ReactNode; onExport: () => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2 p-4 border-b border-slate-100">
      {children}
      <button type="button" onClick={onExport} className={`${input} inline-flex items-center gap-1.5 font-semibold ml-auto`}><Download size={14} /> CSV</button>
    </div>
  );
}

function DateRange({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <>
      <label className="text-xs font-semibold text-slate-600">From<input type="date" className={`${input} block mt-1`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-600">To<input type="date" className={`${input} block mt-1`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
    </>
  );
}

function SignInsTab({ initialOutcome, initialUser }: { initialOutcome: string; initialUser: string }) {
  const [q, setQ] = useState('');
  const [outcome, setOutcome] = useState(initialOutcome);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const query = { q, outcome, from, to, user: initialUser };
  const { data, page, setPage, loading } = usePaged<SignInRow>(security.signIns, query);
  return (
    <div className={card}>
      <Filters onExport={() => security.exportSignIns(query).catch(() => toast.error('Could not export.'))}>
        <label className="text-xs font-semibold text-slate-600">Search<input className={`${input} block mt-1`} placeholder="Name, email or IP" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="text-xs font-semibold text-slate-600">Result
          <select className={`${input} block mt-1`} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">Any</option><option value="success">Signed in</option><option value="failed">Wrong password</option>
            <option value="locked">Blocked: too many attempts</option><option value="disabled">Blocked: switched off</option>
          </select></label>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </Filters>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
            <th className="px-4 py-2 font-semibold">When</th><th className="px-4 py-2 font-semibold">Who</th><th className="px-4 py-2 font-semibold">Result</th>
            <th className="px-4 py-2 font-semibold">How</th><th className="px-4 py-2 font-semibold">From</th></tr></thead>
          <tbody>
            {loading && !data && <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="inline animate-spin text-slate-400" /></td></tr>}
            {data?.results.map((e) => (
              <tr key={e.id} className="border-b border-slate-50">
                <td className="px-4 py-2 whitespace-nowrap text-slate-600">{when(e.when)}</td>
                <td className="px-4 py-2"><p className="font-semibold text-slate-800">{e.who}</p>{e.who !== e.email && <p className="text-xs text-slate-500">{e.email}</p>}</td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${OUTCOME_TONE[e.outcome]}`}>{e.outcome_label}</span></td>
                <td className="px-4 py-2 text-slate-600 capitalize">{e.method}</td>
                <td className="px-4 py-2 text-slate-600">{e.ip || '—'}{e.device && <p className="text-[11px] text-slate-400">{e.device}</p>}</td>
              </tr>
            ))}
            {data && !data.results.length && <tr><td colSpan={5} className="py-10 text-center text-slate-500">No sign-ins match.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager data={data} page={page} setPage={setPage} />
    </div>
  );
}

// ---- Activity log ---------------------------------------------------------------------------------------------

const ACTION_TONE: Record<string, string> = { CREATE: 'bg-blue-100 text-blue-700', UPDATE: 'bg-slate-100 text-slate-700', DELETE: 'bg-rose-100 text-rose-700',
  EXPORT: 'bg-violet-100 text-violet-700', PERMISSION_DENIED: 'bg-amber-100 text-amber-800', SECURITY: 'bg-emerald-100 text-emerald-700' };

function ActivityTab({ initialAction, initialUser }: { initialAction: string; initialUser: string }) {
  const [q, setQ] = useState('');
  const [action, setAction] = useState(initialAction);
  const [area, setArea] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const query = { q, action, area, from, to, user: initialUser };
  const { data, page, setPage, loading, reload } = usePaged<ActivityRow>(security.activity, query);
  return (
    <div className={card}>
      <Filters onExport={() => security.exportActivity(query).catch(() => toast.error('Could not export.'))}>
        <label className="text-xs font-semibold text-slate-600">Search<input className={`${input} block mt-1`} placeholder="Person or address" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="text-xs font-semibold text-slate-600">What
          <select className={`${input} block mt-1`} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Anything</option>
            {Object.entries(data?.actions || {}).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
          </select></label>
        <label className="text-xs font-semibold text-slate-600">Area
          <select className={`${input} block mt-1`} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">All areas</option>
            {(data?.areas || []).map((a: string) => <option key={a}>{a}</option>)}
          </select></label>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <button type="button" onClick={reload} className={`${input}`} aria-label="Refresh"><RefreshCw size={14} /></button>
      </Filters>
      <p className="px-4 pt-3 text-xs text-slate-500">Every change made in this school, every export and every refused attempt. Viewing pages is not recorded.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
            <th className="px-4 py-2 font-semibold">When</th><th className="px-4 py-2 font-semibold">Who</th><th className="px-4 py-2 font-semibold">What</th>
            <th className="px-4 py-2 font-semibold">Area</th><th className="px-4 py-2 font-semibold">Details</th></tr></thead>
          <tbody>
            {loading && !data && <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="inline animate-spin text-slate-400" /></td></tr>}
            {data?.results.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 align-top">
                <td className="px-4 py-2 whitespace-nowrap text-slate-600">{when(a.when)}</td>
                <td className="px-4 py-2"><p className="font-semibold text-slate-800">{a.who}</p><p className="text-xs text-slate-500">{a.email}</p></td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ACTION_TONE[a.action] || ACTION_TONE.UPDATE}`}>{a.action_label}</span></td>
                <td className="px-4 py-2 text-slate-700">{a.area}</td>
                <td className="px-4 py-2 text-xs text-slate-500 break-all"><code>{a.method} {a.path}</code>{a.ip && <p>from {a.ip}</p>}</td>
              </tr>
            ))}
            {data && !data.results.length && <tr><td colSpan={5} className="py-10 text-center text-slate-500">Nothing recorded yet for this search.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager data={data} page={page} setPage={setPage} />
    </div>
  );
}

// ---- Roles ----------------------------------------------------------------------------------------------------

function RolesTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof security.roles>> | null>(null);
  useEffect(() => { security.roles().then(setData).catch((e) => toast.error(errorText(e, 'Could not load.'))); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  return (
    <div className={card}>
      <p className="p-4 text-sm text-slate-600 border-b border-slate-100">What each role can see and do. The system checks these on every request, so a person only ever gets their own role's access, whatever page they open.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">Access by role</caption>
          <thead><tr className="text-left text-slate-500 border-b border-slate-100">
            <th scope="col" className="px-4 py-2 font-semibold">Area</th>
            {data.roles.map((r) => <th scope="col" key={r.code} className="px-3 py-2 font-semibold">{r.label}<span className="block font-normal text-slate-400">{r.count} {r.count === 1 ? 'person' : 'people'}</span></th>)}
          </tr></thead>
          <tbody>
            {data.areas.map((a) => (
              <tr key={a.area} className="border-b border-slate-50 align-top">
                <th scope="row" className="px-4 py-2 text-left font-semibold text-slate-800">{a.area}</th>
                {data.roles.map((r) => {
                  const v = a.access[r.code] || '—';
                  return <td key={r.code} className={`px-3 py-2 ${v === '—' ? 'text-slate-300' : v === 'Everything' ? 'text-slate-800 font-semibold' : 'text-slate-600'}`}>{v === '—' ? <span aria-label="No access">—</span> : v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Rules ----------------------------------------------------------------------------------------------------

const RULES: { key: keyof SecurityRules; label: string; unit: string; help: string }[] = [
  { key: 'lockout_attempts', label: 'Wrong passwords before blocking', unit: 'in a row', help: 'Stops people guessing passwords.' },
  { key: 'lockout_minutes', label: 'Block for', unit: 'minutes', help: 'The office can unlock someone sooner from People & access.' },
  { key: 'password_min_length', label: 'Shortest password', unit: 'characters', help: 'Applies the next time someone sets a password.' },
  { key: 'idle_minutes', label: 'Sign out after no activity', unit: 'minutes (0 = never)', help: 'Useful on shared computers in the office or staff room.' },
  { key: 'activity_days', label: 'Keep the activity log', unit: 'days', help: 'Older records are deleted every night.' },
  { key: 'sign_in_days', label: 'Keep sign-in history', unit: 'days', help: 'Older records are deleted every night.' },
];

function RulesTab() {
  const [rules, setRules] = useState<SecurityRules | null>(null);
  const [limits, setLimits] = useState<Record<string, [number, number]>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { security.settings().then((d) => { setRules(d.settings); setLimits(d.limits); }).catch((e) => toast.error(errorText(e, 'Could not load.'))); }, []);
  if (!rules) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  const save = async () => {
    setSaving(true);
    try { setRules((await security.saveSettings(rules)).settings); toast.success('Rules saved.'); } catch (e) { toast.error(errorText(e, 'Could not save.')); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
    <div className={`${card} p-5 space-y-4`}>
      <div className="grid sm:grid-cols-2 gap-4">
        {RULES.map((r) => {
          const [lo, hi] = limits[r.key] || [0, 9999];
          return (
            <label key={r.key} className="text-sm font-semibold text-slate-800">{r.label}
              <span className="mt-1.5 flex items-center gap-2">
                <input type="number" min={lo} max={hi} value={rules[r.key]} onChange={(e) => setRules({ ...rules, [r.key]: Number(e.target.value) })} className={`${input} w-28`} />
                <span className="text-xs font-normal text-slate-500">{r.unit}</span>
              </span>
              <span className="block text-xs font-normal text-slate-500 mt-1">{r.help} ({lo}–{hi})</span>
            </label>
          );
        })}
      </div>
      <label className="flex items-start gap-2 text-sm font-semibold text-slate-800">
        <input type="checkbox" className="mt-1" checked={!!rules.admin_two_factor} onChange={(e) => setRules({ ...rules, admin_two_factor: e.target.checked ? 1 : 0 })} />
        <span>Administrators must use two-step sign-in
          <span className="block text-xs font-normal text-slate-500">After their password, administrators also enter a code from an app on their phone. Those who haven't set it up are asked to at their next sign-in, and can't make changes until they have.</span></span>
      </label>
      <div className="flex justify-end"><button onClick={save} disabled={saving} className="auth-primary-btn w-auto px-6 disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save rules</button></div>
    </div>
    <RetentionPanel />
    </div>
  );
}

// ---- Emails sent (P3) -----------------------------------------------------------------------------------------

function EmailsTab() {
  const [failedOnly, setFailedOnly] = useState(false);
  const load = useCallback((q: Record<string, any>) => api.get('/security/emails/', { params: q }).then((r) => r.data), []);
  const { data, page, setPage, loading } = usePaged<any>(load, { status: failedOnly ? 'failed' : '' });
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-100">
        <p className="text-sm text-slate-600">System emails (password resets, notices, reminders) and whether they were delivered to the mail server.
          {data?.failed_week ? <strong className="text-rose-700"> {data.failed_week} failed in the last 7 days.</strong> : ''}</p>
        <label className="text-xs text-slate-600 flex items-center gap-1"><input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} /> Failed only</label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100"><th className="px-4 py-2">When</th><th className="px-4 py-2">To</th><th className="px-4 py-2">Subject</th><th className="px-4 py-2">Result</th></tr></thead>
          <tbody>
            {loading && !data && <tr><td colSpan={4} className="py-8 text-center"><Loader2 className="inline animate-spin text-slate-400" /></td></tr>}
            {data?.results.map((e: any, i: number) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{when(e.when)}</td><td className="px-4 py-2">{e.to}</td><td className="px-4 py-2 text-slate-700">{e.subject}</td>
                <td className="px-4 py-2">{e.status === 'sent' ? <span className="text-emerald-700 font-semibold">Sent</span> : <span className="text-rose-700 font-semibold" title={e.error}>Failed</span>}</td>
              </tr>
            ))}
            {data && !data.results.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No emails yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager data={data} page={page} setPage={setPage} />
    </div>
  );
}
