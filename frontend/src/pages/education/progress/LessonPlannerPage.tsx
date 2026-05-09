import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const SAMPLE_PLANS = [
  { day: 'Monday', subject: 'Mathematics', topic: 'Quadratic Equations', objective: 'Practice solving equations', status: 'Ready' },
  { day: 'Tuesday', subject: 'English', topic: 'Comprehension', objective: 'Analyze passage', status: 'Draft' },
  { day: 'Wednesday', subject: 'Physics', topic: 'Motion', objective: 'Discuss Newton laws', status: 'Ready' },
  { day: 'Thursday', subject: 'Chemistry', topic: 'Acids and Bases', objective: 'Review neutralization', status: 'Planned' },
  { day: 'Friday', subject: 'Biology', topic: 'Plant Cells', objective: 'Label cell parts', status: 'Planned' },
]

export default function LessonPlannerPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState(SAMPLE_PLANS)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/education/progress')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lesson Planner</h1>
          <p className="text-gray-500">Daily and weekly lesson plan editor for classroom delivery.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2 sm:grid-cols-3">
          <Card className="p-4">
            <CardTitle className="text-base">Next lesson</CardTitle>
            <p className="mt-2 text-sm text-gray-600">Mathematics: Quadratic Equations</p>
          </Card>
          <Card className="p-4">
            <CardTitle className="text-base">Weekly objectives</CardTitle>
            <p className="mt-2 text-sm text-gray-600">5 lessons planned for next week</p>
          </Card>
          <Card className="p-4">
            <CardTitle className="text-base">Status</CardTitle>
            <Badge variant="success">72% complete</Badge>
          </Card>
        </div>
        <Button onClick={() => navigate('/education/progress/coverage')}>
          <Plus className="h-4 w-4 mr-2" />Add Lesson Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {WEEK_DAYS.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {day}
                <Badge variant="secondary">{plans.filter((p) => p.day === day).length} plans</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.filter((plan) => plan.day === day).map((plan, index) => (
                <div key={`${day}-${index}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{plan.subject}</p>
                      <p className="text-xs text-gray-500">{plan.topic}</p>
                    </div>
                    <Badge variant={plan.status === 'Ready' ? 'success' : plan.status === 'Draft' ? 'warning' : 'secondary'}>
                      {plan.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Objective: {plan.objective}</p>
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Pencil className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
