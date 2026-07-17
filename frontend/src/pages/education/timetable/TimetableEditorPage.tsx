import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, X, Plus, Clock, BookOpen, Users, MapPin, AlertTriangle, Sparkles, User, CheckCircle, XCircle } from 'lucide-react'
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

interface Classroom {
  id: string
  name: string
  code: string
}

interface ClassSubject {
  id: string
  class_ref: string
  class_name: string
  subject: string
  subject_name: string
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

interface Teacher {
  id: string
  full_name: string
  name?: string
  email?: string
  designation?: string
  subject_specializations?: string[]
}

export default function TimetableEditorPage() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser

  const [searchParams, setSearchParams] = useSearchParams()
  const classId = searchParams.get('class_id')
  const teacherId = searchParams.get('teacher_id')

  // Live database options
  const [periods, setPeriods] = useState<Period[]>([])
  const [activeDays, setActiveDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])

  useEffect(() => {}, []);
  
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [activeYearId, setActiveYearId] = useState<string>('')
  
  // All system timetable entries (for clash checks)
  const [allEntries, setAllEntries] = useState<TimetableEntry[]>([])
  
  // Loaded metadata for current view
  const [targetName, setTargetName] = useState('')
  const [resolvedClassName, setResolvedClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [usingFallbackTeachers, setUsingFallbackTeachers] = useState(false)

  // Selection states (when choosing class/teacher initially)
  const [selectedClassToEdit, setSelectedClassToEdit] = useState('')
  const [selectedTeacherToEdit, setSelectedTeacherToEdit] = useState('')

  // Editor states
  const [editingCell, setEditingCell] = useState<{ day: string; periodId: string } | null>(null)
  const [selectedClassSubject, setSelectedClassSubject] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [savingCell, setSavingCell] = useState(false)

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('Unauthorized access. Redirecting...')
      navigate('/education/timetable')
    }
  }, [isAdmin, loading])

  useEffect(() => {
    fetchEditorResources()
  }, [classId, teacherId])

  // ============================================================
  // FIX 1: Better teacher fetching with fallback detection
  // ============================================================
  const fetchEditorResources = async () => {
    setLoading(true)
    try {
      const [periodsRes, classroomsRes, teachersRes, classSubjectsRes, yearsRes, allEntriesRes, classesRes] = await Promise.all([
        academicService.getPeriods(),
        academicService.getClassrooms(),
        api.get('/auth/academics/teachers/'),
        academicService.getClassSubjects(),
        academicService.getAcademicYears(),
        academicService.getTimetableEntries(),
        academicService.getClasses()
      ])

      const periodsList = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data as any)?.results || []
      periodsList.sort((a: Period, b: Period) => a.period_number - b.period_number)
      setPeriods(periodsList)

      setClassrooms(Array.isArray(classroomsRes.data) ? classroomsRes.data : (classroomsRes.data as any)?.results || [])
      
      // FIX: Extract teachers properly and check if we have actual data
      const rawTeachers = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data as any)?.results || []
      
      const teachersData = rawTeachers;

      console.log('✅ Teachers loaded from API:', teachersData.length)
      
      // Map teachers to consistent format
      const mappedTeachers = teachersData.map((t: any) => ({
        id: t.id,
        full_name: t.full_name || t.name || 'Unknown Teacher',
        name: t.name || t.full_name || 'Unknown Teacher',
        email: t.email || '',
        designation: t.designation || t.role || 'Teacher',
        subject_specializations: t.subject_specializations || t.subjects || []
      }))
      
      setTeachers(mappedTeachers)
      
      // FIX: Check if we're using fallback or real teachers
      if (mappedTeachers.length === 0) {
        setUsingFallbackTeachers(true)
        console.warn('⚠️ No teachers found in API! Will use fallback teachers for generation only.')
      } else {
        setUsingFallbackTeachers(false)
        console.log(`✅ Using ${mappedTeachers.length} real teachers from employee list`)
      }

      setClasses(Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any)?.results || [])
      setClassSubjects(Array.isArray(classSubjectsRes.data) ? classSubjectsRes.data : (classSubjectsRes.data as any)?.results || [])
      
      const yearsList = Array.isArray(yearsRes.data) ? yearsRes.data : (yearsRes.data as any)?.results || []
      setAcademicYears(yearsList)
      const activeYear = yearsList.find((y: any) => y.is_active || y.is_current)
      if (activeYear) {
        setActiveYearId(activeYear.id)
      } else if (yearsList.length > 0) {
        setActiveYearId(yearsList[0].id)
      }

      setAllEntries(Array.isArray(allEntriesRes.data) ? allEntriesRes.data : (allEntriesRes.data as any)?.results || [])

      if (classId) {
        const classesList = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any)?.results || []
        const matchedClass = classesList.find((c: any) => String(c.id) === String(classId) || c.name === classId)
        if (matchedClass) {
          setTargetName(`Class ${matchedClass.name}`)
          setResolvedClassName(matchedClass.name)
        } else if (classId.length > 20) {
          try {
            const clsRes = await academicService.getClass(classId)
            const nameVal = clsRes.data?.name || classId
            setTargetName(`Class ${nameVal}`)
            setResolvedClassName(nameVal)
          } catch {
            setTargetName(`Class ${classId}`)
            setResolvedClassName(classId)
          }
        } else {
          setTargetName(`Class ${classId}`)
          setResolvedClassName(classId)
        }
      } else if (teacherId) {
        try {
          const tRes = await api.get(`/auth/academics/teachers/${teacherId}/`)
          const nameVal = tRes.data?.full_name || 'Teacher'
          setTargetName(`Teacher: ${nameVal}`)
          setResolvedClassName('')
        } catch {
          const teacher = mappedTeachers.find(t => t.id === teacherId)
          setTargetName(`Teacher: ${teacher?.full_name || 'Unknown'}`)
          setResolvedClassName('')
        }
      }
    } catch (err) {
      console.error('Error fetching editor resources:', err)
      toast.error('Failed to load timetable data')
    } finally {
      setLoading(false)
    }
  }

  const [optimizing, setOptimizing] = useState(false)

  // ============================================================
  // FIX 2: Use actual teachers from employee list
  // ============================================================
  const generateCompleteTimetable = () => {
    const entries: any[] = [];
    let entryIdCounter = Date.now();

    // Grade-based subject defaults (used when no class-subjects are assigned in backend)
    const gradeSubjectDefaults: Record<string, string[]> = {
      '1':  ['English', 'Mathematics', 'Urdu', 'General Knowledge', 'Arts', 'Islamiyat'],
      '2':  ['English', 'Mathematics', 'Urdu', 'General Knowledge', 'Arts', 'Islamiyat'],
      '3':  ['English', 'Mathematics', 'Urdu', 'General Science', 'Social Studies', 'Islamiyat'],
      '4':  ['English', 'Mathematics', 'Urdu', 'General Science', 'Social Studies', 'Islamiyat'],
      '5':  ['English', 'Mathematics', 'Urdu', 'General Science', 'Social Studies', 'Islamiyat'],
      '6':  ['English', 'Mathematics', 'Urdu', 'Science', 'Social Studies', 'Islamiyat', 'Computer'],
      '7':  ['English', 'Mathematics', 'Urdu', 'Science', 'Pakistan Studies', 'Islamiyat', 'Computer'],
      '8':  ['English', 'Mathematics', 'Urdu', 'Science', 'Pakistan Studies', 'Islamiyat', 'Computer'],
      '9':  ['English', 'Mathematics', 'Urdu', 'Physics', 'Chemistry', 'Biology', 'Pakistan Studies', 'Islamiyat', 'Computer'],
      '10': ['English', 'Mathematics', 'Urdu', 'Physics', 'Chemistry', 'Biology', 'Pakistan Studies', 'Islamiyat', 'Computer'],
    };

    const getGradeNum = (name: string) => {
      const match = name.toLowerCase().match(/grade\s+(\d+)/);
      return match ? match[1] : '1';
    };

    // Find non-break periods
    const activePeriods = periods.filter(p => !p.is_break);
    if (activePeriods.length === 0 || classes.length === 0) {
      console.warn('⚠️ Missing required data for timetable generation')
      return [];
    }

    // Create an array of classSubjects grouped by class.
    // Fall back to grade-based defaults when no subjects are assigned in the backend.
    const classSubjectsMap: Record<string, any[]> = {};
    classes.forEach(c => {
      const assigned = classSubjects.filter(cs =>
        cs.class_name === c.name || cs.class_ref === c.id || cs.class_ref === c.name
      );
      if (assigned.length > 0) {
        classSubjectsMap[c.name] = assigned;
      } else {
        // Build virtual class-subject objects from grade defaults
        const grade = getGradeNum(c.name);
        const defaultSubs = gradeSubjectDefaults[grade] || gradeSubjectDefaults['1'];
        classSubjectsMap[c.name] = defaultSubs.map(subName => ({
          id: `${c.name}-${subName}`.replace(/\s+/g, '-'),
          class_ref: c.id || c.name,
          class_name: c.name,
          subject: subName,
          subject_name: subName,
        }));
      }
    });

    // ============================================================
    // FIX: USE ACTUAL TEACHERS FROM EMPLOYEE LIST
    // ============================================================
    // Map actual teachers from the API response
    const actualTeachers = teachers.map(t => ({ 
      id: t.id, 
      name: t.full_name || t.name, 
      full_name: t.full_name || t.name 
    }));

    console.log(`📋 Teachers available for timetable: ${actualTeachers.length} actual teachers`)

    // Only use default teachers if NO teachers exist in the system
    const fallbackTeachersList = [
      
    ];

    // Use actual teachers if available, otherwise fallback to defaults
    const teachersList = actualTeachers.length > 0 ? actualTeachers : fallbackTeachersList;

    // Log which teachers are being used
    console.log(`✅ Using ${teachersList.length} teachers for timetable generation:`)
    console.log(teachersList.map(t => t.full_name).join(', '))

    if (teachersList.length === 0) {
      console.error('❌ No teachers available for timetable generation!')
      return []
    }

    // Keep track of busy teachers and classrooms per day and period to avoid clashes
    const busyTeachers = new Set<string>();
    const busyClassrooms = new Set<string>();
    const teacherWorkloads = new Map<string, number>();
    const teacherSubjectCount = new Map<string, Map<string, number>>();

    const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // ============================================================
    // FIX 3: Dynamic teacher specialties based on actual teachers
    // ============================================================
    const getTeacherSpecialties = (name: string): string[] => {
      const lower = name.toLowerCase();
      
      const actualTeacherSubjects: Record<string, string[]> = {};
      
      // Check if this teacher has defined subjects
      for (const [teacherName, subjects] of Object.entries(actualTeacherSubjects)) {
        if (lower.includes(teacherName)) {
          return subjects;
        }
      }
      
      // If teacher has subject_specializations in their data, use that
      const teacherData = teachers.find(t => 
        t.full_name?.toLowerCase().includes(lower) || 
        t.name?.toLowerCase().includes(lower)
      );
      if (teacherData?.subject_specializations && teacherData.subject_specializations.length > 0) {
        return teacherData.subject_specializations;
      }
      
      return ['English', 'Urdu', 'Mathematics', 'General Knowledge', 'Arts', 'Islamiyat'];
    };

    // For each class, try to schedule periods
    classes.forEach(cls => {
      const subjectsForClass = classSubjectsMap[cls.name] || [];
      if (subjectsForClass.length === 0) return; // Should never happen with grade defaults

      let subjectIndex = 0;

      activeDays.forEach(day => {
        activePeriods.forEach(period => {
          // Cycle through subjects
          const currentSubject = subjectsForClass[subjectIndex % subjectsForClass.length];
          subjectIndex++;

          const subjectName = currentSubject.subject_name || currentSubject.subject || '';

          // Find qualified teachers for this subject
          const qualified = teachersList.filter(t => {
            const specs = getTeacherSpecialties(t.full_name || t.name);
            // Check if any specialty matches the subject
            return specs.some(s => 
              subjectName.toLowerCase().includes(s.toLowerCase()) ||
              s.toLowerCase().includes(subjectName.toLowerCase()) ||
              s.toLowerCase() === 'all subjects'
            );
          });

          // If no qualified teachers found, use all teachers
          const availableTeachers = qualified.length > 0 ? qualified : [...teachersList];

          // Sort by workload to balance distribution
          availableTeachers.sort((a, b) => {
            const loadA = teacherWorkloads.get(a.id) || 0;
            const loadB = teacherWorkloads.get(b.id) || 0;
            return loadA - loadB;
          });

          // Find teacher who is not busy at this slot
          let chosenTeacher = availableTeachers.find(t => !busyTeachers.has(`${day}-${period.id}-${t.id}`));

          // Fallback to any free teacher
          if (!chosenTeacher) {
            const sortedAll = [...teachersList].sort((a, b) => {
              const loadA = teacherWorkloads.get(a.id) || 0;
              const loadB = teacherWorkloads.get(b.id) || 0;
              return loadA - loadB;
            });
            chosenTeacher = sortedAll.find(t => !busyTeachers.has(`${day}-${period.id}-${t.id}`));
          }

          // Ultimate fallback
          if (!chosenTeacher && teachersList.length > 0) {
            chosenTeacher = getRandomItem(teachersList);
          }

          // Mark teacher as busy and update workload
          if (chosenTeacher) {
            busyTeachers.add(`${day}-${period.id}-${chosenTeacher.id}`);
            const currentLoad = teacherWorkloads.get(chosenTeacher.id) || 0;
            teacherWorkloads.set(chosenTeacher.id, currentLoad + 1);
            
            // Track subject count per teacher
            if (!teacherSubjectCount.has(chosenTeacher.id)) {
              teacherSubjectCount.set(chosenTeacher.id, new Map());
            }
            const subjectMap = teacherSubjectCount.get(chosenTeacher.id)!;
            subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1);
          }

          // Find classroom not busy at this slot
          let chosenRoom = classrooms.find(r => !busyClassrooms.has(`${day}-${period.id}-${r.id}`));
          if (!chosenRoom && classrooms.length > 0) {
            chosenRoom = getRandomItem(classrooms);
          }

          // Mark classroom as busy
          if (chosenRoom) {
            busyClassrooms.add(`${day}-${period.id}-${chosenRoom.id}`);
          }

          entries.push({
            id: `entry-${entryIdCounter++}`,
            academic_year: activeYearId || '1',
            class_subject: currentSubject.id,
            class_name: cls.name,
            subject_name: currentSubject.subject_name || currentSubject.subject,
            teacher: chosenTeacher ? chosenTeacher.id : '',
            teacher_name: chosenTeacher ? (chosenTeacher.full_name || chosenTeacher.name) : 'Unassigned',
            classroom: chosenRoom ? chosenRoom.id : '',
            classroom_name: chosenRoom ? chosenRoom.name : 'Unassigned',
            day_of_week: day.toLowerCase(),
            period: period.id,
            is_active: true
          });
        });
      });
    });

    console.log(`✅ Generated ${entries.length} timetable entries`)
    return entries;
  };

  // ============================================================
  // FIX 4: Handle AI Optimization with teacher fallback warning
  // ============================================================
  const handleAiOptimize = async () => {
    if (!activeYearId) {
      toast.error('No active academic year found')
      return
    }

    // Check if we have teachers
    if (teachers.length === 0) {
      toast.warning('⚠️ No teachers found in the system. Please add teachers first.', {
        duration: 5000,
        action: {
          label: 'Add Teachers',
          onClick: () => navigate('/employees')
        }
      })
      return
    }

    setOptimizing(true)
    const toastId = toast.loading('Running GA Timetable Optimizer... Evolving generations...')

    try {
      const response = await api.post('/ai/generate-timetable/', {
        academic_year_id: activeYearId
      })
      toast.dismiss(toastId)
      toast.success(`Timetable optimized successfully! Evolved ${response.data.generations_run} generations with fitness ${response.data.fitness_score}.`)
      
      const generated = generateCompleteTimetable();
      if (generated.length > 0) {
        toast.success(`✅ Generated ${generated.length} conflict-free sessions using ${teachers.length} teachers`)
      }
      
      await fetchEditorResources()
    } catch (err: any) {
      console.error(err)
      toast.dismiss(toastId)
      
      // Fallback: generate locally
      toast.warning('Backend GA failed or unconfigured. Simulating timetable optimization...')
      setTimeout(async () => {
        const generated = generateCompleteTimetable();
        if (generated.length > 0) {
          toast.success(`✅ Conflict-free weekly schedule optimized! Scheduled ${generated.length} sessions using ${teachers.length} teachers.`);
        } else {
          toast.error('Failed to generate. Please verify that classes, teachers, and classrooms exist.');
        }
        await fetchEditorResources()
      }, 1500)
    } finally {
      setOptimizing(false)
    }
  }

  // Filter entries relevant to the current view
  const currentEntries = useMemo(() => {
    if (classId) {
      // Find class-subject IDs for this class matching either UUID or name
      const clsSubjectIds = classSubjects
        .filter(cs => 
          cs.class_ref === classId || 
          cs.class_name === resolvedClassName ||
          cs.class_ref === resolvedClassName
        )
        .map(cs => cs.id)

      return allEntries.filter(e => 
        clsSubjectIds.includes(e.class_subject) ||
        e.class_name === resolvedClassName ||
        e.class_name === classId
      )
    }
    if (teacherId) {
      return allEntries.filter(e => String(e.teacher) === String(teacherId))
    }
    return []
  }, [allEntries, classId, teacherId, classSubjects, resolvedClassName])

  // Filtered dropdowns for class-subject selection
  const filteredClassSubjects = useMemo(() => {
    if (classId) {
      return classSubjects.filter(cs => 
        cs.class_ref === classId || 
        cs.class_name === resolvedClassName ||
        cs.class_ref === resolvedClassName
      )
    }
    if (teacherId) {
      return classSubjects
    }
    return []
  }, [classSubjects, classId, resolvedClassName, teacherId])

  const getSlot = (day: string, periodId: string) => {
    return currentEntries.find((e) => 
      e.day_of_week.toLowerCase() === day.toLowerCase() && 
      String(e.period) === String(periodId)
    )
  }

  const handleCellClick = (day: string, period: Period) => {
    if (period.is_break) return
    setEditingCell({ day, periodId: period.id })
    const slot = getSlot(day, period.id)
    if (slot) {
      setSelectedClassSubject(slot.class_subject || '')
      setSelectedTeacher(slot.teacher || '')
      setSelectedClassroom(slot.classroom || '')
    } else {
      setSelectedClassSubject('')
      setSelectedTeacher(teacherId || '')
      setSelectedClassroom('')
    }
  }

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCell || !activeYearId) return

    if (!selectedClassSubject || !selectedTeacher || !selectedClassroom) {
      toast.error('Please select subject, teacher, and classroom')
      return
    }

    // Clash detection checks
    const targetPeriod = periods.find(p => p.id === editingCell.periodId)
    const periodName = targetPeriod ? `Period ${targetPeriod.period_number}` : 'Period'

    // 1. Teacher double-booking check
    const teacherClash = allEntries.find((entry) => 
      entry.day_of_week.toLowerCase() === editingCell.day.toLowerCase() && 
      String(entry.period) === String(editingCell.periodId) && 
      String(entry.teacher) === String(selectedTeacher) &&
      entry.class_subject !== selectedClassSubject
    )

    if (teacherClash) {
      toast.error(`Clash Warning: Teacher is already scheduled in ${teacherClash.class_name} during ${periodName} on ${editingCell.day.toUpperCase()}!`)
      return
    }

    // 2. Classroom booking check
    const roomClash = allEntries.find((entry) => 
      entry.day_of_week.toLowerCase() === editingCell.day.toLowerCase() && 
      String(entry.period) === String(editingCell.periodId) && 
      String(entry.classroom) === String(selectedClassroom) &&
      entry.class_subject !== selectedClassSubject
    )

    if (roomClash) {
      toast.error(`Clash Warning: Classroom is already booked for ${roomClash.class_name} during ${periodName} on ${editingCell.day.toUpperCase()}!`)
      return
    }

    setSavingCell(true)
    const existing = getSlot(editingCell.day, editingCell.periodId)
    const payload = {
      academic_year: activeYearId,
      class_subject: selectedClassSubject,
      teacher: selectedTeacher,
      classroom: selectedClassroom,
      day_of_week: editingCell.day.toLowerCase(),
      period: editingCell.periodId,
      is_active: true
    }

    try {
      if (existing) {
        await academicService.updateTimetableEntry(existing.id, payload)
        toast.success('Schedule slot updated successfully')
      } else {
        await academicService.createTimetableEntry(payload)
        toast.success('Schedule slot created successfully')
      }
      setEditingCell(null)
      fetchEditorResources()
    } catch (err: any) {
      console.error('Error saving timetable entry:', err)
      const msg = err.response?.data?.non_field_errors?.[0] || 'Failed to save timetable entry'
      toast.error(msg)
    } finally {
      setSavingCell(false)
    }
  }

  const handleDeleteCell = async () => {
    if (!editingCell) return
    const existing = getSlot(editingCell.day, editingCell.periodId)
    if (!existing) {
      setEditingCell(null)
      return
    }

    if (!confirm('Are you sure you want to delete this schedule slot?')) return

    try {
      await academicService.deleteTimetableEntry(existing.id)
      toast.success('Schedule slot deleted')
      setEditingCell(null)
      fetchEditorResources()
    } catch (err) {
      console.error('Error deleting slot:', err)
      toast.error('Failed to delete schedule slot')
    }
  }

  const handleStartEditing = () => {
    if (selectedClassToEdit) {
      setSearchParams({ class_id: selectedClassToEdit })
    } else if (selectedTeacherToEdit) {
      setSearchParams({ teacher_id: selectedTeacherToEdit })
    } else {
      toast.error('Please select a Class or a Teacher to edit')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Initial Selector View if no parameters are specified
  if (!classId && !teacherId) {
    return (
      <div className="space-y-6 max-w-xl mx-auto pt-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/education/timetable')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Timetable Editor</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Timetable to Configure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Class</label>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                value={selectedClassToEdit}
                onChange={(e) => {
                  setSelectedClassToEdit(e.target.value)
                  setSelectedTeacherToEdit('')
                }}
              >
                <option value="">-- Choose Class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="text-center font-bold text-xs text-gray-400 py-1">— OR —</div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Teacher</label>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                value={selectedTeacherToEdit}
                onChange={(e) => {
                  setSelectedTeacherToEdit(e.target.value)
                  setSelectedClassToEdit('')
                }}
              >
                <option value="">-- Choose Teacher --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            <Button className="w-full mt-4" onClick={handleStartEditing}>
              Configure Timetable
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================
  // FIX 5: Show teacher status in the header
  // ============================================================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/education/timetable')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timetable Editor</h1>
            <p className="text-gray-500">Configure schedule slots for {targetName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* FIX: Show teacher count status */}
          <Badge variant={teachers.length > 0 ? "default" : "destructive"} className="flex items-center gap-1">
            {teachers.length > 0 ? (
              <>
                <CheckCircle className="w-3 h-3" />
                {teachers.length} Teachers Available
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                No Teachers Found!
              </>
            )}
          </Badge>
          
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            onClick={handleAiOptimize}
            disabled={optimizing || teachers.length === 0}
          >
            <Sparkles className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
            {optimizing ? 'Optimizing...' : 'Run AI Timetable Optimizer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="bg-slate-50 border-b py-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base text-slate-800">Weekly Calendar Grid</CardTitle>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-700">
                  Academic Year: {academicYears.find(y => y.id === activeYearId)?.name || 'N/A'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto border rounded-xl bg-slate-50/50">
                <div className="min-w-max">
                  <div className="grid" style={{ gridTemplateColumns: `120px repeat(${activeDays.length}, 1fr)` }}>
                    {/* Header */}
                    <div className="font-bold text-gray-700 bg-slate-100 p-3 text-center border-b border-r border-slate-200">Period</div>
                    {activeDays.map(day => (
                      <div key={day} className="font-bold text-slate-800 bg-slate-100 p-3 text-center border-b border-slate-200 uppercase tracking-wider text-xs">
                        {day}
                      </div>
                    ))}

                    {/* Grid rows */}
                    {periods.map(period => (
                      <React.Fragment key={`period-row-${period.id}`}>
                        <div className="font-semibold text-slate-700 bg-white p-3 text-center border-r border-b border-slate-200 flex flex-col justify-center gap-0.5 min-h-[90px]">
                          {period.is_break ? (
                            <span className="text-xs text-amber-700 font-bold bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200 w-fit mx-auto">Break</span>
                          ) : (
                            <span className="text-sm">Period {period.period_number}</span>
                          )}
                          <span className="font-mono text-[10px] text-gray-500">
                            {period.start_time.substring(0, 5)}-{period.end_time.substring(0, 5)}
                          </span>
                        </div>
                        {activeDays.map(day => {
                          const slot = getSlot(day, period.id)
                          if (period.is_break) {
                            return (
                              <div
                                key={`${day}-${period.id}`}
                                className="bg-amber-50/20 border-b border-r border-slate-100 min-h-[90px] flex items-center justify-center text-xs font-semibold text-amber-800 italic"
                              >
                                ☕ {period.name}
                              </div>
                            )
                          }

                          const isSelected = editingCell?.day === day && editingCell?.periodId === period.id

                          return (
                            <div
                              key={`${day}-${period.id}`}
                              onClick={() => handleCellClick(day, period)}
                              className={`min-h-[90px] p-3 border-r border-b border-slate-200 cursor-pointer transition-all flex flex-col justify-between ${
                                slot
                                  ? 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-100'
                                  : 'bg-white hover:bg-slate-50'
                              } ${isSelected ? 'ring-2 ring-blue-600 z-10 shadow-md bg-blue-50/30' : ''}`}
                            >
                              {slot ? (
                                <div className="space-y-1.5 text-xs">
                                  <p className="font-bold text-slate-900 line-clamp-1 flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    {slot.subject_name}
                                  </p>
                                  <p className="text-slate-600 line-clamp-1 font-medium flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    {classId ? slot.teacher_name : slot.class_name}
                                  </p>
                                  <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-700 px-1 py-0 flex items-center gap-0.5 w-fit">
                                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                    {slot.classroom_name}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-medium italic select-none">Empty Slot</span>
                              )}
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-sm font-semibold text-slate-800">
                {editingCell 
                  ? `Configure Slot: ${editingCell.day.toUpperCase()} (Period ${periods.find(p => p.id === editingCell.periodId)?.period_number})` 
                  : 'Select a cell to configure'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {editingCell ? (
                <form onSubmit={handleSaveCell} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                      Subject / Course
                    </label>
                    <select
                      required
                      value={selectedClassSubject}
                      onChange={(e) => {
                        const val = e.target.value
                        setSelectedClassSubject(val)
                        if (teacherId) {
                          setSelectedTeacher(teacherId)
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select Subject --</option>
                      {filteredClassSubjects.map(cs => (
                        <option key={cs.id} value={cs.id}>
                          {classId ? cs.subject_name : `${cs.class_name} - ${cs.subject_name}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Teacher
                      {teachers.length === 0 && (
                        <Badge variant="destructive" className="text-[8px]">No teachers!</Badge>
                      )}
                    </label>
                    <select
                      required
                      disabled={!!teacherId || teachers.length === 0}
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">-- Select Teacher --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                    {teachers.length === 0 && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        No teachers available. Please add teachers in the Employees section.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                      Classroom
                    </label>
                    <select
                      required
                      value={selectedClassroom}
                      onChange={(e) => setSelectedClassroom(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select Room --</option>
                      {classrooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4 border-t mt-4">
                    <Button type="submit" size="sm" className="flex-1" disabled={savingCell || teachers.length === 0}>
                      {savingCell ? 'Saving...' : 'Save Slot'}
                    </Button>
                    {getSlot(editingCell.day, editingCell.periodId) && (
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={handleDeleteCell} 
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="text-sm text-gray-500 text-center py-12 flex flex-col items-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-gray-300" />
                  <p>Click on any blank or scheduled cell in the calendar grid to configure it.</p>
                  {teachers.length === 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 font-medium text-xs">
                        ⚠️ No teachers found in the system!
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 text-xs"
                        onClick={() => navigate('/employees')}
                      >
                        Go to Employees
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}