import { useState } from 'react'
import { Plus, Search, Calendar, Clock, Eye, Edit, Trash2, MessageSquare, Heart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface CounselingSession {
  id: number
  student_name: string
  student_id: string
  counselor: string
  session_date: string
  session_time: string
  type: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  notes: string
}

const SAMPLE_SESSIONS: CounselingSession[] = [
  { id: 1, student_name: 'Ahmed Khan', student_id: 'STU-001', counselor: 'Dr. Sarah Williams', session_date: '2024-03-15', session_time: '10:00 AM', type: 'Academic', status: 'scheduled', notes: 'Discussing academic performance' },
  { id: 2, student_name: 'Sara Ahmed', student_id: 'STU-002', counselor: 'Dr. John Smith', session_date: '2024-03-14', session_time: '02:00 PM', type: 'Career', status: 'completed', notes: 'Career counseling session completed' },
]

export default function CounselingManagement() {
  const [sessions, setSessions] = useState(SAMPLE_SESSIONS)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Counseling & Student Services</h1><p className="text-gray-500">Manage counseling sessions and student well-being</p></div><Button><Plus className="h-4 w-4 mr-2" />Schedule Session</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Calendar className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Sessions This Month</p><p className="text-2xl font-bold">12</p></div></div></div>
        <div className="bg-white rounded-lg border p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><Heart className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Active Students</p><p className="text-2xl font-bold">45</p></div></div></div>
        <div className="bg-white rounded-lg border p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Counseling Hours</p><p className="text-2xl font-bold">156</p></div></div></div>
      </div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th>Student</th><th>Counselor</th><th>Date/Time</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{sessions.map(s => (<tr key={s.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3">{s.student_name}<br/><span className="text-xs text-gray-500">{s.student_id}</span></td><td className="px-4 py-3">{s.counselor}</td><td className="px-4 py-3">{s.session_date}<br/><span className="text-xs text-gray-500">{s.session_time}</span></td><td className="px-4 py-3">{s.type}</td><td className="px-4 py-3"><Badge variant={s.status === 'scheduled' ? 'warning' : s.status === 'completed' ? 'success' : 'destructive'}>{s.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
