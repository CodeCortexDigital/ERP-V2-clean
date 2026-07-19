import type { SmartInsight } from './types';

interface SmartInsightsProps {
  insights: SmartInsight[];
}

const ICON_MAP: Record<string, string> = {
  warning: '⚠️',
  critical: '🚨',
  alert: '🔔',
  info: '💡',
  success: '✅',
};

const PRIORITY_COLOR: Record<string, string> = {
  high: 'border-l-red-400 bg-red-50',
  medium: 'border-l-amber-400 bg-amber-50',
  low: 'border-l-blue-400 bg-blue-50',
};

export default function SmartInsights({ insights }: SmartInsightsProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <h3 className="font-bold text-xs text-slate-800">Smart Insights</h3>
      <div className="space-y-2">
        {insights.slice(0, 5).map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${PRIORITY_COLOR[insight.priority] || 'border-l-slate-300 bg-slate-50'}`}
          >
            <span className="text-sm flex-shrink-0">
              {ICON_MAP[insight.type] || '💡'}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">{insight.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {insight.description || insight.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
