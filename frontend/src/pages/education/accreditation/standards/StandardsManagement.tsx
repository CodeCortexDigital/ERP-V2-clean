import { useState } from 'react'
import { Plus, Edit, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Standard {
  id: number
  title: string
  code: string
  category: string
  description: string
  status: 'active' | 'draft' | 'archived'
}

export default function StandardsManagement() {
  const [standards, setStandards] = useState<Standard[]>([])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accreditation Standards</h1>
          <p className="text-gray-500 mt-1">Define and manage accreditation criteria and standards</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Standard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standards Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {standards.map((standard) => (
                  <tr key={standard.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{standard.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{standard.title}</td>
                    <td className="px-6 py-4">{standard.category}</td>
                    <td className="px-6 py-4">
                      <Badge variant={standard.status === 'active' ? 'success' : standard.status === 'draft' ? 'warning' : 'secondary'}>
                        {standard.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">Edit</button>
                        <button className="text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
