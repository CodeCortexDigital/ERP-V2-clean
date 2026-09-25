import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Printer } from 'lucide-react';
import library, { Label } from '@/services/library.service';
import Barcode from '@/components/library/Barcode';

/** Printable labels: book copies (?book= or ?copies=) or library cards (?members=), with a barcode and a QR code. */
export default function LibraryLabelsPage() {
  const [params] = useSearchParams();
  const [labels, setLabels] = useState<Label[] | null>(null);
  const cards = !!params.get('members');

  useEffect(() => {
    const p = cards ? { members: params.get('members')! } : params.get('book') ? { book: params.get('book')! } : { copies: params.get('copies') || '' };
    library.labels(p).then((r) => setLabels(r.labels)).catch(() => setLabels([]));
  }, [params, cards]);

  if (!labels) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Preparing labels…</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <p className="text-sm text-slate-600 mr-auto">{labels.length} {cards ? 'library card(s)' : 'book label(s)'}. Print on label sheets or plain paper and cut out.</p>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"><Printer size={15} /> Print</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:gap-2">
        {labels.map((l) => (
          <div key={l.code} className="bg-white border border-slate-300 rounded-lg p-3 flex items-center gap-3 break-inside-avoid">
            {l.qr && <span className="shrink-0 w-16 h-16 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: l.qr }} />}
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{cards ? 'Library card · ' : ''}{l.title}</p>
              <p className="text-[10px] text-slate-500 truncate mb-1">{l.detail}</p>
              <Barcode value={l.code} height={36} module={1.3} />
            </div>
          </div>
        ))}
      </div>
      {labels.length === 0 && <p className="text-sm text-slate-500">Nothing to print.</p>}
    </div>
  );
}
