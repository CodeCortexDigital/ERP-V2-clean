// Small, dependency-free SVG charts for the school reports, following the house data-viz rules:
// thin marks (≤24px bars, 4px rounded ends at the data end, 2px lines), a 2px surface gap between bars,
// recessive solid hairline grid, a legend whenever there are 2+ series, selective direct labels,
// a hover tooltip on every chart, and a table view so no value depends on hovering or on colour.
// Series colours: slot 1 blue, slot 2 orange (validated for light on #ffffff and dark on #0f172a).
import { useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Table2 } from 'lucide-react';

export const VIZ_CSS = `
.viz { --s1:#2a78d6; --s2:#eb6834; --grid:#ecebe6; --axis:#c3c2b7; --muted:#898781; --ink:#0b0b0b; --ink2:#52514e; --surface:#ffffff; --good:#006300; --bad:#d03b3b; }
.dark .viz { --s1:#3987e5; --s2:#d95926; --grid:#2c2c2a; --axis:#383835; --muted:#898781; --ink:#ffffff; --ink2:#c3c2b7; --surface:#0f172a; --good:#0ca30c; --bad:#e66767; }
.viz text { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
`;

export type Fmt = (v: number) => string;
export const num: Fmt = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 });
export const pct: Fmt = (v) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** A column with a 4px rounded data end and a square foot on the baseline. */
function colPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function Legend({ series }: { series: Array<{ key: string; label: string; color: string }> }) {
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--ink2)' }}>
      {series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
    </div>
  );
}

