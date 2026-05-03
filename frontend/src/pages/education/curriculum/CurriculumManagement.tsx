import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, BookOpen, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Curriculum {
  id: number
  program: string
  semester: number
  course_code: string
  course_name: string
  credits: number
  type: 'core' | 'elective' | 'lab'
  prerequisites: string[]
  status: 'active' | 'inactive' | 'planned'
}

const SAMPLE_CURRICULUM: Curriculum[] = [
  { id: 1, program: 'BS Computer Science', semester: 1, course_code: 'CS101', course_name: 'Programming Fundamentals', credits: 3, type: 'core', prerequisites: [], status: 'active' },
  { id: 2, program: 'BS Computer Science', semester: 2, course_code: 'CS102', course_name: 'Object Oriented Programming', credits: 3, type: 'core', prerequisites: ['CS101'], status: 'active' },
]

export default function CurriculumManagement() {
  const [curriculum, setCurriculum] = useState(SAMPLE_CURRICULUM)
  const [selectedProgram, setSelectedProgram] = useState('All')
  const programs = ['All', ...new Set(curriculum.map(c => c.program))]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Curriculum Management</h1><p className="text-gray-500">Manage program curriculum and course mapping</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Course</Button></div>
      <div className="flex gap-4"><select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className="px-4 py-2 border rounded-lg bg-white text-sm">{programs.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th>Course Code</th><th>Course Name</th><th>Semester</th><th>Credits</th><th>Type</th><th>Prerequisites</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{curriculum.map(c => (<tr key={c.id} className="border-t"><td className="px-4 py-3 font-mono">{c.course_code}</td><td className="px-4 py-3 font-medium">{c.course_name}</td><td className="px-4 py-3 text-center">Semester {c.semester}</td><td className="px-4 py-3 text-center"><Badge variant="outline">{c.credits}</Badge></td><td className="px-4 py-3 capitalize">{c.type}</td><td className="px-4 py-3">{c.prerequisites.join(', ') || '-'}</td><td className="px-4 py-3"><Badge variant={c.status === 'active' ? 'success' : 'secondary'}>{c.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
