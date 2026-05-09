import { useNavigate } from 'react-router-dom'
import { BookOpen, BarChart3, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function ProgressTrackingPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="text-gray-500">Lesson planning, syllabus coverage and student progress insights</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button onClick={() => navigate('/education/progress/lesson-planner')}>Lesson Planner</Button>
          <Button onClick={() => navigate('/education/progress/coverage')}>Coverage Dashboard</Button>
          <Button onClick={() => navigate('/education/progress/students')}>Student Progress</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lesson Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Create and schedule daily or weekly lesson plans with curriculum mapping.</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <BookOpen className="h-4 w-4" />
              <span>18 weekly lesson plans</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Visualize syllabus completion across classes and subjects.</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <BarChart3 className="h-4 w-4" />
              <span>72% of syllabus completed</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Track individual student performance, progress and intervention needs.</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <Users className="h-4 w-4" />
              <span>24 students under review</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Lesson Plans this week</span>
              <Badge variant="secondary">24 planned</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Coverage rate</span>
              <Badge variant="success">72%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Students on track</span>
              <Badge variant="success">68%</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">Lesson plan review due</p>
              <p className="text-sm text-gray-500">Review daily plans for Class 9-A before Monday.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">Coverage gap</p>
              <p className="text-sm text-gray-500">Physics unit 3 is behind schedule by 12%.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