function TableView({ columns, rows }: { columns: string[]; rows: Array<Array<string>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{columns.map((c) => <th key={c} className="py-1 pr-3">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t" style={{ borderColor: 'var(--grid)' }}>{r.map((c, j) => <td key={j} className="py-1 pr-3" style={{ color: j ? 'var(--ink)' : 'var(--ink2)' }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Frame({ title, subtitle, children, table, legend, empty }: {
  title: string; subtitle?: string; children: React.ReactNode; table: React.ReactNode; legend?: React.ReactNode; empty?: boolean;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="viz bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4" style={{ color: 'var(--ink)' }}>
      <div className="flex items-start gap-2 mb-2">
        <div className="mr-auto">
          <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{title}</h3>
          {subtitle && <p className="text-xs" style={{ color: 'var(--ink2)' }}>{subtitle}</p>}
        </div>
        {!empty && (
          <button type="button" onClick={() => setAsTable(!asTable)} aria-pressed={asTable} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--ink2)' }}>
            <Table2 size={13} /> {asTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>
      {legend}
      {empty ? <p className="text-sm py-6 text-center" style={{ color: 'var(--muted)' }}>No data for this period.</p> : asTable ? table : children}
    </section>
  );
}

function Tooltip({ x, y, width, title, rows }: { x: number; y: number; width: number; title: string; rows: Array<{ color: string; label: string; value: string }> }) {
  const left = Math.min(Math.max(x - 70, 0), Math.max(width - 150, 0));
  return (
    <div className="pointer-events-none absolute z-10 rounded-lg border shadow-md px-3 py-2 text-xs min-w-[140px]" role="status"
      style={{ left, top: Math.max(y - 12, 0), transform: 'translateY(-100%)', background: 'var(--surface)', borderColor: 'var(--grid)' }}>
      <p className="mb-1" style={{ color: 'var(--ink2)' }}>{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: r.color }} />
          <b className="tabular-nums" style={{ color: 'var(--ink)' }}>{r.value}</b>
          <span style={{ color: 'var(--ink2)' }}>{r.label}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column chart: one or two series over categories (months, classes…)
// ---------------------------------------------------------------------------

export function ColumnChart({ title, subtitle, data, series, format = num, height = 200 }: {
  title: string; subtitle?: string; height?: number; format?: Fmt;
  data: Array<{ label: string; values: Record<string, number | null> }>;
  series: Array<{ key: string; label: string }>;
}) {
  const colors = ['var(--s1)', 'var(--s2)'];
  const ss = series.slice(0, 2).map((s, i) => ({ ...s, color: colors[i] }));
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, padL = 44, padB = 22, padT = 18, plotW = W - padL - 8, plotH = height - padB - padT;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => ss.map((s) => d.values[s.key] ?? 0))));
  const band = plotW / Math.max(data.length, 1);
  const barW = Math.min(24, (band * 0.7 - 2 * (ss.length - 1)) / ss.length);
  const groupW = barW * ss.length + 2 * (ss.length - 1);
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const empty = !data.length || data.every((d) => ss.every((s) => !d.values[s.key]));
  const last = data.length - 1;
  const every = Math.ceil(data.length / 8);
  return (
    <Frame title={title} subtitle={subtitle} empty={empty} legend={<div className="mb-2"><Legend series={ss} /></div>}
      table={<TableView columns={['', ...ss.map((s) => s.label)]} rows={data.map((d) => [d.label, ...ss.map((s) => (d.values[s.key] == null ? '—' : format(d.values[s.key]!)))])} />}>
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto" role="img" aria-label={title}>
          {ticks.map((t) => {
            const y = padT + plotH - (t / max) * plotH;
            return <g key={t}><line x1={padL} x2={W - 8} y1={y} y2={y} stroke={t ? 'var(--grid)' : 'var(--axis)'} strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{format(t)}</text></g>;
          })}
          {data.map((d, i) => {
            const gx = padL + band * i + (band - groupW) / 2;
            return (
              <g key={d.label} opacity={hover == null || hover === i ? 1 : 0.55}>
                {ss.map((s, j) => {
                  const v = d.values[s.key] ?? 0;
                  const h = (v / max) * plotH;
                  return <path key={s.key} d={colPath(gx + j * (barW + 2), padT + plotH - h, barW, h)} fill={s.color} />;
                })}
                {i === last && ss.length === 1 && (d.values[ss[0].key] ?? 0) > 0 && (
                  <text x={gx + barW / 2} y={padT + plotH - ((d.values[ss[0].key] ?? 0) / max) * plotH - 4} textAnchor="middle" fontSize={10} fill="var(--ink2)">{format(d.values[ss[0].key]!)}</text>
                )}
                {(i % every === 0 || i === last) && <text x={padL + band * i + band / 2} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">{d.label}</text>}
                <rect x={padL + band * i} y={padT} width={band} height={plotH} fill="transparent" tabIndex={0}
                  onPointerMove={() => setHover(i)} onFocus={() => setHover(i)} aria-label={`${d.label}: ${ss.map((s) => `${s.label} ${d.values[s.key] == null ? 'none' : format(d.values[s.key]!)}`).join(', ')}`} />
              </g>
            );
          })}
        </svg>
        {hover != null && ref.current && (
          <Tooltip x={((padL + band * hover + band / 2) / W) * ref.current.clientWidth} y={(padT / height) * ref.current.clientHeight + 10}
            width={ref.current.clientWidth} title={data[hover].label}
            rows={ss.map((s) => ({ color: s.color, label: s.label, value: data[hover].values[s.key] == null ? '—' : format(data[hover].values[s.key]!) }))} />
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Line chart: one series over time, with a crosshair
// ---------------------------------------------------------------------------

export function LineChart({ title, subtitle, points, format = num, min: forcedMin, max: forcedMax, height = 180 }: {
  title: string; subtitle?: string; format?: Fmt; height?: number; min?: number; max?: number;
  points: Array<{ label: string; value: number | null }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, padL = 44, padB = 22, padT = 16, plotW = W - padL - 40, plotH = height - padB - padT;
  const vals = points.map((p) => p.value).filter((v): v is number => v != null);
  const hi = forcedMax ?? niceMax(Math.max(0, ...vals));
  const lo = forcedMin ?? 0;
  const x = (i: number) => padL + (points.length < 2 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const y = (v: number) => padT + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const segs = useMemo(() => {
    const out: string[][] = [];
    let cur: string[] = [];
    points.forEach((p, i) => {
      if (p.value == null) { if (cur.length) out.push(cur); cur = []; return; }
      cur.push(`${x(i)},${y(p.value)}`);
    });
    if (cur.length) out.push(cur);
    return out;
  }, [points, hi, lo]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastIdx = points.map((p) => p.value).lastIndexOf(points.filter((p) => p.value != null).slice(-1)[0]?.value ?? NaN);
  const every = Math.ceil(points.length / 8);
  return (
    <Frame title={title} subtitle={subtitle} empty={!vals.length}
      table={<TableView columns={['', title]} rows={points.map((p) => [p.label, p.value == null ? '—' : format(p.value)])} />}>
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - padL) / plotW) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}>
        <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto" role="img" aria-label={title}>
          {[lo, (lo + hi) / 2, hi].map((t) => (
            <g key={t}><line x1={padL} x2={W - 40} y1={y(t)} y2={y(t)} stroke={t === lo ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{format(t)}</text></g>
          ))}
          {segs.map((s, i) => (
            <g key={i}>
              {s.length > 1 && <path d={`M${s[0].split(',')[0]},${y(lo)}L${s.join('L')}L${s[s.length - 1].split(',')[0]},${y(lo)}Z`} fill="var(--s1)" opacity={0.1} />}
              <polyline points={s.join(' ')} fill="none" stroke="var(--s1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ))}
          {points.map((p, i) => (i % every === 0 || i === points.length - 1) && <text key={p.label} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">{p.label}</text>)}
          {lastIdx >= 0 && points[lastIdx].value != null && (
            <g>
              <circle cx={x(lastIdx)} cy={y(points[lastIdx].value!)} r={5} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} />
              <text x={x(lastIdx) + 8} y={y(points[lastIdx].value!) + 3} fontSize={11} fill="var(--ink)">{format(points[lastIdx].value!)}</text>
            </g>
          )}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke="var(--axis)" strokeWidth={1} />
              {points[hover].value != null && <circle cx={x(hover)} cy={y(points[hover].value!)} r={4} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} />}
            </g>
          )}
        </svg>
        {hover != null && ref.current && (
          <Tooltip x={(x(hover) / W) * ref.current.clientWidth} y={(padT / height) * ref.current.clientHeight + 10} width={ref.current.clientWidth}
            title={points[hover].label} rows={[{ color: 'var(--s1)', label: title, value: points[hover].value == null ? 'no data' : format(points[hover].value!) }]} />
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bars: ranked categories (classes, subjects, fee types…)
// ---------------------------------------------------------------------------

export function BarList({ title, subtitle, rows, format = num, max: forcedMax }: {
  title: string; subtitle?: string; format?: Fmt; max?: number; rows: Array<{ label: string; value: number | null; note?: string }>;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const hi = forcedMax ?? niceMax(Math.max(0, ...rows.map((r) => r.value ?? 0)));
  return (
    <Frame title={title} subtitle={subtitle} empty={!rows.length}
      table={<TableView columns={['', title]} rows={rows.map((r) => [r.label, r.value == null ? '—' : format(r.value)])} />}>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.label} tabIndex={0} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            className="grid grid-cols-[minmax(80px,30%)_1fr_auto] items-center gap-2 text-sm outline-none">
            <span className="truncate" style={{ color: 'var(--ink2)' }} title={r.label}>{r.label}</span>
            <span className="h-3 rounded-r" style={{ background: 'var(--grid)' }}>
              <span className="block h-3 rounded-r-[4px]" style={{ width: `${Math.max(0, Math.min(100, ((r.value ?? 0) / hi) * 100))}%`, background: 'var(--s1)', opacity: hover == null || hover === i ? 1 : 0.55 }} />
            </span>
            <span className="tabular-nums text-right" style={{ color: 'var(--ink)' }}>{r.value == null ? '—' : format(r.value)}{r.note && hover === i ? <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>{r.note}</span> : null}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Stat tile: label · value · change against the previous period
// ---------------------------------------------------------------------------

export function StatTile({ label, value, change, upIsGood, note, format = num, changeFormat }: {
  label: string; value: number | null; change?: number | null; upIsGood?: boolean; note?: string; format?: Fmt; changeFormat?: Fmt;
}) {
  const good = change == null || change === 0 || upIsGood == null ? null : (change > 0) === upIsGood;
  const Icon = change == null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="viz bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <p className="text-xs font-semibold" style={{ color: 'var(--ink2)' }}>{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--ink)' }}>{value == null ? '—' : format(value)}</p>
      {change != null && (
        <p className="text-xs mt-1">
          <span className="inline-flex items-center gap-0.5 font-semibold whitespace-nowrap" style={{ color: good == null ? 'var(--ink2)' : good ? 'var(--good)' : 'var(--bad)' }}>
            <Icon size={13} aria-hidden /> {change > 0 ? '+' : ''}{(changeFormat || format)(change)}
          </span>
          <span className="block" style={{ color: 'var(--muted)' }}>vs previous period</span>
        </p>
      )}
      {note && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{note}</p>}
    </div>
  );
}
