import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  MapPin,
  Users,
  BookOpen,
  Plus,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'sonner'

interface Teacher {
  id: number
  teacher_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  department: string
  specialization: string
  qualification: string
  joining_date: string
  status: 'active' | 'on_leave' | 'inactive'
  bio: string
  courses: string[]
  location: string
}

const SAMPLE_TEACHERS: Teacher[] = [
  {
    id: 1,
    teacher_id: 'TCH-001',
    first_name: 'Dr. Ahmed',
    last_name: 'Raza',
    email: 'ahmed.raza@edu.com',
    phone: '+92 300 1111111',
    department: 'Computer Science',
    specialization: 'AI & Machine Learning',
    qualification: 'PhD',
    joining_date: '2020-08-15',
    status: 'active',
    bio: 'Experienced lecturer in artificial intelligence, machine learning, and data science with a passion for student mentoring.',
    courses: ['CS101', 'CS202'],
    location: 'Main Campus',
  },
  {
    id: 2,
    teacher_id: 'TCH-002',
    first_name: 'Prof. Sara',
    last_name: 'Khan',
    email: 'sara.khan@edu.com',
    phone: '+92 321 2222222',
    department: 'Mathematics',
    specialization: 'Calculus',
    qualification: 'MPhil',
    joining_date: '2019-01-10',
    status: 'active',
    bio: 'Dedicated mathematics instructor focused on interactive learning and practical problem solving.',
    courses: ['MATH101', 'MATH202'],
    location: 'Science Block',
  },
]

const SUBJECT_OPTIONS = [
  'Computer Science Fundamentals',
  'Data Structures',
  'Discrete Mathematics',
  'Linear Algebra',
  'Probability & Statistics',
  'Calculus',
  'AI Ethics',
]

const DEFAULT_AVAILABILITY = {
  Monday: { enabled: true, from: '09:00', to: '14:00' },
  Tuesday: { enabled: true, from: '10:00', to: '15:00' },
  Wednesday: { enabled: false, from: '09:00', to: '13:00' },
  Thursday: { enabled: true, from: '11:00', to: '16:00' },
  Friday: { enabled: true, from: '09:00', to: '13:00' },
}

type AvailabilityState = typeof DEFAULT_AVAILABILITY

export default function TeacherProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [subjectToAssign, setSubjectToAssign] = useState(SUBJECT_OPTIONS[0])
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilityState>(DEFAULT_AVAILABILITY)

  useEffect(() => {
    if (!id) return
    const teacherId = Number(id)
    const found = SAMPLE_TEACHERS.find((item) => item.id === teacherId)
    if (found) {
      setTeacher(found)
      setAssignedSubjects(found.courses)
    }
  }, [id])

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

  if (!teacher) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold text-gray-700">Teacher not found</h2>
        <Button className="mt-4" onClick={() => navigate('/education/teachers')}>
          Back to Teachers
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate('/education/teachers')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Teachers
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
            <Badge variant={teacher.status === 'active' ? 'success' : teacher.status === 'on_leave' ? 'warning' : 'secondary'}>
              {teacher.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subjects">Subject Assignment</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
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
                      onChange={(e) => setSubjectToAssign(e.target.value)}
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
      </Tabs>
    </div>
  )
}
