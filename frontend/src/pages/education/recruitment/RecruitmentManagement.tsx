import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, Users, Calendar, FileText, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Applicant {
  id: number
  application_id: string
  name: string
  program: string
  qualification: string
  applied_date: string
  status: 'pending' | 'reviewed' | 'interviewed' | 'accepted' | 'rejected'
  email: string
  phone: string
}

const SAMPLE_APPLICANTS: Applicant[] = [
  { id: 1, application_id: 'APP-001', name: 'Ali Raza', program: 'BS Computer Science', qualification: 'FSc (85%)', applied_date: '2024-02-15', status: 'pending', email: 'ali@example.com', phone: '+92 300 1234567' },
  { id: 2, application_id: 'APP-002', name: 'Fatima Zafar', program: 'MBA', qualification: 'BBA (3.8 CGPA)', applied_date: '2024-02-10', status: 'interviewed', email: 'fatima@example.com', phone: '+92 321 7654321' },
]

export default function RecruitmentManagement() {
  const [applicants, setApplicants] = useState(SAMPLE_APPLICANTS)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Student Recruitment</h1><p className="text-gray-500">Manage applications and admissions</p></div><Button><Plus className="h-4 w-4 mr-2" />New Application</Button></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th>App ID</th><th>Name</th><th>Program</th><th>Qualification</th><th>Applied Date</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{applicants.map(a => (<tr key={a.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-mono">{a.application_id}</td><td className="px-4 py-3 font-medium">{a.name}</td><td className="px-4 py-3">{a.program}</td><td className="px-4 py-3">{a.qualification}</td><td className="px-4 py-3">{a.applied_date}</td><td className="px-4 py-3"><div className="flex flex-col text-xs"><span>{a.email}</span><span>{a.phone}</span></div></td><td className="px-4 py-3"><Badge variant={a.status === 'accepted' ? 'success' : a.status === 'pending' ? 'warning' : a.status === 'rejected' ? 'destructive' : 'info'}>{a.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
