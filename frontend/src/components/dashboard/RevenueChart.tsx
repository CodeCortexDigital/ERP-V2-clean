import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';

interface RevenueChartProps {
  data: { name: string; Expenses: number; Income: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-xs text-purple-700">Statistics</h3>
        <span className="text-slate-400 cursor-pointer hover:text-slate-600">&lt;</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
            <YAxis stroke="#94A3B8" fontSize={10} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} iconType="square" />
            <Line type="monotone" dataKey="Expenses" stroke="#F87171" strokeWidth={2} dot={{ r: 4, fill: '#F87171' }} />
            <Line type="monotone" dataKey="Income" stroke="#60A5FA" strokeWidth={2} dot={{ r: 4, fill: '#60A5FA' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
