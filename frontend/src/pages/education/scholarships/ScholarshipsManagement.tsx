import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, Award, DollarSign, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Scholarship {
  id: number
  name: string
  amount: number
  deadline: string
  eligibility: string
  applicants: number
  awarded: number
  status: 'active' | 'closed' | 'upcoming'
}

const SAMPLE_SCHOLARSHIPS: Scholarship[] = [
  { id: 1, name: 'Merit Scholarship', amount: 50000, deadline: '2024-04-30', eligibility: 'CGPA > 3.5', applicants: 45, awarded: 12, status: 'active' },
  { id: 2, name: 'Need-Based Aid', amount: 30000, deadline: '2024-05-15', eligibility: 'Family income < $50k', applicants: 78, awarded: 25, status: 'active' },
]

export default function ScholarshipsManagement() {
  const [scholarships, setScholarships] = useState(SAMPLE_SCHOLARSHIPS)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Scholarships Management</h1><p className="text-gray-500">Manage scholarships and financial aid</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Scholarship</Button></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><td><th>Scholarship Name</th><th>Amount</th><th>Deadline</th><th>Eligibility</th><th>Applicants</th><th>Awarded</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{scholarships.map(s => (<tr key={s.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{s.name}</td><td className="px-4 py-3 font-mono text-green-600">${s.amount.toLocaleString()}</td><td className="px-4 py-3">{s.deadline}</td><td className="px-4 py-3 text-sm">{s.eligibility}</td><td className="px-4 py-3">{s.applicants}</td><td className="px-4 py-3">{s.awarded}</td><td className="px-4 py-3"><Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
