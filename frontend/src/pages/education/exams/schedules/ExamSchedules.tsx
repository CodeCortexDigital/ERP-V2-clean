import { useState } from 'react'
import { Plus, Calendar, Clock, MapPin, Edit, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface ExamSchedule {
  id: number
  exam_name: string
  course_code: string
  course_name: string
  date: string
  start_time: string
  end_time: string
  room: string
  invigilator: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
}

export default function ExamSchedules() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([])
  const [selectedDate, setSelectedDate] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Schedules</h1>
          <p className="text-gray-500 mt-1">Create and manage examination timetables</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Schedule
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Filter by Date</Label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button variant="outline">Apply Filter</Button>
            <Button variant="ghost">Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle>Examination Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Exam Name</th>
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Invigilator</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{schedule.date}</td>
                    <td className="px-6 py-4">{schedule.start_time} - {schedule.end_time}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{schedule.course_code}</p>
                        <p className="text-xs">{schedule.course_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{schedule.exam_name}</td>
                    <td className="px-6 py-4">{schedule.room}</td>
                    <td className="px-6 py-4">{schedule.invigilator}</td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        schedule.status === 'scheduled' ? 'default' :
                        schedule.status === 'ongoing' ? 'warning' :
                        schedule.status === 'completed' ? 'success' : 'destructive'
                      }>
                        {schedule.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {schedules.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No exam schedules created</p>
              <Button variant="outline" className="mt-3">Create First Schedule</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly View */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{day}</p>
                <p className="text-xs text-gray-500 mt-1">0 exams</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
