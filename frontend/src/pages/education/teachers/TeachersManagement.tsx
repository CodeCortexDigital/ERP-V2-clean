import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, Mail, Phone, BookOpen, Calendar, Award } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Teacher {
  id: number
  teacher_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  department: string
  specialization: string
  qualification: string
  joining_date: string
  status: 'active' | 'on_leave' | 'inactive'
  courses: string[]
}

const SAMPLE_TEACHERS: Teacher[] = [
  { id: 1, teacher_id: 'TCH-001', first_name: 'Dr. Ahmed', last_name: 'Raza', email: 'ahmed.raza@edu.com', phone: '+92 300 1111111', department: 'Computer Science', specialization: 'AI & Machine Learning', qualification: 'PhD', joining_date: '2020-08-15', status: 'active', courses: ['CS101', 'CS202'] },
  { id: 2, teacher_id: 'TCH-002', first_name: 'Prof. Sara', last_name: 'Khan', email: 'sara.khan@edu.com', phone: '+92 321 2222222', department: 'Mathematics', specialization: 'Calculus', qualification: 'MPhil', joining_date: '2019-01-10', status: 'active', courses: ['MATH101', 'MATH202'] },
]

export default function TeachersManagement() {
  const [teachers, setTeachers] = useState(SAMPLE_TEACHERS)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Teachers Management</h1><p className="text-gray-500">Manage faculty and teaching staff</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Teacher</Button></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th>Teacher ID</th><th>Name</th><th>Department</th><th>Specialization</th><th>Qualification</th><th>Courses</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{teachers.map(t => (<tr key={t.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-mono">{t.teacher_id}</td><td className="px-4 py-3 font-medium">{t.first_name} {t.last_name}<br/><span className="text-xs text-gray-500">{t.email}</span></td><td className="px-4 py-3">{t.department}</td><td className="px-4 py-3">{t.specialization}</td><td className="px-4 py-3">{t.qualification}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{t.courses.map(c => <Badge key={c} variant="outline">{c}</Badge>)}</div></td><td className="px-4 py-3"><Badge variant={t.status === 'active' ? 'success' : 'warning'}>{t.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button><button className="text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
      </table></div>
    </div>
  )
}
