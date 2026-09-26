import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Copy, Download, FileSpreadsheet, History, Loader2, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import imports, { errorText, ImportHistoryRow, ImportKind, ImportResult, Preview } from '@/services/imports.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const STATE: Record<string, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', tone: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  duplicate: { label: 'Already exists', tone: 'bg-slate-100 text-slate-600', icon: Copy },
  error: { label: 'Needs fixing', tone: 'bg-rose-100 text-rose-700', icon: XCircle },
};

/** Import data: pick what to import, download the template, check the file, then add the ready rows in one go. */
export default function ImportPage() {
  const [params, setParams] = useSearchParams();
  const [kinds, setKinds] = useState<ImportKind[]>([]);
  const [history, setHistory] = useState<ImportHistoryRow[]>([]);
  const kind = params.get('kind') || 'classes';
  const spec = kinds.find((k) => k.kind === kind);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'' | 'check' | 'import'>('');
  const [show, setShow] = useState<'all' | 'ready' | 'duplicate' | 'error'>('all');
  const input = useRef<HTMLInputElement>(null);

  const loadHistory = () => imports.history().then(setHistory).catch(() => undefined);
  useEffect(() => {
    imports.kinds().then((d) => setKinds(d.kinds)).catch((e) => toast.error(errorText(e, 'Could not load.')));
    loadHistory();
  }, []);
  const pick = (k: string) => { setParams({ kind: k }); reset(); };
  const reset = () => { setFile(null); setPreview(null); setResult(null); setShow('all'); if (input.current) input.current.value = ''; };

  const check = async (f: File) => {
    setFile(f); setPreview(null); setResult(null); setBusy('check');
    try { setPreview(await imports.preview(kind, f)); } catch (e) { toast.error(errorText(e, 'Could not read the file.')); setFile(null); } finally { setBusy(''); }
  };
  const run = async () => {
    if (!file || !preview) return;
    setBusy('import');
    try {
      const r = await imports.run(kind, file);
      setResult(r); setPreview(null); toast.success(r.message); loadHistory();
      imports.kinds().then((d) => setKinds(d.kinds)).catch(() => undefined);
    } catch (e) { toast.error(errorText(e, 'Could not import.')); } finally { setBusy(''); }
  };

  const rows = useMemo(() => (preview?.rows || []).filter((r) => show === 'all' || r.state === show), [preview, show]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-brand" /> Import data</h1>
        <p className="text-sm text-slate-500">Bring your records in from a spreadsheet (CSV or Excel). Nothing is added until you have checked the preview.
          Work in this order: classes, subjects, staff, students, then opening balances.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2" role="tablist" aria-label="What to import">
        {kinds.map((k, i) => (
          <button key={k.kind} role="tab" aria-selected={kind === k.kind} onClick={() => pick(k.kind)}
            className={`${card} p-3 text-left ${kind === k.kind ? 'ring-2 ring-brand border-transparent' : 'hover:border-slate-400'}`}>
            <p className="text-[11px] font-bold text-slate-400">Step {i + 1}</p>
            <p className="text-sm font-semibold text-slate-800">{k.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{k.last_import ? `Last: ${k.last_import.added} added, ${new Date(k.last_import.when).toLocaleDateString()}` : 'Not imported yet'}</p>
          </button>
        ))}
      </div>

      {spec && (
        <section className={`${card} p-5 space-y-4`} aria-labelledby="import-step">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <h2 id="import-step" className="font-bold text-slate-800">{spec.label}</h2>
              <p className="text-sm text-slate-600 mt-1">{spec.help}</p>
              <p className="text-xs text-slate-500 mt-2">Columns: {spec.columns.map((c) => <span key={c.key} className={c.required ? 'font-semibold text-slate-700' : ''}>{c.label}{c.required ? ' *' : ''}</span>).reduce((a: any[], el, i) => (i ? [...a, ', ', el] : [el]), [])}. <span className="font-semibold">*</span> required. Dates like 2026-09-26 or 26/09/2026.</p>
            </div>
            <button onClick={() => imports.template(kind).catch(() => toast.error('Could not download.'))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              <Download size={15} /> Download template
            </button>
          </div>

          {!result && (
            <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer ${busy === 'check' ? 'border-brand bg-brand-soft' : 'border-slate-300 hover:bg-slate-50'}`}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) check(f); }}>
              {busy === 'check' ? <Loader2 className="w-6 h-6 animate-spin text-brand" /> : <Upload className="w-6 h-6 text-slate-400" />}
              <span className="text-sm font-semibold text-slate-700">{file ? file.name : 'Choose a file or drop it here'}</span>
              <span className="text-xs text-slate-500">CSV or Excel (.xlsx), up to 5 MB</span>
              <input ref={input} type="file" accept=".csv,.xlsx,.xlsm,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) check(f); }} />
            </label>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show rows">
                {(['all', 'ready', 'duplicate', 'error'] as const).map((s) => {
                  const n = s === 'all' ? preview.rows.length : preview.summary[s];
                  return (
                    <button key={s} onClick={() => setShow(s)} aria-pressed={show === s}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${show === s ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600'}`}>
                      {s === 'all' ? 'All rows' : STATE[s].label} ({n})
                    </button>
                  );
                })}
                {preview.unknown_columns.length > 0 && (
                  <span className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={13} /> Ignored columns: {preview.unknown_columns.join(', ')}</span>
                )}
              </div>
              <div className="overflow-x-auto max-h-[420px] border border-slate-100 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50"><tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-semibold">Row</th><th className="px-3 py-2 font-semibold">Result</th>
                    {preview.columns.slice(0, 6).map((c) => <th key={c.key} className="px-3 py-2 font-semibold whitespace-nowrap">{c.label}</th>)}
                  </tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = STATE[r.state];
                      return (
                        <tr key={r.row} className="border-t border-slate-100 align-top">
                          <td className="px-3 py-2 text-slate-500">{r.row}</td>
                          <td className="px-3 py-2 min-w-[220px]">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.tone}`}><st.icon size={11} /> {st.label}</span>
                            {r.messages.map((m) => <p key={m} className={`mt-1 ${r.state === 'error' ? 'text-rose-700' : 'text-slate-500'}`}>{m}</p>)}
                            {r.note && <p className="mt-1 text-slate-500">{r.note}</p>}
                          </td>
                          {preview.columns.slice(0, 6).map((c) => <td key={c.key} className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.values[c.key] || ''}</td>)}
                        </tr>
                      );
                    })}
                    {!rows.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No rows here.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  <strong>{preview.summary.ready}</strong> ready to add.
                  {preview.summary.duplicate > 0 && <> {preview.summary.duplicate} already exist and will be skipped.</>}
                  {preview.summary.error > 0 && <> {preview.summary.error} need fixing and will be skipped; fix them in the file and import it again later.</>}
                </p>
                <div className="flex gap-2">
                  <button onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Choose another file</button>
                  <button onClick={run} disabled={!preview.summary.ready || !!busy} className="auth-primary-btn w-auto px-5 disabled:opacity-50">
                    {busy === 'import' && <Loader2 className="w-4 h-4 animate-spin" />} Import {preview.summary.ready} row{preview.summary.ready === 1 ? '' : 's'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2" role="status">
              <p className="font-semibold text-emerald-800 flex items-center gap-2"><CheckCircle2 size={16} /> Imported: {result.message}</p>
              <div className="flex flex-wrap gap-2">
                {result.problems.length > 0 && (
                  <button onClick={() => imports.problems(result.id, kind).catch(() => toast.error('Could not download.'))} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    <Download size={13} /> Download the skipped rows ({result.problems.length})
                  </button>
                )}
                <button onClick={reset} className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800">Import another file</button>
              </div>
            </div>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className={card} aria-labelledby="import-history">
          <h2 id="import-history" className="flex items-center gap-2 px-5 pt-4 font-bold text-slate-800"><History size={16} /> Past imports</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-5 py-2 font-semibold">When</th><th className="px-3 py-2 font-semibold">What</th><th className="px-3 py-2 font-semibold">File</th>
                <th className="px-3 py-2 font-semibold">By</th><th className="px-3 py-2 font-semibold">Result</th><th className="px-3 py-2" /></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-50">
                    <td className="px-5 py-2 text-slate-600 whitespace-nowrap">{new Date(h.when).toLocaleString()}</td>
                    <td className="px-3 py-2">{h.label}</td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[200px]">{h.file}</td>
                    <td className="px-3 py-2 text-slate-500">{h.by}</td>
                    <td className="px-3 py-2 text-slate-600">{h.added} added{h.skipped ? `, ${h.skipped} existed` : ''}{h.failed ? `, ${h.failed} skipped` : ''}</td>
                    <td className="px-3 py-2 text-right">{h.has_problems && <button onClick={() => imports.problems(h.id, h.kind)} className="text-xs font-semibold text-blue-600">Skipped rows</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
