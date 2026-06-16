import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, Calendar, Award, MapPin, Users, BookOpen, Plus, Check, X, Edit2, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { TeacherAttendanceCalendar } from '@/components/calendar/TeacherAttendanceCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import teacherService, { Teacher } from '@/services/teacher.service'
import api from '@/services/api'

const SUBJECT_OPTIONS = [
  'Computer Science Fundamentals',
  'Data Structures',
  'Discrete Mathematics',
  'Linear Algebra',
  'Probability & Statistics',
  'Calculus',
  'AI Ethics',
] as const

type SubjectOption = (typeof SUBJECT_OPTIONS)[number]

const DEFAULT_AVAILABILITY = {
  Monday: { enabled: true, from: '09:00', to: '14:00' },
  Tuesday: { enabled: true, from: '10:00', to: '15:00' },
  Wednesday: { enabled: false, from: '09:00', to: '13:00' },
  Thursday: { enabled: true, from: '11:00', to: '16:00' },
  Friday: { enabled: true, from: '09:00', to: '13:00' },
} as const

type AvailabilityState = typeof DEFAULT_AVAILABILITY

export default function TeacherProfilePage() {
  const { id } = useParams<{ id?: string }>()
  const { user, role } = useAuth()
  const isAdmin = role === 'admin' || role === 'staff'
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [subjectToAssign, setSubjectToAssign] = useState<SubjectOption>(SUBJECT_OPTIONS[0])
  const [assignedSubjects, setAssignedSubjects] = useState<SubjectOption[]>([])
  const [availability, setAvailability] = useState<AvailabilityState>(DEFAULT_AVAILABILITY)
  
  // Real database assignments & timetable schedule states
  const [assignments, setAssignments] = useState<any[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [timetableEntries, setTimetableEntries] = useState<any[]>([])
  const [loadingTimetable, setLoadingTimetable] = useState(false)

  const teacherEmailToIdMap: Record<string, string> = {
    'teacher@test.com': '1',
    'teacher@erp.com': '1',
  }

  useEffect(() => {
    const normalizedEmail = user?.email?.toLowerCase() ?? ''
    const defaultTeacherId = teacherEmailToIdMap[normalizedEmail]
    const teacherId = id || defaultTeacherId

    if (!teacherId) {
      setLoading(false)
      return
    }

    loadTeacher(teacherId)
  }, [id, user?.email])

  const loadTeacher = async (teacherId: string) => {
    try {
      const response = await teacherService.getById(teacherId)
      const teacherData = response.data
      setTeacher(teacherData)
      setAssignedSubjects(teacherData.courses || [])
      
      // Load real assignments and daily timetable entries
      fetchAssignments(teacherId)
      fetchTimetable(teacherId)
    } catch (error) {
      console.error('Error loading teacher:', error)
      toast.error('Failed to load teacher profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async (teacherId: string) => {
    setLoadingAssignments(true)
    try {
      const response = await api.get('/auth/academics/teacher-assignments/', {
        params: { teacher_id: teacherId }
      })
      const data = Array.isArray(response.data) ? response.data : response.data?.results || []
      setAssignments(data)
    } catch (err) {
      console.error('Error loading teacher subject assignments:', err)
    } finally {
      setLoadingAssignments(false)
    }
  }

  const fetchTimetable = async (teacherId: string) => {
    setLoadingTimetable(true)
    try {
      const response = await api.get('/auth/academics/timetable-entries/', {
        params: { teacher_id: teacherId }
      })
      const data = Array.isArray(response.data) ? response.data : response.data?.results || []
      setTimetableEntries(data)
    } catch (err) {
      console.error('Error loading teacher timetable entries:', err)
    } finally {
      setLoadingTimetable(false)
    }
  }

  // Group timetable entries by day of the week
  const groupedSchedule = useMemo(() => {
    const groups: Record<string, any[]> = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
    timetableEntries.forEach(entry => {
      const day = entry.day_of_week ? entry.day_of_week.charAt(0).toUpperCase() + entry.day_of_week.slice(1).toLowerCase() : ''
      if (groups[day]) {
        groups[day].push(entry)
      }
    });
    // Sort each day's entries by period/time name
    Object.keys(groups).forEach(day => {
      groups[day].sort((a, b) => (a.period_name || '').localeCompare(b.period_name || ''))
    })
    return groups
  }, [timetableEntries])

  const teacherName = useMemo(
    () => teacher?.full_name || '',
    [teacher]
  )

  const handleAssignSubject = () => {
    if (!subjectToAssign || assignedSubjects.includes(subjectToAssign)) {
      toast.error('Please choose a subject that is not already assigned.')
      return
    }
    setAssignedSubjects((prev) => [...prev, subjectToAssign])
    toast.success(`${subjectToAssign} assigned to ${teacherName}`)
  }

  const handleRemoveSubject = (subject: string) => {
    setAssignedSubjects((prev) => prev.filter((item) => item !== subject))
    toast.success(`${subject} removed from assignment`) 
  }

  const handleAvailabilityChange = (day: keyof AvailabilityState, field: 'enabled' | 'from' | 'to', value: string | boolean) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold text-gray-700">Teacher profile unavailable</h2>
        <p className="mt-2 text-gray-500">
          {id
            ? 'No teacher matches the selected profile. Please choose another teacher or contact your administrator.'
            : 'Your teacher profile is not available yet. Please contact support if this should be active for your account.'}
        </p>
        <Button className="mt-4" onClick={() => navigate(id ? '/education/teachers' : '/teacher')}>
          {id ? 'Back to Teachers' : 'Back to Dashboard'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            variant="outline"
            onClick={() => navigate(id ? '/education/teachers' : '/teacher')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {id ? 'Back to Teachers' : 'Back to Dashboard'}
          </Button>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">{teacherName}</h1>
          <p className="text-gray-500">
            {teacher.specializations && Array.isArray(teacher.specializations) && teacher.specializations.length > 0 
              ? teacher.specializations.join(' • ') 
              : 'Academics Staff'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Assigned Classes</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{assignments.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Scheduled Periods</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{timetableEntries.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Status</p>
            <Badge variant={teacher.is_active ? 'success' : 'secondary'}>
              {teacher.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subjects">Subject Assignment</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="timetable">Daily Schedule</TabsTrigger>
          <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Employee ID</p>
                    <p className="font-mono font-medium text-gray-900">{teacher.employee_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <a href={`mailto:${teacher.email}`} className="font-medium text-blue-600 hover:underline">{teacher.email}</a>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    {teacher.phone ? (
                      <a href={`tel:${teacher.phone}`} className="font-medium text-blue-600 hover:underline">{teacher.phone}</a>
                    ) : (
                      <p className="font-medium text-gray-400">N/A</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-medium text-gray-900">{teacher.experience_years || 0} Years</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Qualifications</p>
                    <p className="font-medium text-gray-900">
                      {Array.isArray(teacher.qualifications) && teacher.qualifications.length > 0 
                        ? teacher.qualifications.join(', ') 
                        : teacher.qualifications || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date Joined</p>
                    <p className="font-medium text-gray-900">{teacher.joining_date || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline" onClick={() => setActiveTab('subjects')}>
                  <BookOpen className="w-4 h-4 mr-2" /> Manage Subject Assignments
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setActiveTab('availability')}>
                  <Calendar className="w-4 h-4 mr-2" /> Update Availability Calendar
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setActiveTab('timetable')}>
                  <Clock className="w-4 h-4 mr-2" /> View Timetable Schedule
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Class & Subject Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingAssignments ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-10 text-gray-500 border border-dashed rounded-xl">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No class or subject assignments found for this teacher.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4 text-left font-semibold text-gray-700">Class Name</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Subject Name</th>
                        <th className="p-4 text-center font-semibold text-gray-700">Role</th>
                        <th className="p-4 text-center font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assign: any) => (
                        <tr key={assign.id} className="border-b hover:bg-gray-50/50">
                          <td className="p-4 font-semibold text-gray-900">{assign.class_name || 'Grade 1'}</td>
                          <td className="p-4 text-gray-600 font-medium">{assign.subject_name || 'English'}</td>
                          <td className="p-4 text-center">
                            <Badge variant={assign.is_primary ? 'info' : 'secondary'}>
                              {assign.is_primary ? 'Primary Teacher' : 'Assistant'}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant={assign.is_active ? 'success' : 'destructive'}>
                              {assign.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Set weekly availability hours for the teacher. Active days will appear as available in scheduling workflows.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(availability).map(([day, config]) => (
                  <div key={day} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{day}</p>
                        <p className="text-sm text-gray-500">{config.enabled ? 'Available' : 'Unavailable'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={config.enabled ? 'secondary' : 'outline'}
                        onClick={() => handleAvailabilityChange(day as keyof AvailabilityState, 'enabled', !config.enabled)}
                      >
                        {config.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm text-gray-500">
                        From
                        <input
                          type="time"
                          value={config.from}
                          disabled={!config.enabled}
                          onChange={(e) => handleAvailabilityChange(day as keyof AvailabilityState, 'from', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label className="block text-sm text-gray-500">
                        To
                        <input
                          type="time"
                          value={config.to}
                          disabled={!config.enabled}
                          onChange={(e) => handleAvailabilityChange(day as keyof AvailabilityState, 'to', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast.success('Availability updated successfully')}>
                  <Check className="w-4 h-4 mr-2" /> Save Availability
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timetable">
          <Card>
            <CardHeader>
              <CardTitle>Daily Class Timetable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingTimetable ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : timetableEntries.length === 0 ? (
                <div className="text-center py-10 text-gray-500 border border-dashed rounded-xl">
                  <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No timetable entries scheduled for this teacher.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSchedule).map(([day, entries]) => {
                    if (entries.length === 0) return null;
                    return (
                      <div key={day} className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-2">
                          {day}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {entries.map((entry: any) => (
                            <div key={entry.id} className="border border-gray-150 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                              <div className="absolute top-0 right-0 bg-blue-50 text-blue-700 px-3 py-1 rounded-bl-xl text-xs font-semibold">
                                {entry.period_name || 'Period'}
                              </div>
                              <div className="space-y-2 mt-2">
                                <p className="text-sm font-semibold text-gray-950">{entry.class_name}</p>
                                <p className="text-xs font-medium text-blue-600">{entry.subject_name}</p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{entry.classroom_name || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <TeacherAttendanceCalendar teacherId={teacher.id} teacherName={teacher.full_name} canEdit={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}







