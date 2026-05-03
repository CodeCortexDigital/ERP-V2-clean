import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Edit, Trash2, Calendar, Clock, Award } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Exam {
  id: number
  exam_code: string
  name: string
  course: string
  exam_date: string
  duration: string
  total_marks: number
  passing_marks: number
  venue: string
  status: 'upcoming' | 'ongoing' | 'completed'
}

// Sample exam data
const SAMPLE_EXAMS: Exam[] = [
  { id: 1, exam_code: 'MID-CS101', name: 'Mid Term Exam', course: 'Computer Science', exam_date: '2024-03-20', duration: '3 hours', total_marks: 100, passing_marks: 40, venue: 'Hall A', status: 'upcoming' },
  { id: 2, exam_code: 'FIN-MATH202', name: 'Final Exam', course: 'Mathematics', exam_date: '2024-03-25', duration: '3 hours', total_marks: 100, passing_marks: 40, venue: 'Hall B', status: 'upcoming' },
  { id: 3, exam_code: 'QUIZ-CS201', name: 'Quiz 1', course: 'Data Structures', exam_date: '2024-03-18', duration: '1 hour', total_marks: 20, passing_marks: 10, venue: 'Lab 1', status: 'completed' },
]

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>(SAMPLE_EXAMS)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Ensure exams is always an array
  const safeExams = exams || []

  const filteredExams = safeExams.filter((exam) => {
    if (!exam) return false
    const matchesSearch = exam.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exam.exam_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exam.course?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'All' || exam.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: safeExams.length,
    upcoming: safeExams.filter(e => e?.status === 'upcoming').length,
    ongoing: safeExams.filter(e => e?.status === 'ongoing').length,
    completed: safeExams.filter(e => e?.status === 'completed').length,
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      upcoming: 'bg-yellow-100 text-yellow-800',
      ongoing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100'
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading exams...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examinations</h1>
          <p className="text-gray-500">Manage exams, schedules, and results</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Exam
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Exams</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.upcoming}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Ongoing</p>
          <p className="text-2xl font-bold text-blue-600">{stats.ongoing}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-between">
        <div className="flex gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="All">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Exam Code</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Exam Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Course</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Duration</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Marks</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Venue</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredExams.map((exam) => (
              <tr key={exam.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono">{exam.exam_code}</td>
                <td className="px-4 py-3 text-sm font-medium">{exam.name}</td>
                <td className="px-4 py-3 text-sm">{exam.course}</td>
                <td className="px-4 py-3 text-sm">{exam.exam_date}</td>
                <td className="px-4 py-3 text-sm">{exam.duration}</td>
                <td className="px-4 py-3 text-sm text-center">{exam.total_marks}</td>
                <td className="px-4 py-3 text-sm">{exam.venue}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusBadge(exam.status)}`}>
                    {exam.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <div className="flex justify-center gap-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-800">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
