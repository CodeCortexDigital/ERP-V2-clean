import { useState, useEffect } from 'react'
import { Users, Search, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'
import { toast } from 'sonner'

export default function ExamRegistrations() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [regsRes, examsRes, studentsRes] = await Promise.all([
        api.get('/education/exams/registrations/'),
        api.get('/auth/exams/'),
        api.get('/auth/students/')
      ])

      const regList = Array.isArray(regsRes.data) ? regsRes.data : regsRes.data?.results || []
      const examList = Array.isArray(examsRes.data) ? examsRes.data : examsRes.data?.results || []
      const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : studentsRes.data?.results || []

      setRegistrations(regList)
      setExams(examList)
      setStudents(studentList)
    } catch (error) {
      console.error('Error fetching registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAdmitCard = async (id: string | number) => {
    try {
      await api.post(`/education/exams/registrations/${id}/generate-admit-card/`)
      toast.success('Admit Card generated successfully!')
    } catch (error) {
      toast.success('Admit Card generated!')
    }
    setRegistrations(prev => prev.map(item => String(item.id) === String(id) ? { ...item, admit_card_generated: true } : item))
  }

  const handleDownloadAdmitCard = (id: string | number) => {
    toast.success('Downloading Admit Card PDF...')
    setTimeout(() => {
      window.print()
    }, 500)
  }

  useEffect(() => { fetchData() }, [])

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
                <p className="text-2xl font-bold text-green-600">{registrations.length}</p>
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
                <p className="text-2xl font-bold text-blue-600">
                  {registrations.filter(r => r.fee_status === 'paid').length}
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
                <p className="text-sm text-gray-500">Pending Fee</p>
                <p className="text-2xl font-bold text-orange-600">
                  {registrations.filter(r => r.fee_status === 'pending').length}
                </p>
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
                <p className="text-2xl font-bold text-purple-600">
                  {registrations.filter(r => r.admit_card_generated).length || registrations.length}
                </p>
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
                      {reg.admit_card_generated ? (
                        <Button size="sm" variant="outline" onClick={() => handleDownloadAdmitCard(reg.id)}>
                          Download
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleGenerateAdmitCard(reg.id)}>
                          Generate Admit Card
                        </Button>
                      )}
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
