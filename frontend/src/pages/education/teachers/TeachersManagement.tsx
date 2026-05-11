import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash2, Mail, Phone, BookOpen, Calendar, Award } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import teacherService, { Teacher } from '@/services/teacher.service'

export default function TeachersManagement() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      const response = await teacherService.getAll()
      setTeachers(response.data)
    } catch (error) {
      console.error('Error loading teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTeachers = useMemo(() => {
    if (!searchQuery) return teachers
    const term = searchQuery.toLowerCase()
    return teachers.filter((teacher) =>
      teacher.teacher_id.toLowerCase().includes(term) ||
      teacher.first_name.toLowerCase().includes(term) ||
      teacher.last_name.toLowerCase().includes(term) ||
      teacher.department.toLowerCase().includes(term) ||
      teacher.specialization.toLowerCase().includes(term)
    )
  }, [searchQuery, teachers])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers Management</h1>
          <p className="text-gray-500">Manage faculty and teaching staff</p>
        </div>
        <Button onClick={() => navigate('/education/teachers/add')}>
          <Plus className="h-4 w-4 mr-2" />Add Teacher
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-1/2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teachers"
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Teacher ID</th>
              <th className="px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 font-medium text-gray-700">Department</th>
              <th className="px-4 py-3 font-medium text-gray-700">Specialization</th>
              <th className="px-4 py-3 font-medium text-gray-700">Qualification</th>
              <th className="px-4 py-3 font-medium text-gray-700">Courses</th>
              <th className="px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-slate-900">{t.teacher_id}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {t.first_name} {t.last_name}
                  <br />
                  <span className="text-xs text-gray-500">{t.email}</span>
                </td>
                <td className="px-4 py-3 text-slate-900">{t.department}</td>
                <td className="px-4 py-3 text-slate-900">{t.specialization}</td>
                <td className="px-4 py-3 text-slate-900">{t.qualification}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {t.courses.map((c) => (
                      <Badge key={c} variant="outline">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={t.status === 'active' ? 'success' : t.status === 'on_leave' ? 'warning' : 'secondary'}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/education/teachers/${t.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/education/teachers/${t.id}`)}>
                      <BookOpen className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/education/teachers/${t.id}`)}>
                      <Calendar className="h-4 w-4" />
                    </Button>
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
