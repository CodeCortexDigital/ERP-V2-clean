import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, PlusCircle } from 'lucide-react';

export default function AddClassPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={() => navigate('/education/academics/classes')}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to classes
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Add class</h1>
            <p className="text-sm text-slate-500">Class creation form will be wired here.</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <PlusCircle className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">The add-class experience is pending integration.</p>
          <p className="mt-1 text-sm text-slate-500">You can reuse this route while the full form is being completed.</p>
        </div>
      </div>
    </div>
  );
}
