import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import ChildPicker, { usePortalChild, usePortalHome } from '@/components/portal/ChildPicker';
import DocumentsPanel from '@/components/portal/DocumentsPanel';

/** A student's documents, report cards and certificates, for the student or each of a parent's children. */
export default function StudentDocumentsPage() {
  const home = usePortalHome();
  const { kids, id, setId, loading } = usePortalChild();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mr-auto">
          <FileText size={16} className="text-blue-600" /> Documents
        </h3>
        <ChildPicker kids={kids} id={id} onChange={setId} />
        <Link to={home} className="text-[11px] font-bold text-blue-600 flex items-center gap-1"><ArrowLeft size={13} /> Dashboard</Link>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : id ? <DocumentsPanel key={id} studentId={id} /> : (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">No student record is linked to this account.</div>
      )}
    </div>
  );
}
