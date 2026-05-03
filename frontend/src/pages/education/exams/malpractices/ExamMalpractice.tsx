import { useState } from 'react'
import { AlertTriangle, FileText, Edit, Eye, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

interface MalpracticeCase {
  id: number
  student_name: string
  student_id: string
  exam_name: string
  date: string
  description: string
  status: 'reported' | 'investigating' | 'resolved' | 'dismissed'
  penalty: string
}

export default function ExamMalpractice() {
  const [cases, setCases] = useState<MalpracticeCase[]>([])
  const [showReportForm, setShowReportForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Malpractice</h1>
          <p className="text-gray-500 mt-1">Track and manage academic dishonesty cases</p>
        </div>
        <Button onClick={() => setShowReportForm(true)} className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Report Case
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Active Cases</p>
            <p className="text-2xl font-bold text-red-600">0</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Investigating</p>
            <p className="text-2xl font-bold text-yellow-600">0</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-2xl font-bold text-green-600">0</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Dismissed</p>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Malpractice Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Exam</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Penalty</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((case_) => (
                  <tr key={case_.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{case_.date}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{case_.student_name}</p>
                        <p className="text-xs">{case_.student_id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{case_.exam_name}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{case_.description}</td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        case_.status === 'reported' ? 'destructive' :
                        case_.status === 'investigating' ? 'warning' :
                        case_.status === 'resolved' ? 'success' : 'secondary'
                      }>
                        {case_.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{case_.penalty || '-'}</td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
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
