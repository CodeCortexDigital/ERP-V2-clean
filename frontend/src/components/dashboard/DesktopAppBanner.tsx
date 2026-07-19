export default function DesktopAppBanner() {
  return (
    <div className="bg-[#F87171] text-white p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
      <div className="space-y-1">
        <h4 className="font-bold text-xs">Desktop Version</h4>
        <p className="text-[9px] opacity-90">*Download & Install My School on your PC.</p>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => alert('Downloading Windows app')}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded-md transition-colors shadow-2xs"
        >
          Download for Windows
        </button>
        <button
          onClick={() => alert('Downloading MacOS app')}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[9px] font-bold rounded-md transition-colors shadow-2xs"
        >
          Download for MacOS
        </button>
      </div>
    </div>
  );
}
