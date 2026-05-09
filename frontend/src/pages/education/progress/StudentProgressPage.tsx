import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserCheck, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'

const STUDENT_PROGRESS = [
  { name: 'Aisha Tariq', student_id: 'STD-101', progress: 82, attendance: 95, status: 'On Track' },
  { name: 'Zain Ali', student_id: 'STD-102', progress: 68, attendance: 88, status: 'Needs Support' },
  { name: 'Fatima Noor', student_id: 'STD-103', progress: 91, attendance: 98, status: 'Excellent' },
  { name: 'Hamza Sheikh', student_id: 'STD-104', progress: 74, attendance: 92, status: 'Improving' },
]

export default function StudentProgressPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/education/progress')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Progress</h1>
          <p className="text-gray-500">Individual student performance and progress tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <CardTitle className="text-base">Average Progress</CardTitle>
          <p className="mt-2 text-3xl font-bold text-blue-700">79%</p>
          <p className="text-sm text-gray-500">Average completion across selected students.</p>
        </Card>
        <Card className="p-4">
          <CardTitle className="text-base">High Achievers</CardTitle>
          <p className="mt-2 text-3xl font-bold text-emerald-700">1</p>
          <p className="text-sm text-gray-500">Students above 90% progress.</p>
        </Card>
        <Card className="p-4">
          <CardTitle className="text-base">Intervention</CardTitle>
          <p className="mt-2 text-3xl font-bold text-amber-700">2</p>
          <p className="text-sm text-gray-500">Students needing additional support.</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Progress List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {STUDENT_PROGRESS.map((student) => (
            <div key={student.student_id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.student_id}</p>
                </div>
                <div className="space-y-2 w-full md:w-1/2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{student.progress}%</span>
                  </div>
                  <Progress value={student.progress} className="h-2 rounded-full" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">Attendance</p>
                  <p className="text-xs text-gray-500">{student.attendance}%</p>
                </div>
                <Badge variant={student.status === 'Excellent' ? 'success' : student.status === 'On Track' ? 'secondary' : 'warning'}>
                  {student.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <TrendingUp className="w-4 h-4" />
          <span>Focus on targeted review sessions for students below 75% progress.</span>
        </div>
      </div>
    </div>
  )
}
