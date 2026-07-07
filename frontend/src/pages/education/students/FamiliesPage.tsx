import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, ShieldAlert, GitCommit, Settings, Layers } from 'lucide-react';

export default function FamiliesPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/students')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500">Manage Families</span>
        </div>
        <button 
          onClick={() => navigate('/education/students')} 
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center space-y-8 mt-6">
        {/* Animated Icon Header */}
        <div className="relative w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto text-purple-600">
          <Users className="w-12 h-12" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Families Directory</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The Family Management module is currently under development for this version of the portal. It will allow you to link siblings, organize billing accounts, and manage parent credentials in one centralized view.
          </p>
        </div>

        {/* Feature Roadmap List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-4 border-t border-slate-100">
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <GitCommit className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-700">Sibling Linking</h3>
            <p className="text-[11px] text-slate-400 leading-normal">Link siblings in classes automatically to synchronize parent details.</p>
          </div>

          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-700">Combined Invoices</h3>
            <p className="text-[11px] text-slate-400 leading-normal">Generate one family-invoice covering tuition fees for multiple siblings.</p>
          </div>

          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-700">Unified Portal Logins</h3>
            <p className="text-[11px] text-slate-400 leading-normal">Provide parents a single login to view performance reports of all their children.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
