import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'

const SUBJECT_COVERAGE = [
  { subject: 'Mathematics', completed: 85, units: '5/6' },
  { subject: 'English', completed: 72, units: '7/10' },
  { subject: 'Physics', completed: 60, units: '3/5' },
  { subject: 'Chemistry', completed: 68, units: '4/6' },
  { subject: 'Biology', completed: 78, units: '7/9' },
]

export default function CoverageDashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/education/progress')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coverage Dashboard</h1>
          <p className="text-gray-500">Track syllabus completion and coverage gaps across subjects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <CardTitle className="text-base">Overall Coverage</CardTitle>
          <p className="mt-2 text-3xl font-bold text-blue-700">72%</p>
          <p className="text-sm text-gray-500">Average syllabus completion across tracked subjects.</p>
        </Card>
        <Card className="p-4">
          <CardTitle className="text-base">On Schedule</CardTitle>
          <p className="mt-2 text-3xl font-bold text-emerald-700">4</p>
          <p className="text-sm text-gray-500">Subjects that are meeting planned coverage.</p>
        </Card>
        <Card className="p-4">
          <CardTitle className="text-base">Behind Schedule</CardTitle>
          <p className="mt-2 text-3xl font-bold text-amber-700">2</p>
          <p className="text-sm text-gray-500">Subjects needing extra revision or plan updates.</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SUBJECT_COVERAGE.map((item) => (
            <div key={item.subject} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{item.subject}</p>
                  <p className="text-xs text-gray-500">Units covered: {item.units}</p>
                </div>
                <Badge variant={item.completed >= 75 ? 'success' : item.completed >= 60 ? 'warning' : 'secondary'}>
                  {item.completed}%
                </Badge>
              </div>
              <Progress value={item.completed} className="h-3 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <Layers className="w-4 h-4" />
          <span>Priority focus: Physics and Chemistry require adjusted pacing over the next two weeks.</span>
        </div>
      </div>
    </div>
  )
}
