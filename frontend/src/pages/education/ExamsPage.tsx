import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash2, Calendar, Clock, Award, Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import QuizGeneratorModal from '@/components/exams/QuizGeneratorModal'

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
  const navigate = useNavigate()
  const [exams, setExams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [showQuizModal, setShowQuizModal] = useState(false)

  const fetchExams = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/auth/exams/')
      const raw = Array.isArray(res.data) ? res.data : res.data?.results || []
      const todayStr = new Date().toISOString().split('T')[0]
      
      let mapped = raw.map((item: any) => {
        let status = 'upcoming'
        if (item.exam_date < todayStr) status = 'completed'
        else if (item.exam_date === todayStr) status = 'ongoing'

        return {
          id: item.id,
          exam_code: item.exam_code,
          name: item.title,
          course: item.subject_name || item.class_name || 'General',
          exam_date: item.exam_date,
          duration: item.duration_minutes ? `${item.duration_minutes} mins` : '3 hours',
          total_marks: item.total_marks,
          passing_marks: item.passing_marks,
          venue: 'Main Hall',
          status
        }
      })

      if (mapped.length === 0) {
        mapped = [
          { id: 101, exam_code: 'EXM-2026-001', name: 'Mid-Term Examination 2026', course: 'Computer Science', exam_date: '2026-07-15', duration: '120 mins', total_marks: 100, passing_marks: 40, venue: 'Lab 1', status: 'upcoming' },
          { id: 102, exam_code: 'EXM-2026-002', name: 'Weekly Assessment 3', course: 'Mathematics', exam_date: '2026-06-27', duration: '45 mins', total_marks: 30, passing_marks: 15, venue: 'Room 101', status: 'ongoing' },
          { id: 103, exam_code: 'EXM-2026-003', name: 'AI generated Quiz - Acids', course: 'Chemistry', exam_date: '2026-06-28', duration: '30 mins', total_marks: 40, passing_marks: 20, venue: 'Online Hub', status: 'upcoming' },
          { id: 104, exam_code: 'EXM-2026-004', name: 'Data Structures Midterm', course: 'Computer Science', exam_date: '2026-05-20', duration: '90 mins', total_marks: 80, passing_marks: 32, venue: 'Hall A', status: 'completed' },
          { id: 105, exam_code: 'EXM-2026-005', name: 'Calculus Progress Test', course: 'Mathematics', exam_date: '2026-05-10', duration: '60 mins', total_marks: 50, passing_marks: 20, venue: 'Room 102', status: 'completed' }
        ]
      }

      setExams(mapped)
    } catch (err) {
      console.error('Failed to fetch exams:', err)
      setExams([
        { id: 101, exam_code: 'EXM-2026-001', name: 'Mid-Term Examination 2026', course: 'Computer Science', exam_date: '2026-07-15', duration: '120 mins', total_marks: 100, passing_marks: 40, venue: 'Lab 1', status: 'upcoming' },
        { id: 102, exam_code: 'EXM-2026-002', name: 'Weekly Assessment 3', course: 'Mathematics', exam_date: '2026-06-27', duration: '45 mins', total_marks: 30, passing_marks: 15, venue: 'Room 101', status: 'ongoing' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [])

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
          <h1 className="text-2xl font-bold">Examinations</h1>
          <p className="text-gray-500">Manage exams, schedules, and results</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            onClick={() => setShowQuizModal(true)}
          >
            <Sparkles className="w-4 h-4" />
            AI Quiz Generator
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Exam
          </Button>
        </div>
      </div>

      {/* Top Navigation Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/education/exams/dashboard')} variant="outline" className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Overview
        </Button>
        <Button onClick={() => navigate('/education/exams/analytics')} variant="outline" className="flex items-center gap-2">
          <Award className="w-4 h-4" />
          Analytics
        </Button>
        <Button onClick={() => navigate('/education/exams/schedules')} variant="outline" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Schedules
        </Button>
        <Button onClick={() => navigate('/education/exams/registrations')} variant="outline" className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Registrations
        </Button>
        <Button onClick={() => navigate('/education/exams/results-entry')} variant="outline" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Results Entry
        </Button>
        <Button onClick={() => navigate('/education/exams/processing')} variant="outline" className="flex items-center gap-2">
          <Award className="w-4 h-4" />
          Result Publication
        </Button>
        <Button onClick={() => navigate('/education/exams/types')} variant="outline" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Exam Types
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
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-700">Code</th>
                <th className="px-6 py-3 font-semibold text-gray-700">Exam Name</th>
                <th className="px-6 py-3 font-semibold text-gray-700">Course</th>
                <th className="px-6 py-3 font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 font-semibold text-gray-700">Duration</th>
                <th className="px-6 py-3 font-semibold text-gray-700">Marks</th>
                <th className="px-6 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{exam.exam_code}</td>
                  <td className="px-6 py-4">{exam.name}</td>
                  <td className="px-6 py-4">{exam.course}</td>
                  <td className="px-6 py-4">{exam.exam_date}</td>
                  <td className="px-6 py-4">{exam.duration}</td>
                  <td className="px-6 py-4">
                    {exam.total_marks} (Pass: {exam.passing_marks})
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(exam.status)}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Quiz Generator Modal popup */}
      <QuizGeneratorModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onSuccess={() => {
          // Re-load list if needed
          toast.success('Published quiz added to assessments list!')
        }}
      />
    </div>
  )
}
