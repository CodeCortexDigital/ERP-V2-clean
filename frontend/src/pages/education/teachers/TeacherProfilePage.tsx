import { useEffect, useMemo, useState, useRef, ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, Calendar, Award, MapPin, Users, BookOpen, Plus, Check, X, Edit2, Clock, Camera
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
import api, { extractListData } from '@/services/api'
import { resolveMediaUrl, validateFileClient } from '@/utils/fileUpload'

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

interface AvailabilityDay {
  enabled: boolean;
  from: string;
  to: string;
  recordId: string | null;
}

type AvailabilityState = {
  Monday: AvailabilityDay;
  Tuesday: AvailabilityDay;
  Wednesday: AvailabilityDay;
  Thursday: AvailabilityDay;
  Friday: AvailabilityDay;
  Saturday: AvailabilityDay;
  Sunday: AvailabilityDay;
};

const INITIAL_AVAILABILITY: AvailabilityState = {
  Monday: { enabled: false, from: '09:00', to: '17:00', recordId: null },
  Tuesday: { enabled: false, from: '09:00', to: '17:00', recordId: null },
  Wednesday: { enabled: false, from: '09:00', to: '17:00', recordId: null },
  Thursday: { enabled: false, from: '09:00', to: '17:00', recordId: null },
  Friday: { enabled: false, from: '09:00', to: '17:00', recordId: null },
  Saturday: { enabled: false, from: '09:00', to: '17:00', recordId: null },
  Sunday: { enabled: false, from: '09:00', to: '17:00', recordId: null },
};

const mapDbDayToUiKey: Record<string, keyof AvailabilityState> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const mapUiKeyToDbDay: Record<keyof AvailabilityState, string> = {
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
  Sunday: 'sunday',
};

export default function TeacherProfilePage() {
  const { id } = useParams<{ id?: string }>()
  const { user, role } = useAuth()
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [subjectToAssign, setSubjectToAssign] = useState<SubjectOption>(SUBJECT_OPTIONS[0])
  const [assignedSubjects, setAssignedSubjects] = useState<SubjectOption[]>([])
  
  // Real database assignments & timetable schedule states
  const [assignments, setAssignments] = useState<any[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [timetableEntries, setTimetableEntries] = useState<any[]>([])
  const [loadingTimetable, setLoadingTimetable] = useState(false)

  // Availability & Metadata integration states
  const [availability, setAvailability] = useState<AvailabilityState>(INITIAL_AVAILABILITY)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<string | null>(null)
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState<string>('')
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('')
  const [isPrimaryAssignment, setIsPrimaryAssignment] = useState<boolean>(true)
  const [assigningSubject, setAssigningSubject] = useState<boolean>(false)

  // Profile picture states & refs
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Attendance history states
  const [attendance, setAttendance] = useState<any[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  useEffect(() => {
    let active = true;
    (async () => {
      const url = await resolveMediaUrl(teacher?.profile_picture);
      if (active) setProfilePictureUrl(url);
    })();
    return () => {
      active = false;
    };
  }, [teacher?.profile_picture]);

  const teacherEmailToIdMap: Record<string, string> = {
    'teacher@test.com': '1',
    'teacher@erp.com': '1',
  }

  useEffect(() => {
    const teacherId = id || null;
    loadTeacher(teacherId);
  }, [id, user?.email]);

  const loadTeacher = async (teacherId: string | null) => {
    setLoading(true);
    try {
      let teacherData: any = null;
      if (teacherId) {
        try {
          const response = await teacherService.getById(teacherId);
          teacherData = response.data;
        } catch (err) {
          console.log('Fetching teacher by ID failed, falling back to email lookup');
        }
      }

      if (!teacherData) {
        const res = await teacherService.getAll();
        const list = extractListData<any>(res.data);
        const userEmail = user?.email?.toLowerCase();
        teacherData = list.find((t: any) => t.email?.toLowerCase() === userEmail) || list[0];
      }

      if (teacherData) {
        setTeacher(teacherData);
        setAssignedSubjects(teacherData.courses || ['Computer Science', 'Mathematics']);
        fetchAssignments(teacherData.id);
        fetchTimetable(teacherData.id);
        fetchAvailability(teacherData.id);
        fetchAttendance(teacherData.id);
        fetchMetadata();
      } else {
        // Default fallback for logged-in teacher
        setTeacher({
          id: 't-me',
          employee_id: 'TCH-001',
          full_name: user?.full_name || 'Maryam Fatima',
          email: user?.email || 'teacher@code.com',
          qualification: 'M.Sc Computer Science / B.Ed',
          experience_years: 8,
          is_active: true,
          specializations: ['Computer Science', 'Mathematics']
        } as any);
      }
    } catch (error) {
      console.error('Error loading teacher:', error);
      setTeacher({
        id: 't-me',
        employee_id: 'TCH-001',
        full_name: user?.full_name || 'Maryam Fatima',
        email: user?.email || 'teacher@code.com',
        qualification: 'M.Sc Computer Science / B.Ed',
        experience_years: 8,
        is_active: true,
        specializations: ['Computer Science', 'Mathematics']
      } as any);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (teacherId: string) => {
    setLoadingAttendance(true)
    try {
      const response = await api.get('/auth/academics/teacher-attendance/', {
        params: { teacher_id: teacherId }
      })
      const data = extractListData<any>(response.data)
      setAttendance(data)
    } catch (err) {
      console.error('Error fetching teacher attendance:', err)
      setAttendance([])
    } finally {
      setLoadingAttendance(false)
    }
  }

  const calculateAttendanceRate = () => {
    if (!attendance || attendance.length === 0) return 100
    const present = attendance.filter(a => a.status === 'present').length
    const absent = attendance.filter(a => a.status === 'absent').length
    const onLeave = attendance.filter(a => a.status === 'on_leave').length
    const totalDays = present + absent + onLeave
    if (totalDays === 0) return 100
    return Math.round((present / totalDays) * 100)
  }

  const handleProfilePictureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFileClient(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const teacherId = id || teacher?.id;
    if (!teacherId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      const response = await api.patch(`/auth/academics/teachers/${teacherId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const updatedTeacher = response.data;
      setTeacher(updatedTeacher);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    const teacherId = id || teacher?.id;
    if (!teacherId) return;
    try {
      await api.patch(`/auth/academics/teachers/${teacherId}/`, { profile_picture: null });
      setTeacher(prev => prev ? { ...prev, profile_picture: null } : null);
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    }
  };

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

  const fetchAvailability = async (teacherId: string) => {
    setLoadingAvailability(true)
    try {
      const response = await api.get('/auth/academics/teacher-availability/', {
        params: { teacher_id: teacherId }
      })
      const data = extractListData<any>(response.data)
      
      const newAvail = { ...INITIAL_AVAILABILITY }
      // Initialize all days to disabled by default
      Object.keys(newAvail).forEach((day) => {
        newAvail[day as keyof AvailabilityState] = {
          enabled: false,
          from: '09:00',
          to: '17:00',
          recordId: null
        }
      })

      data.forEach((rec: any) => {
        const uiKey = mapDbDayToUiKey[rec.day_of_week.toLowerCase()]
        if (uiKey) {
          newAvail[uiKey] = {
            enabled: rec.is_available ?? true,
            from: rec.start_time ? rec.start_time.substring(0, 5) : '09:00',
            to: rec.end_time ? rec.end_time.substring(0, 5) : '17:00',
            recordId: rec.id
          }
        }
      })
      setAvailability(newAvail)
    } catch (err) {
      console.error('Error loading availability:', err)
    } finally {
      setLoadingAvailability(false)
    }
  }

  const fetchMetadata = async () => {
    try {
      const [ayRes, csRes] = await Promise.all([
        api.get('/auth/academics/academic-years/'),
        api.get('/auth/academics/class-subjects/')
      ])
      const ayList = extractListData<any>(ayRes.data)
      const csList = extractListData<any>(csRes.data)
      
      setAcademicYears(ayList)
      setClassSubjects(csList)
      
      const activeAy = ayList.find((ay: any) => ay.is_active) || ayList[0]
      if (activeAy) {
        setActiveAcademicYearId(activeAy.id)
        setSelectedAcademicYearId(activeAy.id)
      }
      if (csList.length > 0) {
        setSelectedClassSubjectId(csList[0].id)
      }
    } catch (err) {
      console.error('Error fetching metadata:', err)
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

  const handleAssignSubject = async () => {
    if (!teacher) return
    if (!selectedClassSubjectId) {
      toast.error('Please select a class & subject.')
      return
    }
    if (!selectedAcademicYearId) {
      toast.error('Please select an academic year.')
      return
    }

    const alreadyAssigned = assignments.some(
      (assign: any) =>
        assign.class_subject === selectedClassSubjectId &&
        assign.academic_year === selectedAcademicYearId
    )
    if (alreadyAssigned) {
      toast.error('This subject/class is already assigned to this teacher for the selected academic year.')
      return
    }

    setAssigningSubject(true)
    try {
      await api.post('/auth/academics/teacher-assignments/', {
        teacher: teacher.id,
        class_subject: selectedClassSubjectId,
        academic_year: selectedAcademicYearId,
        is_primary: isPrimaryAssignment,
        is_active: true
      })
      toast.success('Subject assigned successfully!')
      fetchAssignments(teacher.id)
      fetchTimetable(teacher.id)
    } catch (err: any) {
      console.error('Error assigning subject:', err)
      const detail = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to assign subject'
      toast.error(detail)
    } finally {
      setAssigningSubject(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to remove this class/subject assignment?')) {
      return
    }
    try {
      await api.delete(`/auth/academics/teacher-assignments/${assignmentId}/`)
      toast.success('Assignment removed successfully!')
      if (teacher) {
        fetchAssignments(teacher.id)
        fetchTimetable(teacher.id)
      }
    } catch (err) {
      console.error('Error deleting assignment:', err)
      toast.error('Failed to remove assignment')
    }
  }

  const handleSaveAvailability = async () => {
    if (!teacher) return
    setSavingAvailability(true)
    try {
      let ayId = activeAcademicYearId
      if (!ayId) {
        const ayRes = await api.get('/auth/academics/academic-years/')
        const ayList = extractListData<any>(ayRes.data)
        const activeAy = ayList.find((ay: any) => ay.is_active) || ayList[0]
        if (!activeAy) {
          toast.error('No academic year configured in system.')
          setSavingAvailability(false)
          return
        }
        ayId = activeAy.id
        setActiveAcademicYearId(ayId)
      }

      const promises = Object.entries(availability).map(async ([day, config]) => {
        const dbDay = mapUiKeyToDbDay[day as keyof AvailabilityState]
        if (config.enabled) {
          if (config.recordId) {
            return api.put(`/auth/academics/teacher-availability/${config.recordId}/`, {
              teacher: teacher.id,
              day_of_week: dbDay,
              start_time: `${config.from}:00`,
              end_time: `${config.to}:00`,
              is_available: true,
              academic_year: ayId
            })
          } else {
            return api.post('/auth/academics/teacher-availability/', {
              teacher: teacher.id,
              day_of_week: dbDay,
              start_time: `${config.from}:00`,
              end_time: `${config.to}:00`,
              is_available: true,
              academic_year: ayId
            })
          }
        } else {
          if (config.recordId) {
            return api.delete(`/auth/academics/teacher-availability/${config.recordId}/`)
          }
        }
      })

      await Promise.all(promises)
      toast.success('Availability saved successfully!')
      fetchAvailability(teacher.id)
    } catch (err) {
      console.error('Error saving availability:', err)
      toast.error('Failed to save availability schedule')
    } finally {
      setSavingAvailability(false)
    }
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
      {/* Header with Profile Picture */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(id ? '/education/teachers' : '/teacher')} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Profile Picture */}
          <div className="relative">
            <div 
              onClick={() => profilePictureUrl && setIsImageModalOpen(true)}
              className={`w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden ${profilePictureUrl ? 'cursor-pointer hover:ring-4 hover:ring-blue-100 transition duration-200' : ''}`}
              title={profilePictureUrl ? "Click to view full image" : ""}
            >
              {profilePictureUrl ? (
                <img 
                  src={profilePictureUrl} 
                  alt={teacherName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {teacherName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors"
              disabled={uploading}
              title="Upload Profile Picture"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="hidden"
            />
            
            {profilePictureUrl && (
              <button
                onClick={handleRemoveProfilePicture}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                title="Remove Profile Picture"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">{teacherName}</h1>
            <p className="text-gray-500">{teacher.employee_id || 'N/A'}</p>
            <p className="text-xs text-gray-400">
              {teacher.specializations && Array.isArray(teacher.specializations) && teacher.specializations.length > 0 
                ? teacher.specializations.join(' • ') 
                : 'Academics Staff'}
            </p>
          </div>
        </div>
        
        {isAdmin && id && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/education/teachers/${id}/edit`)}
            >
              <Edit2 className="w-4 h-4 mr-2" /> 
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{assignments.length}</p>
          <p className="text-xs text-gray-600">Assigned Classes</p>
        </div>
        
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">{calculateAttendanceRate()}%</p>
          <p className="text-xs text-gray-600">Attendance Rate</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{timetableEntries.length}</p>
          <p className="text-xs text-gray-600">Scheduled Periods</p>
        </div>
        
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <Badge variant={teacher.is_active ? 'success' : 'secondary'}>
            {teacher.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <p className="text-xs text-gray-600 mt-2">Status</p>
        </div>
      </div>

      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="subjects">Subject Assignment</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="timetable">Daily Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
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
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
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
                          {isAdmin && <th className="p-4 text-center font-semibold text-gray-700">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((assign: any) => (
                          <tr key={assign.id} className="border-b hover:bg-gray-50/50">
                            <td className="p-4 font-semibold text-gray-900">{assign.class_name || 'N/A'}</td>
                            <td className="p-4 text-gray-600 font-medium">{assign.subject_name || 'N/A'}</td>
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
                            {isAdmin && (
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleRemoveAssignment(assign.id)}
                                  className="p-1 rounded-lg hover:bg-red-100 transition"
                                  title="Remove Assignment"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Assign New Class & Subject</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Class & Subject</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                      value={selectedClassSubjectId}
                      onChange={(e) => setSelectedClassSubjectId(e.target.value)}
                    >
                      <option value="">Select Class & Subject...</option>
                      {classSubjects.map((cs) => (
                        <option key={cs.id} value={cs.id}>
                          {cs.class_name} - {cs.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Academic Year</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                      value={selectedAcademicYearId}
                      onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                    >
                      <option value="">Select Academic Year...</option>
                      {academicYears.map((ay) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.name} {ay.is_active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={isPrimaryAssignment}
                      onChange={(e) => setIsPrimaryAssignment(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isPrimary" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                      Primary Subject Teacher
                    </label>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleAssignSubject}
                    disabled={assigningSubject || classSubjects.length === 0}
                  >
                    {assigningSubject ? 'Assigning...' : 'Assign Class & Subject'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Set weekly availability hours for the teacher. Active days will appear as available in scheduling workflows.</p>
              
              {loadingAvailability ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
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
                    <Button onClick={handleSaveAvailability} disabled={savingAvailability}>
                      <Check className="w-4 h-4 mr-2" /> {savingAvailability ? 'Saving...' : 'Save Availability'}
                    </Button>
                  </div>
                </>
              )}
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

        <TabsContent value="attendance">
          <TeacherAttendanceCalendar teacherId={teacher.id} teacherName={teacher.full_name} canEdit={isAdmin} />
        </TabsContent>
      </Tabs>

      {/* Full image viewer modal */}
      {isImageModalOpen && profilePictureUrl && (
        <div 
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 cursor-zoom-out p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img 
              src={profilePictureUrl} 
              alt={teacherName} 
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-lg text-sm transition"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}







