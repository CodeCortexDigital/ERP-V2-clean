import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Users, MapPin, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import api from '@/services/api'
import academicService from '@/services/academic.service'
import { useAuth } from '@/contexts/AuthContext'

interface Period {
  id: string
  period_number: number
  name: string
  start_time: string
  end_time: string
  is_break: boolean
}

interface TimetableEntry {
  id: string
  class_subject: string
  class_name: string
  subject_name: string
  teacher: string
  teacher_name: string
  classroom: string
  classroom_name: string
  day_of_week: string
  period: string
}

export default function TimetableViewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { role, user } = useAuth()
  const isStudent = role === 'student'
  const classId = searchParams.get('class_id')
  const teacherId = searchParams.get('teacher_id')

  const resolvedClassId = useMemo(() => {
    if (isStudent) {
      return (user as any)?.class_name || 'Grade 1-A';
    }
    return classId;
  }, [isStudent, classId, user]);

  const [periods, setPeriods] = useState<Period[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [title, setTitle] = useState('Timetable View')
  const [subtitle, setSubtitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])

  useEffect(() => {}, []);

  useEffect(() => {
    fetchTimetableData()
  }, [resolvedClassId, teacherId])

  const fetchTimetableData = async () => {
    setLoading(true)
    try {
      // Fetch active periods
      const periodsRes = await academicService.getPeriods()
      const periodsList = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data as any)?.results || []
      periodsList.sort((a: Period, b: Period) => a.period_number - b.period_number)
      setPeriods(periodsList)

      // Fetch classes list first
      let classesList: any[] = []
      try {
        const classesRes = await academicService.getClasses()
        classesList = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any)?.results || []
      } catch (e) {
        console.error(e)
      }

      // Fetch timetable entries
      const params: any = {}
      if (resolvedClassId) {
        params.class_id = resolvedClassId
        // Resolve class metadata locally from the list
        const matchedClass = classesList.find(c => String(c.id) === String(resolvedClassId) || c.name === resolvedClassId)
        if (matchedClass) {
          setTitle(`${matchedClass.name} Timetable`)
          setSubtitle(`Class Code: ${matchedClass.code || 'N/A'}`)
        } else if (resolvedClassId.length > 20) {
          try {
            const classRes = await academicService.getClass(resolvedClassId)
            setTitle(`${classRes.data?.name || 'Class'} Timetable`)
            setSubtitle(`Class Code: ${classRes.data?.code || 'N/A'}`)
          } catch {
            setTitle(`${resolvedClassId} Timetable`)
            setSubtitle('Class Code: N/A')
          }
        } else {
          setTitle(`${resolvedClassId} Timetable`)
          setSubtitle('Class Code: N/A')
        }
      } else if (teacherId) {
        params.teacher_id = teacherId
        // Fetch teacher metadata for title
        try {
          const teacherRes = await api.get(`/auth/academics/teachers/${teacherId}/`)
          setTitle(`${teacherRes.data?.full_name || 'Teacher'} Timetable`)
          setSubtitle(`Employee ID: ${teacherRes.data?.employee_id || 'N/A'}`)
        } catch {
          setTitle('Teacher Timetable')
        }
      } else {
        if (isStudent) {
          setTitle('My Timetable')
          setSubtitle('Class Code: N/A')
        } else {
          toast.error('No class or teacher specified')
          navigate('/education/timetable')
          return
        }
      }

      const entriesRes = await academicService.getTimetableEntries(params)
      const entriesList = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data as any)?.results || []
      setEntries(entriesList)

    } catch (err) {
      console.error('Error fetching timetable view data:', err)
      toast.error('Failed to load timetable schedule')
    } finally {
      setLoading(false)
    }
  }

  // Helper to find slot content for a day and period
  const getSlot = (day: string, periodId: string) => {
    return entries.find((e) => 
      e.day_of_week.toLowerCase() === day.toLowerCase() && 
      String(e.period) === String(periodId)
    )
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4 print:p-4">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(isStudent ? '/student' : '/education/timetable')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-500">{subtitle}</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" /> Print Schedule
        </Button>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
        <p className="text-xs text-gray-400 mt-1">Generated Academic Timetable Report</p>
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No periods configured yet. Please configure periods first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeDays.map((day) => {
            // Find active entries for this day
            const dayEntries = periods.map(p => ({
              period: p,
              entry: getSlot(day, p.id)
            })).filter(x => x.entry || x.period.is_break)

            if (dayEntries.length === 0) return null

            return (
              <Card key={day} className="overflow-hidden border border-slate-200 shadow-sm print:break-inside-avoid print:border-slate-300">
                <CardHeader className="bg-slate-50 border-b py-3 print:py-2">
                  <CardTitle className="text-base font-semibold text-slate-800 uppercase tracking-wider">
                    {day}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100/50 border-b text-slate-600 text-xs font-semibold">
                        <tr>
                          <th className="px-6 py-3 font-semibold text-left w-24">Period</th>
                          <th className="px-6 py-3 font-semibold text-left w-36">Time Slot</th>
                          <th className="px-6 py-3 font-semibold text-left">Subject</th>
                          <th className="px-6 py-3 font-semibold text-left">
                            {classId ? 'Assigned Teacher' : 'Assigned Class'}
                          </th>
                          <th className="px-6 py-3 font-semibold text-left">Classroom Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((period, idx) => {
                          const slot = getSlot(day, period.id)
                          if (period.is_break) {
                            return (
                              <tr key={period.id} className="border-t bg-amber-50/40 text-amber-800 italic">
                                <td className="px-6 py-3 font-medium">Break</td>
                                <td className="px-6 py-3 font-mono text-xs">
                                  {period.start_time.substring(0, 5)} - {period.end_time.substring(0, 5)}
                                </td>
                                <td colSpan={3} className="px-6 py-3 text-sm font-semibold tracking-wide text-center">
                                  ☕ {period.name}
                                </td>
                              </tr>
                            )
                          }

                          return (
                            <tr key={period.id} className={`border-t transition-colors hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                              <td className="px-6 py-4 font-semibold text-slate-900">Period {period.period_number}</td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                {period.start_time.substring(0, 5)} - {period.end_time.substring(0, 5)}
                              </td>
                              <td className="px-6 py-4">
                                {slot ? (
                                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                    {slot.subject_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-normal italic">- No Class -</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {slot ? (
                                  <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-purple-500" />
                                    {classId ? slot.teacher_name : slot.class_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-normal">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {slot ? (
                                  <Badge variant="outline" className="flex items-center gap-1 w-fit bg-slate-50 text-slate-700 px-2 py-0.5 border-slate-200">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    {slot.classroom_name || 'N/A'}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 font-normal">-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex gap-3 print:hidden">
        <Button variant="outline" onClick={() => navigate('/education/timetable')}>
          Back
        </Button>
      </div>
    </div>
  )
}
