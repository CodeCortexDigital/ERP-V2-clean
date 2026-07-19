import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';

interface ClassBarChartProps {
  data: { name: string; Students: number }[];
}

export default function ClassBarChart({ data }: ClassBarChartProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-xs text-purple-700">Statistics</h3>
        <span className="text-slate-400 cursor-pointer hover:text-slate-600">&lt;</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis type="number" stroke="#94A3B8" fontSize={10} />
            <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} iconType="square" />
            <Bar dataKey="Students" fill="#5850A2" barSize={35} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
