import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Assignment {
  id: number
  title: string
  course: string
  due_date: string
  max_score: number
  submissions: number
  avg_score: number
  status: 'active' | 'closed' | 'grading'
}

const SAMPLE_ASSIGNMENTS: Assignment[] = [
  { id: 1, title: 'JavaScript Fundamentals', course: 'Web Development', due_date: '2024-03-20', max_score: 100, submissions: 28, avg_score: 78.5, status: 'grading' },
  { id: 2, title: 'Database Design Project', course: 'Database Systems', due_date: '2024-03-25', max_score: 100, submissions: 25, avg_score: 82.3, status: 'active' },
  { id: 3, title: 'Final Exam Preparation', course: 'Data Structures', due_date: '2024-03-18', max_score: 50, submissions: 30, avg_score: 85.2, status: 'closed' },
]

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState(SAMPLE_ASSIGNMENTS)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Assignments & Grades</h1><p className="text-gray-500">Manage assignments, submissions, and grading</p></div><Button><Plus className="h-4 w-4 mr-2" />Create Assignment</Button></div>
      <div className="flex gap-4"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search assignments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Assignment</th><th className="px-4 py-3 text-left">Course</th><th className="px-4 py-3 text-left">Due Date</th><th className="px-4 py-3 text-center">Score</th><th className="px-4 py-3 text-center">Submissions</th><th className="px-4 py-3 text-center">Avg Score</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
        <tbody>{assignments.map(a => (<tr key={a.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{a.title}</td><td className="px-4 py-3">{a.course}</td><td className="px-4 py-3">{a.due_date}</td><td className="px-4 py-3 text-center">{a.max_score}</td><td className="px-4 py-3 text-center">{a.submissions}</td><td className="px-4 py-3 text-center font-mono">{a.avg_score}%</td><td className="px-4 py-3"><Badge variant={a.status === 'active' ? 'warning' : a.status === 'grading' ? 'info' : 'success'}>{a.status}</Badge></td><td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button><button className="text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
