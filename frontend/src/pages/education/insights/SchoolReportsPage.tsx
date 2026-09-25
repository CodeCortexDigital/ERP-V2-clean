import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { saveBlob } from '@/services/portal.service';
import { formatCompactMoney, formatMoney } from '@/utils/currency';
import { BarList, ColumnChart, LineChart, StatTile, VIZ_CSS, num, pct } from '@/components/insights/Charts';

export type ReportView = 'overview' | 'enrolment' | 'attendance' | 'finance' | 'academics' | 'teachers';
const money = (v: number) => formatMoney(v);
const compact = (v: number) => formatCompactMoney(v);
const card = 'viz bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4';
const iso = (d: Date) => d.toLocaleDateString('sv');
const PRESETS: Array<[string, string, () => [string, string]]> = [
  ['30', 'Last 30 days', () => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 29); return [iso(f), iso(t)]; }],
  ['90', 'Last 90 days', () => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 89); return [iso(f), iso(t)]; }],
  ['ytd', 'This year so far', () => { const t = new Date(); return [`${t.getFullYear()}-01-01`, iso(t)]; }],
  ['365', 'Last 12 months', () => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 364); return [iso(f), iso(t)]; }],
];
const CSV: Partial<Record<ReportView, string>> = {
  enrolment: 'Enrolment by month', attendance: 'Students often absent', finance: 'Billed vs collected by month',
  academics: 'Averages by class', teachers: 'Teachers',
};

function Table({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">{columns.map((c) => <th key={c} className="py-1.5 pr-3">{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-1.5 pr-3">{c}</td>)}</tr>)}</tbody>
      </table>
      {rows.length === 0 && <p className="text-sm text-slate-400 py-3">Nothing to show.</p>}
    </div>
  );
}

