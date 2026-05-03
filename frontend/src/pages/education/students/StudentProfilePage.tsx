import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  User, Mail, Phone, Calendar, BookOpen, 
  CheckCircle, XCircle, Clock, DollarSign,
  FileText, MessageSquare, TrendingUp, Award,
  Eye, Download, RefreshCw, ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import api from '@/services/api'

interface StudentData {
  student: {
    id: string
    student_id: string
    full_name: string
    email: string
    phone: string
    father_name: string
    mother_name: string
    guardian_phone: string
    enrollment_date: string
    program: string
    current_semester: number
    is_active: boolean
  }
  attendance: {
    total: number
    present: number
    absent: number
    late: number
    attendance_rate: number
  }
  exams: {
    total_exams: number
    passed: number
    average_percentage: number
    results: Array<{
      exam_title: string
      marks: string
      percentage: number
      grade: string
      status: string
    }>
  }
  finance: {
    total_invoices: number
    total_amount: number
    total_paid: number
    balance_due: number
    overdue: number
  }
  recent_notifications: Array<{
    title: string
    message: string
    sent_at: string
  }>
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchStudentData()
  }, [id])

  const fetchStudentData = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/education/students/student-dashboard/${id}/`)
      setStudent(response.data)
    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading student profile...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Student not found</p>
        <Button onClick={() => navigate('/education/students')} className="mt-4">
          Back to Students
        </Button>
      </div>
    )
  }

  const attendanceRate = student.attendance.attendance_rate || 0
  const averagePercentage = student.exams.average_percentage || 0
  const balanceDue = student.finance.balance_due || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/education/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              {student.student.full_name}
            </h1>
            <p className="text-gray-500">Student ID: {student.student.student_id}</p>
          </div>
        </div>
        <Button onClick={fetchStudentData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Attendance Rate</p>
                <p className="text-2xl font-bold text-green-600">{attendanceRate}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <Progress value={attendanceRate} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Marks</p>
                <p className="text-2xl font-bold text-blue-600">{averagePercentage}%</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {student.exams.passed} passed / {student.exams.total_exams} exams
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fee Balance</p>
                <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${balanceDue.toFixed(2)}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Paid: ${student.finance.total_paid.toFixed(2)} / ${student.finance.total_amount.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue Fees</p>
                <p className="text-2xl font-bold text-orange-600">{student.finance.overdue}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="exams">Exams & Results</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Student ID: {student.student.student_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{student.student.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{student.student.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Enrolled: {student.student.enrollment_date || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Program: {student.student.program || 'Not assigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={student.student.is_active ? 'success' : 'secondary'}>
                    {student.student.is_active ? 'Active Student' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guardian Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Father: {student.student.father_name || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Mother: {student.student.mother_name || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Guardian Phone: {student.student.guardian_phone || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {student.recent_notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent notifications</p>
              ) : (
                <div className="space-y-3">
                  {student.recent_notifications.map((notif, idx) => (
                    <div key={idx} className="border-b pb-3 last:border-0">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{notif.title}</span>
                        <span className="text-xs text-gray-400 ml-auto">{notif.sent_at?.split('T')[0]}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Present</p>
                  <p className="text-3xl font-bold text-green-600">{student.attendance.present}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Absent</p>
                  <p className="text-3xl font-bold text-red-600">{student.attendance.absent}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Late</p>
                  <p className="text-3xl font-bold text-orange-600">{student.attendance.late}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Overall Attendance Rate</p>
                <div className="flex items-center gap-4 justify-center">
                  <Progress value={attendanceRate} className="w-64" />
                  <span className="text-2xl font-bold text-green-600">{attendanceRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams Tab */}
        <TabsContent value="exams">
          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Exam</th>
                      <th className="px-4 py-3 text-center">Marks</th>
                      <th className="px-4 py-3 text-center">Percentage</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.exams.results.map((result, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-3">{result.exam_title}</td>
                        <td className="px-4 py-3 text-center">{result.marks}</td>
                        <td className="px-4 py-3 text-center">{result.percentage}%</td>
                        <td className="px-4 py-3 text-center font-bold">{result.grade}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={result.status === 'Pass' ? 'success' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Invoices</span>
                    <span className="font-bold">{student.finance.total_invoices}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold">${student.finance.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-bold text-green-600">${student.finance.total_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Balance Due</span>
                    <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${balanceDue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Overdue Invoices</span>
                    <span className="font-bold text-orange-600">{student.finance.overdue}</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Payment Status</p>
                  <Progress value={(student.finance.total_paid / student.finance.total_amount) * 100} className="h-3" />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {Math.round((student.finance.total_paid / student.finance.total_amount) * 100)}% Paid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
