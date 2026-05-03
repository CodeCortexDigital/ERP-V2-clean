import { useState } from 'react'
import { Plus, Edit, Trash2, Award, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface GradeScale {
  id: number
  grade: string
  min_percentage: number
  max_percentage: number
  gpa: number
  description: string
  status: 'active' | 'inactive'
}

const SAMPLE_GRADES: GradeScale[] = [
  { id: 1, grade: 'A+', min_percentage: 90, max_percentage: 100, gpa: 4.0, description: 'Excellent', status: 'active' },
  { id: 2, grade: 'A', min_percentage: 85, max_percentage: 89, gpa: 3.7, description: 'Very Good', status: 'active' },
  { id: 3, grade: 'B+', min_percentage: 80, max_percentage: 84, gpa: 3.3, description: 'Good', status: 'active' },
]

export default function GradeScaleManagement() {
  const [grades] = useState(SAMPLE_GRADES)
  const safeGrades = grades || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Grade Scale Management</h1><p className="text-gray-500">Define and manage grading scales</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Grade</Button></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th>Grade</th><th>Percentage Range</th><th>GPA</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody className="divide-y divide-gray-200">{safeGrades.map(g => (<tr key={g.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-bold text-center text-lg">{g.grade}</td><td className="px-4 py-3 text-center">{g.min_percentage}% - {g.max_percentage}%</td><td className="px-4 py-3 text-center font-mono">{g.gpa}</td><td className="px-4 py-3">{g.description}</td><td className="px-4 py-3"><Badge variant={g.status === 'active' ? 'success' : 'secondary'}>{g.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Edit className="h-4 w-4" /></button><button className="text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
      </table>
      </div>
    </div>
  )
}
