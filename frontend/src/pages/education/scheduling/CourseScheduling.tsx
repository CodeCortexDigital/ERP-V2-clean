import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface CourseSchedule {
  id: number
  course_code: string
  course_name: string
  instructor: string
  day: string
  start_time: string
  end_time: string
  room: string
  capacity: number
  enrolled: number
  semester: string
  status: 'active' | 'cancelled' | 'full'
}

const SAMPLE_SCHEDULES: CourseSchedule[] = [
  { id: 1, course_code: 'CS101', course_name: 'Programming Fundamentals', instructor: 'Dr. Ahmed Raza', day: 'Monday', start_time: '09:00', end_time: '10:30', room: 'Room 101', capacity: 40, enrolled: 35, semester: 'Spring 2024', status: 'active' },
  { id: 2, course_code: 'CS102', course_name: 'Data Structures', instructor: 'Dr. Ahmed Raza', day: 'Wednesday', start_time: '11:00', end_time: '12:30', room: 'Lab 2', capacity: 30, enrolled: 28, semester: 'Spring 2024', status: 'active' },
]

export default function CourseScheduling() {
  const [schedules, setSchedules] = useState(SAMPLE_SCHEDULES)
  const [selectedDay, setSelectedDay] = useState('All')
  const days = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Course Scheduling</h1><p className="text-gray-500">Manage class schedules and room assignments</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Schedule</Button></div>
      <div className="flex gap-4"><select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="px-4 py-2 border rounded-lg bg-white text-sm">{days.map(day => <option key={day} value={day}>{day}</option>)}</select></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th>Course Code</th><th>Course Name</th><th>Instructor</th><th>Day</th><th>Time</th><th>Room</th><th>Enrollment</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{schedules.map(s => (<tr key={s.id} className="border-t"><td className="px-4 py-3 font-mono">{s.course_code}</td><td className="px-4 py-3 font-medium">{s.course_name}</td><td className="px-4 py-3">{s.instructor}</td><td className="px-4 py-3">{s.day}</td><td className="px-4 py-3">{s.start_time} - {s.end_time}</td><td className="px-4 py-3"><div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.room}</div></td><td className="px-4 py-3">{s.enrolled}/{s.capacity} ({Math.round((s.enrolled/s.capacity)*100)}%)</td><td className="px-4 py-3"><Badge variant={s.status === 'active' ? 'success' : 'warning'}>{s.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
