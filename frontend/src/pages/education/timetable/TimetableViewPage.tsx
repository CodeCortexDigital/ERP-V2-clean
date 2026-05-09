import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface Period {
  id: number
  period_number: number
  start_time: string
  end_time: string
  subject?: string
  teacher?: string
  room?: string
}

interface DaySchedule {
  day: string
  periods: Period[]
}

const SAMPLE_CLASS_SCHEDULE: DaySchedule[] = [
  {
    day: 'Monday',
    periods: [
      { id: 1, period_number: 1, start_time: '08:00', end_time: '08:45', subject: 'English', teacher: 'Prof. Sara Khan', room: 'A-101' },
      { id: 2, period_number: 2, start_time: '08:45', end_time: '09:30', subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'A-102' },
      { id: 3, period_number: 3, start_time: '09:30', end_time: '10:15', subject: 'Physics', teacher: 'Mr. Hassan Ali', room: 'Lab-01' },
      { id: 4, period_number: 4, start_time: '10:15', end_time: '11:00', subject: 'Break', teacher: '-', room: '-' },
      { id: 5, period_number: 5, start_time: '11:00', end_time: '11:45', subject: 'Chemistry', teacher: 'Ms. Fatima Khan', room: 'Lab-02' },
      { id: 6, period_number: 6, start_time: '11:45', end_time: '12:30', subject: 'Biology', teacher: 'Dr. Usman Malik', room: 'Lab-03' },
      { id: 7, period_number: 7, start_time: '12:30', end_time: '13:15', subject: 'Islamiyat', teacher: 'Mr. Farooq', room: 'A-105' },
      { id: 8, period_number: 8, start_time: '13:15', end_time: '14:00', subject: 'P.E', teacher: 'Mr. Tariq', room: 'Ground' },
    ],
  },
  {
    day: 'Tuesday',
    periods: [
      { id: 9, period_number: 1, start_time: '08:00', end_time: '08:45', subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'A-102' },
      { id: 10, period_number: 2, start_time: '08:45', end_time: '09:30', subject: 'English', teacher: 'Prof. Sara Khan', room: 'A-101' },
      { id: 11, period_number: 3, start_time: '09:30', end_time: '10:15', subject: 'Chemistry', teacher: 'Ms. Fatima Khan', room: 'Lab-02' },
      { id: 12, period_number: 4, start_time: '10:15', end_time: '11:00', subject: 'Break', teacher: '-', room: '-' },
      { id: 13, period_number: 5, start_time: '11:00', end_time: '11:45', subject: 'Physics', teacher: 'Mr. Hassan Ali', room: 'Lab-01' },
      { id: 14, period_number: 6, start_time: '11:45', end_time: '12:30', subject: 'Biology', teacher: 'Dr. Usman Malik', room: 'Lab-03' },
      { id: 15, period_number: 7, start_time: '12:30', end_time: '13:15', subject: 'Urdu', teacher: 'Mrs. Ayesha', room: 'A-103' },
      { id: 16, period_number: 8, start_time: '13:15', end_time: '14:00', subject: 'Computer Science', teacher: 'Mr. Imran', room: 'Lab-04' },
    ],
  },
]

const SAMPLE_TEACHER_SCHEDULE: DaySchedule[] = [
  {
    day: 'Monday',
    periods: [
      { id: 1, period_number: 1, start_time: '08:00', end_time: '08:45', subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'A-102' },
      { id: 2, period_number: 2, start_time: '08:45', end_time: '09:30', subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'B-102' },
      { id: 3, period_number: 3, start_time: '09:30', end_time: '10:15', subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'C-102' },
      { id: 5, period_number: 5, start_time: '11:00', end_time: '11:45', subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'A-102' },
      { id: 6, period_number: 6, start_time: '11:45', end_time: '12:30', subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'D-102' },
    ],
  },
]

export default function TimetableViewPage() {
  const navigate = useNavigate()
  const [viewType, setViewType] = useState<'class' | 'teacher'>('class')

  const schedule = viewType === 'class' ? SAMPLE_CLASS_SCHEDULE : SAMPLE_TEACHER_SCHEDULE

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/education/timetable')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable View</h1>
          <p className="text-gray-500">Class 9-A • {viewType === 'class' ? 'Class-wise View' : 'Teacher-wise View'}</p>
        </div>
      </div>

      <Tabs defaultValue="class" className="space-y-4" onValueChange={(v) => setViewType(v as 'class' | 'teacher')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="class">
            <BookOpen className="h-4 w-4 mr-2" />
            Class-wise View
          </TabsTrigger>
          <TabsTrigger value="teacher">
            <Users className="h-4 w-4 mr-2" />
            Teacher-wise View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="class" className="space-y-4">
          {schedule.map((day) => (
            <Card key={day.day}>
              <CardHeader className="bg-blue-50 rounded-t-lg">
                <CardTitle className="text-lg text-blue-900">{day.day}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Period</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Subject</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Teacher</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.periods.map((period, idx) => (
                        <tr key={period.id} className={`border-t ${period.subject === 'Break' ? 'bg-yellow-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 font-medium text-slate-900">{period.period_number}</td>
                          <td className="px-4 py-3 text-slate-900">{period.start_time} - {period.end_time}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{period.subject}</td>
                          <td className="px-4 py-3 text-slate-900">{period.teacher}</td>
                          <td className="px-4 py-3 text-slate-900">{period.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="teacher" className="space-y-4">
          {schedule.map((day) => (
            <Card key={day.day}>
              <CardHeader className="bg-purple-50 rounded-t-lg">
                <CardTitle className="text-lg text-purple-900">{day.day}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Period</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Class</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Subject</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.periods.map((period, idx) => (
                        <tr key={period.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 font-medium text-slate-900">{period.period_number}</td>
                          <td className="px-4 py-3 text-slate-900">{period.start_time} - {period.end_time}</td>
                          <td className="px-4 py-3 text-slate-900">Class 9-A</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{period.subject}</td>
                          <td className="px-4 py-3 text-slate-900">{period.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/education/timetable')}>
          Back
        </Button>
      </div>
    </div>
  )
}
