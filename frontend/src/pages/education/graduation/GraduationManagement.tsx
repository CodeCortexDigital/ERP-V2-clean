import { useState } from 'react'
import { Plus, Search, GraduationCap, Calendar, Award, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface GraduationApplication {
  id: number
  student_name: string
  student_id: string
  program: string
  graduation_date: string
  cgpa: number
  credits_completed: number
  credits_required: number
  status: 'pending' | 'approved' | 'rejected' | 'graduated'
  ceremony_attendance: boolean
}

const SAMPLE_APPLICATIONS: GraduationApplication[] = [
  { id: 1, student_name: 'Ahmed Khan', student_id: 'STU-001', program: 'BS Computer Science', graduation_date: '2024-06-15', cgpa: 3.75, credits_completed: 132, credits_required: 132, status: 'approved', ceremony_attendance: true },
  { id: 2, student_name: 'Sara Ahmed', student_id: 'STU-002', program: 'MBA', graduation_date: '2024-06-15', cgpa: 3.85, credits_completed: 66, credits_required: 66, status: 'pending', ceremony_attendance: true },
  { id: 3, student_name: 'Omar Hassan', student_id: 'STU-003', program: 'BS Software Engineering', graduation_date: '2024-06-15', cgpa: 3.92, credits_completed: 128, credits_required: 128, status: 'graduated', ceremony_attendance: false },
]

export default function GraduationManagement() {
  const [applications, setApplications] = useState(SAMPLE_APPLICATIONS)
  const [searchQuery, setSearchQuery] = useState('')

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    graduated: applications.filter(a => a.status === 'graduated').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Graduation Management</h1>
          <p className="text-gray-500">Manage graduation applications, degree audits, and ceremonies</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Process Applications</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Applications</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Pending Review</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Approved</p><p className="text-2xl font-bold text-blue-600">{stats.approved}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Graduated</p><p className="text-2xl font-bold text-green-600">{stats.graduated}</p></div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left">Student</th><th className="px-4 py-3 text-left">Program</th><th className="px-4 py-3 text-center">CGPA</th><th className="px-4 py-3 text-center">Credits</th><th className="px-4 py-3 text-left">Graduation Date</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Ceremony</th><th className="px-4 py-3 text-center">Actions</th></tr>
          </thead>
          <tbody>
            {applications.map(a => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{a.student_name}<br/><span className="text-xs text-gray-500">{a.student_id}</span></td>
                <td className="px-4 py-3">{a.program}</td>
                <td className="px-4 py-3 text-center font-mono font-medium text-blue-600">{a.cgpa}</td>
                <td className="px-4 py-3 text-center">{a.credits_completed}/{a.credits_required}</td>
                <td className="px-4 py-3">{a.graduation_date}</td>
                <td className="px-4 py-3"><Badge variant={a.status === 'graduated' ? 'success' : a.status === 'approved' ? 'info' : a.status === 'pending' ? 'warning' : 'destructive'}>{a.status}</Badge></td>
                <td className="px-4 py-3 text-center">{a.ceremony_attendance ? <CheckCircle className="h-4 w-4 text-green-500 inline" /> : <XCircle className="h-4 w-4 text-red-500 inline" />}</td>
                <td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
