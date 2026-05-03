import { useState } from 'react'
import { Plus, Eye, Edit, Trash2, Award } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Portfolio {
  id: number
  student_name: string
  student_id: string
  title: string
  type: string
  description: string
  submission_date: string
  status: string
  rating: number
}

const SAMPLE_PORTFOLIOS: Portfolio[] = [
  { id: 1, student_name: 'Ahmed Khan', student_id: 'STU-001', title: 'E-commerce Website Project', type: 'project', description: 'Full stack e-commerce application', submission_date: '2024-02-15', status: 'approved', rating: 4.8 },
  { id: 2, student_name: 'Sara Ahmed', student_id: 'STU-002', title: 'Data Analysis Certificate', type: 'certificate', description: 'Google Data Analytics Certification', submission_date: '2024-01-20', status: 'reviewed', rating: 4.5 },
]

export default function PortfoliosManagement() {
  const [portfolios] = useState(SAMPLE_PORTFOLIOS)
  const safePortfolios = portfolios || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Portfolios</h1>
          <p className="text-gray-500">Manage student work portfolios and achievements</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Submission Date</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Rating</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {safePortfolios.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  {p.student_name}
                  <br />
                  <span className="text-xs text-gray-500">{p.student_id}</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{p.title}</td>
                <td className="px-4 py-3 text-sm capitalize">{p.type}</td>
                <td className="px-4 py-3 text-sm">{p.description}</td>
                <td className="px-4 py-3 text-sm">{p.submission_date}</td>
                <td className="px-4 py-3 text-sm text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span>{p.rating}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant={p.status === 'approved' ? 'success' : 'info'}>
                    {p.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <div className="flex justify-center gap-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-800">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
