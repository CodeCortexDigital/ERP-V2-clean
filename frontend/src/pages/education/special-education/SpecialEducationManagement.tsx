import { useState } from 'react'
import { Plus, Search, Heart, Eye, Edit, Trash2, FileText, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface IEP {
  id: number
  student_name: string
  student_id: string
  disability_type: string
  accommodations: string[]
  iep_date: string
  review_date: string
  case_manager: string
  status: 'active' | 'pending' | 'expired'
}

const SAMPLE_IEPS: IEP[] = [
  { id: 1, student_name: 'Ali Raza', student_id: 'STU-010', disability_type: 'Learning Disability', accommodations: ['Extra time', 'Quiet room'], iep_date: '2024-01-15', review_date: '2024-07-15', case_manager: 'Dr. Sarah Williams', status: 'active' },
  { id: 2, student_name: 'Fatima Zafar', student_id: 'STU-011', disability_type: 'ADHD', accommodations: ['Preferential seating', 'Movement breaks'], iep_date: '2024-02-01', review_date: '2024-08-01', case_manager: 'Dr. John Smith', status: 'active' },
]

export default function SpecialEducationManagement() {
  const [ieps, setIeps] = useState(SAMPLE_IEPS)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Special Education Management</h1>
          <p className="text-gray-500">Manage IEPs, accommodations, and support services</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Create IEP</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Active IEPs</p><p className="text-2xl font-bold text-blue-600">24</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Students Served</p><p className="text-2xl font-bold text-green-600">32</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Support Staff</p><p className="text-2xl font-bold text-purple-600">8</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Reviews Due</p><p className="text-2xl font-bold text-yellow-600">6</p></div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th>Student</th><th>Disability Type</th><th>Accommodations</th><th>IEP Date</th><th>Review Date</th><th>Case Manager</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {ieps.map(i => (
              <tr key={i.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{i.student_name}<br/><span className="text-xs text-gray-500">{i.student_id}</span></td>
                <td className="px-4 py-3">{i.disability_type}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{i.accommodations.map(a => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}</div></td>
                <td className="px-4 py-3">{i.iep_date}</td>
                <td className="px-4 py-3">{i.review_date}</td>
                <td className="px-4 py-3">{i.case_manager}</td>
                <td className="px-4 py-3"><Badge variant={i.status === 'active' ? 'success' : 'warning'}>{i.status}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
