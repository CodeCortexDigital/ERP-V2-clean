import { Sparkles, ArrowRight } from 'lucide-react';

// Slim AI tip on the admin dashboard; the button opens the assistant panel.
export default function WelcomeBanner() {
  return (
    <div className="bg-brand-soft rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <span className="shrink-0 w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-sm">
        <Sparkles className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-brand">Ask your AI assistant</p>
        <p className="text-xs text-slate-600">
          Try "Fee defaulters this month", "Attendance summary for Grade 8" or "Which students are at risk?"
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('open-ai-assistant'))}
        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
      >
        Ask AI <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
