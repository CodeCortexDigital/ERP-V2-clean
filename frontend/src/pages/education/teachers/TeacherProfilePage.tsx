import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, Calendar, Award, MapPin, Users, BookOpen, Plus, Check, X, Edit2,
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [subjectToAssign, setSubjectToAssign] = useState<SubjectOption>(SUBJECT_OPTIONS[0])
  const [assignedSubjects, setAssignedSubjects] = useState<SubjectOption[]>([])
  const [availability, setAvailability] = useState<AvailabilityState>(DEFAULT_AVAILABILITY)

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
    } catch (error) {
      console.error('Error loading teacher:', error)
    } finally {
      setLoading(false)
    }
  }

  const teacherName = useMemo(
    () => `${teacher?.first_name || ''} ${teacher?.last_name || ''}`.trim(),
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
          <p className="text-gray-500">{teacher.department} • {teacher.specialization}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Assigned Subjects</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{assignedSubjects.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Availability Days</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {Object.values(availability).filter((day) => day.enabled).length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Status</p>
            <Badge variant={teacher.is_active ? "active" : "inactive" === 'active' ? 'success' : teacher.is_active ? "active" : "inactive" === 'on_leave' ? 'warning' : 'secondary'}>
              {teacher.is_active ? "active" : "inactive".replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subjects">Subject Assignment</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>          <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
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
                    <p className="text-sm text-gray-500">Teacher ID</p>
                    <p className="font-medium text-gray-900">{teacher.teacher_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{teacher.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{teacher.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">{teacher.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Qualification</p>
                    <p className="font-medium text-gray-900">{teacher.qualification}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Joined</p>
                    <p className="font-medium text-gray-900">{teacher.joining_date}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                  <p className="text-sm text-gray-500">Biography</p>
                  <p className="mt-2 text-gray-700">{teacher.bio}</p>
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
                <Button className="w-full" variant="secondary" onClick={() => toast.success('Teacher information saved')}>
                  <Check className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subject Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-gray-500">Assigned Subjects</p>
                        <p className="text-xl font-semibold text-gray-900">{assignedSubjects.length}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {assignedSubjects.length === 0 ? (
                        <p className="text-sm text-gray-500">No subjects assigned yet.</p>
                      ) : (
                        assignedSubjects.map((subject) => (
                          <div key={subject} className="flex items-center justify-between rounded-xl border border-gray-200 bg-slate-50 px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{subject}</p>
                              <p className="text-xs text-gray-500">Assigned to {teacherName}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleRemoveSubject(subject)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                  <p className="text-sm text-gray-500">Add Subject</p>
                  <div className="mt-3 space-y-3">
                    <select
                      value={subjectToAssign}
                      onChange={(e) => setSubjectToAssign(e.target.value as SubjectOption)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {SUBJECT_OPTIONS.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                    <Button className="w-full" onClick={handleAssignSubject}>
                      <Plus className="w-4 h-4 mr-2" /> Assign Subject
                    </Button>
                  </div>
                </div>
              </div>
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
              <TabsContent value="calendar">          <TeacherAttendanceCalendar teacherId={teacher.id} teacherName={teacher.full_name} />        </TabsContent></Tabs>
    </div>
  )
}