/** School reports: one date range above everything, each report's charts and tables, and a CSV of its main table. */
export default function SchoolReportsPage({ view }: { view: ReportView }) {
  const [preset, setPreset] = useState('30');
  const [range, setRange] = useState<[string, string]>(PRESETS[0][2]());
  const [data, setData] = useState<{ view: ReportView; body: any } | null>(null);
  const [extra, setExtra] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = { from: range[0], to: range[1] };
    const main = api.get(`/auth/insights/${view}/`, { params });
    const more = view === 'overview'
      ? Promise.all([api.get('/auth/insights/finance/', { params }), api.get('/auth/insights/attendance/', { params }), api.get('/auth/insights/enrolment/', { params })])
      : Promise.resolve(null);
    Promise.all([main, more]).then(([m, x]) => {
      setData({ view, body: m.data });
      setExtra(x ? { finance: x[0].data, attendance: x[1].data, enrolment: x[2].data } : {});
    }).catch((e) => toast.error(e?.response?.data?.error || 'Could not load the report.')).finally(() => setLoading(false));
  }, [view, range]);

  const choose = (key: string) => { setPreset(key); const p = PRESETS.find((x) => x[0] === key); if (p) setRange(p[2]()); };
  const exportCsv = async () => {
    try {
      const r = await api.get(`/auth/insights/${view}/`, { params: { from: range[0], to: range[1], export: 'csv' }, responseType: 'blob' });
      saveBlob(r.data as Blob, `${view}-${range[0]}-to-${range[1]}.csv`);
    } catch { toast.error('The CSV could not be made.'); }
  };

  return (
    <div className="space-y-4">
      <style>{VIZ_CSS}</style>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(([k, label]) => (
          <button key={k} onClick={() => choose(k)} aria-pressed={preset === k}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${preset === k ? 'bg-slate-900 text-white border-transparent dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{label}</button>
        ))}
        <span className="text-xs text-slate-400 ml-1">or</span>
        <input aria-label="From" type="date" value={range[0]} onChange={(e) => { setPreset('custom'); setRange([e.target.value, range[1]]); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs bg-white dark:bg-slate-900" />
        <input aria-label="To" type="date" value={range[1]} onChange={(e) => { setPreset('custom'); setRange([range[0], e.target.value]); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs bg-white dark:bg-slate-900" />
        {view === 'academics' && <span className="text-xs text-slate-500">Academics always shows the current term.</span>}
        {CSV[view] && <button onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold inline-flex items-center gap-1"><Download size={13} /> CSV: {CSV[view]}</button>}
      </div>
      {/* A new date range keeps the old figures (dimmed) until the new ones arrive; a different report waits for its own. */}
      {!data || data.view !== view ? <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Building the report…</div> : (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          {view === 'overview' && <Overview d={data.body} x={extra} />}
          {view === 'enrolment' && <Enrolment d={data.body} />}
          {view === 'attendance' && <Attendance d={data.body} />}
          {view === 'finance' && <Finance d={data.body} />}
          {view === 'academics' && <Academics d={data.body} />}
          {view === 'teachers' && <Teachers d={data.body} />}
        </div>
      )}
    </div>
  );
}

function Overview({ d, x }: { d: any; x: any }) {
  const fmtFor = (u: string) => (u === 'money' ? compact : u === 'percent' ? pct : num);
  const chgFor = (u: string) => (u === 'money' ? compact : u === 'percent' ? (v: number) => `${num(v)} pts` : num);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {d.tiles.map((t: any) => <StatTile key={t.key} label={t.label} value={t.value} change={t.change} upIsGood={t.up_is_good} note={t.note || (t.also ? `${fmtFor(t.unit)(t.also.value)} ${t.also.label}` : undefined)} format={fmtFor(t.unit)} changeFormat={chgFor(t.unit)} />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {x.finance && <ColumnChart title="Fees billed and collected" subtitle="Last 12 months" format={compact} series={[{ key: 'billed', label: 'Billed' }, { key: 'collected', label: 'Collected' }]}
          data={x.finance.months.map((m: any) => ({ label: m.label.split(' ')[0], values: { billed: m.billed, collected: m.collected } }))} />}
        {x.attendance && <LineChart title="Attendance rate" subtitle="By month" format={pct} min={0} max={100} points={x.attendance.months.map((m: any) => ({ label: m.label.split(' ')[0], value: m.rate }))} />}
        {x.enrolment && <LineChart title="Students on roll" subtitle="At the end of each month" points={x.enrolment.months.map((m: any) => ({ label: m.label.split(' ')[0], value: m.on_roll }))} />}
        {x.attendance && <BarList title="Attendance by class" subtitle="In the selected period" format={pct} max={100} rows={x.attendance.by_class.map((c: any) => ({ label: c.name, value: c.rate }))} />}
      </div>
    </>
  );
}

function Enrolment({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Students on roll" value={d.on_roll} />
        <StatTile label="Joined in the period" value={d.joined} />
        <StatTile label="Left in the period" value={d.left} />
        <StatTile label="Applications enrolled" value={d.conversion} format={pct} note={`${d.funnel[0].count} applied in the period`} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <LineChart title="Students on roll" subtitle="At the end of each month" points={d.months.map((m: any) => ({ label: m.label.split(' ')[0], value: m.on_roll }))} />
        <ColumnChart title="Joined and left" subtitle="By month" series={[{ key: 'joined', label: 'Joined' }, { key: 'left', label: 'Left' }]}
          data={d.months.map((m: any) => ({ label: m.label.split(' ')[0], values: { joined: m.joined, left: m.left } }))} />
        <BarList title="Students by class" rows={d.by_class.map((c: any) => ({ label: c.name, value: c.students }))} />
        <BarList title="Admissions" subtitle="Applications in the period" rows={d.funnel.map((f: any) => ({ label: f.stage, value: f.count }))} />
      </div>
      <section className={card}>
        <h3 className="text-sm font-bold mb-2">Gender</h3>
        <p className="text-sm text-slate-700 dark:text-slate-300">{Object.entries(d.gender).map(([g, n]) => `${g[0].toUpperCase()}${g.slice(1)}: ${n}`).join(' · ') || 'Not recorded'}</p>
      </section>
    </>
  );
}

function Attendance({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Attendance" value={d.summary.rate} change={d.change} upIsGood format={pct} changeFormat={(v) => `${num(v)} pts`} />
        <StatTile label="Days absent" value={d.summary.absent + d.summary.excused} note={`${d.summary.excused} excused`} />
        <StatTile label="Late arrivals" value={d.summary.late} />
        <StatTile label="Students often absent" value={d.often_absent_count} note="below 90% with 10+ days recorded" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <LineChart title="Attendance rate" subtitle="Last 6 months" format={pct} min={0} max={100} points={d.months.map((m: any) => ({ label: m.label.split(' ')[0], value: m.rate }))} />
        <BarList title="By class" subtitle="Lowest first" format={pct} max={100} rows={d.by_class.map((c: any) => ({ label: c.name, value: c.rate }))} />
        <BarList title="By day of the week" format={pct} max={100} rows={d.by_weekday.map((w: any) => ({ label: w.day, value: w.rate }))} />
        <section className={card}>
          <h3 className="text-sm font-bold mb-2">Students often absent</h3>
          <Table columns={['Student', 'Class', 'Attendance', 'Absent', 'Late']}
            rows={d.often_absent.map((s: any) => [<Link key="n" to={`/education/students/${s.id}`} className="font-semibold hover:underline">{s.name}</Link>, s.class_name, pct(s.rate), s.absent, s.late])} />
        </section>
      </div>
    </>
  );
}

function Finance({ d }: { d: any }) {
  const AGE: Record<string, string> = { not_due: 'Not due yet', '1_30': '1–30 days late', '31_60': '31–60 days late', '61_90': '61–90 days late', over_90: 'Over 90 days late' };
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="Billed" value={d.billed} change={d.billed - d.previous.billed} format={money} changeFormat={compact} />
        <StatTile label="Collected" value={d.collected} change={d.collected - d.previous.collected} upIsGood format={money} changeFormat={compact} />
        <StatTile label="Collection rate" value={d.collection_rate} format={pct} note="collected ÷ billed in the period" />
        <StatTile label="Owed now" value={d.owed} format={money} />
        <StatTile label="Overdue" value={d.overdue} format={money} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ColumnChart title="Billed and collected" subtitle="Last 12 months" format={compact} series={[{ key: 'billed', label: 'Billed' }, { key: 'collected', label: 'Collected' }]}
          data={d.months.map((m: any) => ({ label: m.label.split(' ')[0], values: { billed: m.billed, collected: m.collected } }))} />
        <BarList title="What is owed, by how late" format={compact} rows={Object.keys(AGE).map((k) => ({ label: AGE[k], value: d.ageing[k] }))} />
        <BarList title="Billed by fee type" subtitle="In the period" format={compact} rows={d.by_type.map((t: any) => ({ label: t.label, value: t.billed }))} />
        <BarList title="How families paid" subtitle="In the period" format={compact} rows={d.methods.map((m: any) => ({ label: m.method, value: m.amount }))} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className={`${card} xl:col-span-2`}>
          <h3 className="text-sm font-bold mb-2">Most overdue</h3>
          <Table columns={['Student', 'Class', 'Invoices', 'Owed']} rows={d.top_owed.map((r: any) => [<Link key="n" to={`/education/students/${r.id}`} className="font-semibold hover:underline">{r.name}</Link>, r.class_name, r.invoices, money(r.owed)])} />
        </section>
        <section className={card}>
          <h3 className="text-sm font-bold mb-2">Income and expenses (period)</h3>
          <Table columns={['', 'Amount']} rows={[['Fees collected', money(d.ledger.fees_collected)], ['Other income', money(d.ledger.income)], ['Expenses', money(d.ledger.expenses)], [<b key="n">Net</b>, <b key="v">{money(d.ledger.net)}</b>]]} />
        </section>
      </div>
    </>
  );
}

function Academics({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile label="Term" value={null} note={d.term ? d.term.name : 'No term set up — add school years and terms under Academic Setup'} />
        <StatTile label="Students who need attention" value={d.attention_count} note="low attendance or average, missing work or incidents" />
        <StatTile label="Grades recorded" value={Object.values(d.letters as Record<string, number>).reduce((a, b) => a + b, 0)} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <BarList title="Average by class" format={pct} max={100} rows={d.by_class.map((c: any) => ({ label: c.name, value: c.average }))} />
        <BarList title="Average by subject" subtitle="Lowest first" format={pct} max={100} rows={d.by_subject.map((s: any) => ({ label: s.subject, value: s.average }))} />
        <BarList title="Grade spread" rows={Object.entries(d.letters).map(([l, n]) => ({ label: l, value: n as number }))} />
        <section className={card}>
          <h3 className="text-sm font-bold mb-2">Need attention</h3>
          <Table columns={['Student', 'Class', 'Why']} rows={d.attention.map((a: any) => [<Link key="n" to={`/education/students/${a.id}`} className="font-semibold hover:underline">{a.name}</Link>, a.class_name, a.reasons.join(' · ')])} />
        </section>
      </div>
    </>
  );
}

function Teachers({ d }: { d: any }) {
  return (
    <section className={card}>
      <h3 className="text-sm font-bold mb-2">Teachers</h3>
      <Table columns={['Teacher', 'Classes', 'Students', 'Lessons a week', 'Work due in period', 'Marked', 'Behaviour logged', 'Class attendance']}
        rows={d.teachers.map((t: any) => [<b key="n">{t.name}</b>, t.classes, t.students, t.lessons_per_week, t.assignments,
          t.marked_percent == null ? '—' : pct(t.marked_percent), t.behaviour_logged, t.class_attendance == null ? '—' : pct(t.class_attendance)])} />
    </section>
  );
}
