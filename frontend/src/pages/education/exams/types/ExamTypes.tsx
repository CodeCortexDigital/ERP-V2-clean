import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, FileText, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface ExamType {
  id: number
  name: string
  code: string
  weightage: number
  duration_minutes: number
  passing_percentage: number
  has_practical: boolean
  status: 'active' | 'inactive'
}

export default function ExamTypes() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch exam types from API
    fetchExamTypes()
  }, [])

  const fetchExamTypes = async () => {
    try {
      // API call will be implemented
      setLoading(false)
    } catch (error) {
      console.error('Error fetching exam types:', error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Types</h1>
          <p className="text-gray-500 mt-1">Define and manage examination types</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Exam Type
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Exam Types</p>
                <p className="text-2xl font-bold text-green-600">{examTypes.length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Types</p>
                <p className="text-2xl font-bold text-blue-600">
                  {examTypes.filter(t => t.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Duration</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(examTypes.reduce((acc, t) => acc + t.duration_minutes, 0) / (examTypes.length || 1))} min
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Passing %</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(examTypes.reduce((acc, t) => acc + t.passing_percentage, 0) / (examTypes.length || 1))}%
                </p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Type Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Weightage</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Passing %</th>
                  <th className="px-6 py-3">Practical</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {examTypes.map((type) => (
                  <tr key={type.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{type.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{type.name}</td>
                    <td className="px-6 py-4">{type.weightage}%</td>
                    <td className="px-6 py-4">{type.duration_minutes} min</td>
                    <td className="px-6 py-4">{type.passing_percentage}%</td>
                    <td className="px-6 py-4">
                      {type.has_practical ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={type.status === 'active' ? 'success' : 'secondary'}>
                        {type.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {examTypes.length === 0 && !loading && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No exam types defined</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
                Create First Exam Type
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predefined Exam Types Help */}
      <Card>
        <CardHeader>
          <CardTitle>Common Exam Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800">Mid Term</h3>
              <p className="text-sm text-green-600">Weightage: 30% | Duration: 120 min | Passing: 40%</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800">Final Term</h3>
              <p className="text-sm text-blue-600">Weightage: 50% | Duration: 180 min | Passing: 40%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-800">Quiz</h3>
              <p className="text-sm text-purple-600">Weightage: 10% | Duration: 30 min | Passing: 50%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
