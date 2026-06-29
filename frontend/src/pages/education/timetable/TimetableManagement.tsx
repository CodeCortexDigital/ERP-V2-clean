import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Clock, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { toast } from 'sonner'
import api from '@/services/api'
import academicService from '@/services/academic.service'
import teacherService from '@/services/teacher.service'
import { useAuth } from '@/contexts/AuthContext'

export default function TimetableManagement() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser

  const [classes, setClasses] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [timetableEntries, setTimetableEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'class' | 'teacher'>('class')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [classesRes, teachersRes, classSubjectsRes, entriesRes] = await Promise.all([
        academicService.getClasses().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] })),
        academicService.getClassSubjects().catch(() => ({ data: [] })),
        academicService.getAllTimetableEntries().catch(() => ({ data: [] }))
      ])

      const classesList = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any)?.results || []
      const teachersList = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data as any)?.results || []
      const classSubjectsList = Array.isArray(classSubjectsRes.data) ? classSubjectsRes.data : (classSubjectsRes.data as any)?.results || []
      const entriesList = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data as any)?.results || []

      setClasses(classesList)
      setTeachers(teachersList)
      setClassSubjects(classSubjectsList)
      setTimetableEntries(entriesList)
    } catch (err) {
      console.error('Error fetching timetable management data:', err)
      toast.error('Failed to load timetables')
    } finally {
      setLoading(false)
    }
  }

  // Calculate scheduled period counts for each class
  const classSchedules = useMemo(() => {
    return classes.map((cls) => {
      const clsSubjectIds = classSubjects
        .filter((cs) => cs.class_ref === cls.id || cs.class_ref?.name?.toLowerCase() === cls.name?.toLowerCase())
        .map((cs) => cs.id)
      
      const scheduledEntries = timetableEntries.filter((entry) => 
        clsSubjectIds.includes(entry.class_subject) ||
        (entry.class_name && cls.name && entry.class_name.toLowerCase().trim() === cls.name.toLowerCase().trim())
      )

      return {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        total_periods: scheduledEntries.length,
        status: scheduledEntries.length > 0 ? 'active' as const : 'draft' as const,
        last_modified: scheduledEntries.length > 0 ? 'Recently updated' : 'Not configured'
      }
    })
  }, [classes, classSubjects, timetableEntries])

  // Calculate scheduled period counts for each teacher
  const teacherSchedules = useMemo(() => {
    return teachers.map((t) => {
      const scheduledEntries = timetableEntries.filter((entry) => 
        String(entry.teacher) === String(t.id) ||
        (entry.teacher_name && t.full_name && entry.teacher_name.toLowerCase() === t.full_name.toLowerCase())
      )

      return {
        id: t.id,
        name: t.full_name,
        employee_id: t.employee_id,
        total_periods: scheduledEntries.length,
        status: scheduledEntries.length > 0 ? 'active' as const : 'draft' as const,
        last_modified: scheduledEntries.length > 0 ? 'Recently updated' : 'Not configured'
      }
    })
  }, [teachers, timetableEntries])

  // Filter schedules based on search query
  const filteredClassSchedules = useMemo(() => {
    if (!searchQuery) return classSchedules
    const term = searchQuery.toLowerCase()
    return classSchedules.filter((tt) =>
      tt.name.toLowerCase().includes(term) ||
      tt.code.toLowerCase().includes(term)
    )
  }, [searchQuery, classSchedules])

  const filteredTeacherSchedules = useMemo(() => {
    if (!searchQuery) return teacherSchedules
    const term = searchQuery.toLowerCase()
    return teacherSchedules.filter((tt) =>
      tt.name.toLowerCase().includes(term) ||
      tt.employee_id.toLowerCase().includes(term)
    )
  }, [searchQuery, teacherSchedules])

  const activeTimetablesCount = useMemo(() => {
    const activeClasses = classSchedules.filter(c => c.total_periods > 0).length
    const activeTeachers = teacherSchedules.filter(t => t.total_periods > 0).length
    return activeClasses + activeTeachers
  }, [classSchedules, teacherSchedules])

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
          <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
          <p className="text-gray-500">Create and manage class and teacher timetables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/education/timetable/periods')}>
            <Clock className="h-4 w-4 mr-2" />Periods Setup
          </Button>
          {isAdmin && (
            <Button onClick={() => navigate('/education/timetable/editor')}>
              <Plus className="h-4 w-4 mr-2" />Create Timetable
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{timetableEntries.length}</p>
          <p className="text-xs text-gray-600">Total Scheduled Periods</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">
            {classSchedules.filter(c => c.total_periods > 0).length} / {classes.length}
          </p>
          <p className="text-xs text-gray-600">Scheduled Classes</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {teacherSchedules.filter(t => t.total_periods > 0).length} / {teachers.length}
          </p>
          <p className="text-xs text-gray-600">Scheduled Teachers</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Badge variant="success" className="text-xs">Active</Badge>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{activeTimetablesCount}</p>
          <p className="text-xs text-gray-600">Active Schedules</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-1/2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes or teachers..."
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="class" className="space-y-4" onValueChange={(v) => setActiveTab(v as 'class' | 'teacher')}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="class">🏫 Class Timetables</TabsTrigger>
          <TabsTrigger value="teacher">💼 Teacher Timetables</TabsTrigger>
        </TabsList>

        <TabsContent value="class" className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Class Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Class Code</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Periods Scheduled</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Configured State</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassSchedules.map((cls) => (
                  <tr key={cls.id} className="border-t hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{cls.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{cls.code}</td>
                    <td className="px-6 py-4 text-center font-medium text-slate-800">{cls.total_periods}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={cls.total_periods > 0 ? 'success' : 'secondary'}>
                        {cls.total_periods > 0 ? 'Active' : 'Empty'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{cls.last_modified}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate(`/education/timetable/view?class_id=${cls.id}`)}
                          title="View Timetable"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/education/timetable/editor?class_id=${cls.id}`)}
                            title="Edit Timetable"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="teacher" className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Teacher Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Employee ID</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Periods Scheduled</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Configured State</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeacherSchedules.map((teacher) => (
                  <tr key={teacher.id} className="border-t hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{teacher.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{teacher.employee_id}</td>
                    <td className="px-6 py-4 text-center font-medium text-slate-800">{teacher.total_periods}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={teacher.total_periods > 0 ? 'success' : 'secondary'}>
                        {teacher.total_periods > 0 ? 'Active' : 'Empty'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{teacher.last_modified}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate(`/education/timetable/view?teacher_id=${teacher.id}`)}
                          title="View Timetable"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/education/timetable/editor?teacher_id=${teacher.id}`)}
                            title="Edit Timetable"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
