import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'

interface Period {
  id: number
  period_number: number
  name: string
  start_time: string
  end_time: string
  duration_minutes: number
  break_period: boolean
  description?: string
}

const SAMPLE_PERIODS: Period[] = [
  { id: 1, period_number: 1, name: 'Period 1', start_time: '08:00', end_time: '08:45', duration_minutes: 45, break_period: false },
  { id: 2, period_number: 2, name: 'Period 2', start_time: '08:45', end_time: '09:30', duration_minutes: 45, break_period: false },
  { id: 3, period_number: 3, name: 'Period 3', start_time: '09:30', end_time: '10:15', duration_minutes: 45, break_period: false },
  { id: 4, period_number: 4, name: 'Morning Break', start_time: '10:15', end_time: '11:00', duration_minutes: 45, break_period: true, description: 'Morning recess' },
  { id: 5, period_number: 5, name: 'Period 5', start_time: '11:00', end_time: '11:45', duration_minutes: 45, break_period: false },
  { id: 6, period_number: 6, name: 'Period 6', start_time: '11:45', end_time: '12:30', duration_minutes: 45, break_period: false },
  { id: 7, period_number: 7, name: 'Period 7', start_time: '12:30', end_time: '13:15', duration_minutes: 45, break_period: false },
  { id: 8, period_number: 8, name: 'Lunch Break', start_time: '13:15', end_time: '14:00', duration_minutes: 45, break_period: true, description: 'Lunch and prayer time' },
]

export default function PeriodManagementPage() {
  const navigate = useNavigate()
  const [periods, setPeriods] = useState(SAMPLE_PERIODS)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  const [showForm, setShowForm] = useState(false)

  const handleDelete = (id: number) => {
    setPeriods(periods.filter(p => p.id !== id))
    toast.success('Period deleted successfully')
  }

  const handleEdit = (period: Period) => {
    setEditingPeriod(period)
    setShowForm(true)
  }

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    return endMinutes - startMinutes
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/education/timetable')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Period Management</h1>
          <p className="text-gray-500">Configure school periods and timing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{periods.length}</p>
          <p className="text-xs text-gray-600">Total Periods</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-700">{periods.filter(p => !p.break_period).length}</p>
          <p className="text-xs text-gray-600">Class Periods</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-700">{periods.filter(p => p.break_period).length}</p>
          <p className="text-xs text-gray-600">Break Periods</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-700">08:00 - 14:00</p>
          <p className="text-xs text-gray-600">School Hours</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Periods Configuration</h2>
        <Button onClick={() => { setEditingPeriod(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Period
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {periods.map((period) => (
          <Card key={period.id} className={`${period.break_period ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{period.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Period {period.period_number}</p>
                </div>
                {period.break_period && (
                  <Badge variant="warning" className="ml-2">Break</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Start Time</p>
                  <p className="font-mono text-sm font-semibold">{period.start_time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">End Time</p>
                  <p className="font-mono text-sm font-semibold">{period.end_time}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-semibold">{period.duration_minutes} minutes</p>
              </div>
              {period.description && (
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm">{period.description}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => handleEdit(period)} className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(period.id)} className="flex-1 text-red-600 hover:text-red-700">
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/education/timetable')}>
          Back
        </Button>
      </div>
    </div>
  )
}
