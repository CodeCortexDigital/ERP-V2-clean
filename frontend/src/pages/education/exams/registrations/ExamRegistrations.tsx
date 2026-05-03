import { useState } from 'react'
import { Users, Search, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'

interface Registration {
  id: number
  student_name: string
  student_id: string
  registration_date: string
  exam_name: string
  fee_status: 'paid' | 'pending' | 'waived'
  admit_card_generated: boolean
}

export default function ExamRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Registrations</h1>
          <p className="text-gray-500 mt-1">Manage student exam registrations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bulk Registration
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Registered</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fee Paid</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Fee</p>
                <p className="text-2xl font-bold text-orange-600">0</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admit Cards</p>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
              <Download className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search by student name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button variant="outline">Advanced Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Exam</th>
                  <th className="px-6 py-3">Registration Date</th>
                  <th className="px-6 py-3">Fee Status</th>
                  <th className="px-6 py-3">Admit Card</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{reg.student_id}</td>
                    <td className="px-6 py-4 font-medium">{reg.student_name}</td>
                    <td className="px-6 py-4">{reg.exam_name}</td>
                    <td className="px-6 py-4">{reg.registration_date}</td>
                    <td className="px-6 py-4">
                      <Badge variant={reg.fee_status === 'paid' ? 'success' : 'warning'}>
                        {reg.fee_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {reg.admit_card_generated ? (
                        <Badge variant="success">Generated</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Button size="sm" variant="outline">Generate Admit Card</Button>
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
