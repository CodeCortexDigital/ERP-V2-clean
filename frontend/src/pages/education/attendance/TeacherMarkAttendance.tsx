import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, 
  Save, RefreshCw, AlertCircle, Eye, Search, X, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import api, { extractListData } from '@/services/api';
import attendanceService from '@/services/attendance.service';
import studentService from '@/services/student.service';
import classService, { SchoolClass } from '@/services/class.service';
import teacherService from '@/services/teacher.service';
import { useAuth } from '@/contexts/AuthContext';
import { CanAccess } from '@/components/auth/CanAccess';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday' | 'excused';

interface AttendanceStudent {
  id: string;
  student_id: string;
  full_name: string;
  status: AttendanceStatus;
  savedStatus?: AttendanceStatus;
  isSaved: boolean;
  guardian_name?: string;
  profile_picture?: string;
  classId?: string;
  className?: string;
}

function localDateInputValue(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSunday(dateStr: string): boolean {
  return parseDateOnly(dateStr).getDay() === 0;
}

function defaultStatusForDate(dateStr: string): AttendanceStatus {
  return isSunday(dateStr) ? 'holiday' : 'present';
}

function matchAttendanceRecord(records: any[], student: { id: string; student_id?: string }) {
  const sid = String(student.id);
  const roll = student.student_id ? String(student.student_id) : '';
  return records.find((a) => {
    const aid = a.student_id != null ? String(a.student_id) : '';
    return aid === sid || (roll && aid === roll);
  });
}

function resolveStatusForMarking(
  existing: { status?: string; marked_by_id?: string | null; marked_by_name?: string } | undefined,
  dateStr: string,
): AttendanceStatus {
  if (!existing?.status) return defaultStatusForDate(dateStr);

  const s = String(existing.status).toLowerCase();
  if (s === 'present' || s === 'absent' || s === 'late' || s === 'holiday' || s === 'excused') {
    return s as AttendanceStatus;
  }
  return defaultStatusForDate(dateStr);
}

export default function TeacherMarkAttendance() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlClass = searchParams.get('class');
  const urlDate = searchParams.get('date') || localDateInputValue();

  const [myClasses, setMyClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(urlClass || '');
  const [selectedDate, setSelectedDate] = useState<string>(urlDate);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // Statistics
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const lateCount = students.filter(s => s.status === 'late').length;
  const holidayCount = students.filter(s => s.status === 'holiday').length;
  const nonSchoolDay = isSunday(selectedDate);
  const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch teacher's assigned classes on mount
  useEffect(() => {
    fetchMyClasses();
  }, []);

  // Fetch sections when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass);
    } else {
      setSections([]);
      setSelectedSection('');
    }
  }, [selectedClass]);

  // Fetch students & attendance when class/date changes (after manual submit)
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (submitted && selectedClass && selectedDate) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClass, selectedDate, submitted]);

  const fetchMyClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await classService.getAll().catch(() => ({ data: [] }));
      const rawClasses = extractListData<SchoolClass>(response.data || []);
      const seenClasses = new Set();
      let classList: SchoolClass[] = [...rawClasses].filter((c: any) => {
        const cid = String(c.id || c.name);
        if (seenClasses.has(cid)) return false;
        seenClasses.add(cid);
        return true;
      });

      // Check if user is a Principal/Head who should see all classes
      const userRole = (role || '').toLowerCase();
      const isPrincipalOrHead = userRole.includes('principal') || userRole.includes('head') || userRole.includes('director');

      let myAssignedClasses: SchoolClass[];

      if (isPrincipalOrHead) {
        myAssignedClasses = classList.filter(c => c.is_active !== false);
      } else {
        // For teachers: assigned classes are listed first (preferred), but per
        // policy a teacher may mark attendance for ANY class. So we resolve the
        // teacher's assigned classes (best-effort) and then append all other
        // active classes so the full class list is selectable. Every change is
        // recorded by the backend attendance audit log.
        const assignedIds = new Set<string>();
        try {
          const teacherProfileResponse = await teacherService.getMyProfile().catch(() => ({ data: null }));
          let teacherId: string | null = null;

          if (teacherProfileResponse?.data?.id) {
            const teacherByIdResponse = await teacherService.getById(teacherProfileResponse.data.id).catch(() => ({ data: null }));
            if (teacherByIdResponse?.data?.employee_id) {
              teacherId = teacherByIdResponse.data.employee_id;
            }
          } else if (user?.id) {
            const allTeachersResponse = await teacherService.getAll().catch(() => ({ data: [] }));
            const allTeachers = extractListData<any>(allTeachersResponse.data || []);
            for (const teacher of allTeachers) {
              if (String(teacher.id) === String(user.id)) {
                teacherId = teacher.employee_id;
                break;
              }
              if (teacher.email === user.email) {
                teacherId = teacher.employee_id;
                break;
              }
              if (user.full_name && teacher.full_name === user.full_name) {
                teacherId = teacher.employee_id;
                break;
              }
            }
          }

          const matchesAssigned = (c: SchoolClass): boolean => {
            if (teacherId) {
              return Boolean(
                c.teacher_id &&
                (c.teacher_id === teacherId || c.teacher_id.includes(teacherId.replace(/^EMP[_-]?/, '')))
              );
            }
            const savedEmp: any = {};
            const teacherName = (
              savedEmp.name || savedEmp.full_name || user?.full_name || user?.email || ''
            ).toLowerCase();
            return Boolean(
              c.teacher_name && teacherName &&
              (c.teacher_name.toLowerCase().includes(teacherName) || teacherName.includes(c.teacher_name.toLowerCase()))
            );
          };

          const assigned = classList.filter(c => matchesAssigned(c) && c.is_active !== false);
          const rest = classList.filter(c => !assigned.includes(c) && c.is_active !== false);
          assigned.forEach(c => assignedIds.add(String(c.id)));
          myAssignedClasses = [...assigned, ...rest];
        } catch (error) {
          console.error('Error resolving teacher classes, defaulting to all classes:', error);
          myAssignedClasses = classList.filter(c => c.is_active !== false);
        }
      }

      setMyClasses(myAssignedClasses);
      
      // Auto-select class from URL or first class
      if (urlClass && myAssignedClasses.some(c => c.id === urlClass)) {
        setSelectedClass(urlClass);
      } else if (myAssignedClasses.length > 0) {
        setSelectedClass(myAssignedClasses[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchSections = async (classId: string) => {
    if (!classId || classId.startsWith('cls-')) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    try {
      const response = await classService.getSections(classId);
      const responseData = response.data as any;
      let sectionList = [];
      
      if (responseData?.options && Array.isArray(responseData.options)) {
        sectionList = responseData.options;
      } else if (responseData?.results && Array.isArray(responseData.results)) {
        sectionList = responseData.results;
      } else if (Array.isArray(responseData)) {
        sectionList = responseData;
      }
      
      setSections(sectionList);
      if (sectionList.length > 0) {
        setSelectedSection(sectionList[0].id);
      } else {
        setSelectedSection('');
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
      setSelectedSection('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    setSubmitted(true);
    fetchStudentsAndAttendance();
  };

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      const response = await studentService.getAll().catch(() => ({ data: [] }));
      let rawStudents: any[] = [];
      if (Array.isArray(response.data)) {
        rawStudents = response.data;
      } else if (response.data && Array.isArray((response.data as any).results)) {
        rawStudents = (response.data as any).results;
      } else if (response.data && Array.isArray((response.data as any).data)) {
        rawStudents = (response.data as any).data;
      }
      
      const cls = myClasses.find(c => c.id === selectedClass);
      
      const studentsWithStatus: AttendanceStudent[] = [];
      let anyExisting = false;
      
      const filtered = rawStudents.filter((s: any) => {
        const studentClass = s.current_class || s.class_id || s.class_ref || s.class_name;
        return studentClass === selectedClass || studentClass === cls?.name;
      });
      
      let existingAttendance: any[] = [];
      
      try {
        const attResponse = await attendanceService.getByDate(selectedDate, selectedClass || undefined, selectedSection || undefined);
        existingAttendance = attResponse.data || [];
        if (existingAttendance.length > 0) anyExisting = true;
      } catch (err) {
        console.log('No existing attendance found for', cls?.name);
      }
      
      filtered.forEach((student) => {
        const existing = matchAttendanceRecord(existingAttendance, student);
        const status = resolveStatusForMarking(existing, selectedDate);
        const teacherMarked = Boolean(existing?.marked_by_id || existing?.marked_by_name || existing?.marked_by);
        studentsWithStatus.push({
          id: student.id || `std-${Math.random()}`,
          student_id: student.student_id || student.registration_no || '001',
          full_name: student.full_name || student.name || 'Student Name',
          guardian_name: student.parent_name || student.guardian_name || student.father_name || 'Guardian Name',
          profile_picture: student.profile_picture || student.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
          status,
          savedStatus: teacherMarked ? (existing?.status as AttendanceStatus) : undefined,
          isSaved: teacherMarked,
          classId: selectedClass,
          className: cls?.name,
        });
      });
      
      setStudents(studentsWithStatus);
      setHasSavedData(anyExisting);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, status: status } : s
    ));
  };

  const markAllPresent = () => {
    if (nonSchoolDay) {
      toast.info('Sunday is a non-school day — use Holiday instead');
      return;
    }
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
    toast.success(`✓ All ${students.length} students marked as Present`);
  };

  const markAllAbsent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'absent' })));
    toast.success(`✓ All ${students.length} students marked as Absent`);
  };

  const markAllHoliday = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'holiday' })));
    toast.success(`✓ All ${students.length} students marked as Holiday`);
  };

  const markAllExcused = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'excused' })));
    toast.success(`✓ All ${students.length} students marked as Excused/Leave`);
  };

  const saveAttendance = async () => {
    if (students.length === 0) {
      toast.error('No students to save attendance for');
      return;
    }

    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }

    setSaving(true);
    
    try {
      const isFuture = selectedDate > localDateInputValue();
      const recordsToSave = students
        .filter(student => !isFuture || (student.status === 'holiday' || student.status === 'excused'))
        .map(student => ({
          student_id: student.id,
          status: student.status,
          date: selectedDate,
          class_id: student.classId || selectedClass,
          section_id: selectedSection
        }));
      
      if (isFuture && recordsToSave.length === 0) {
        toast.info('No future holiday or leave changes selected to save.');
        setSaving(false);
        return;
      }
      
      const isCustomClass = selectedClass && selectedClass.startsWith('cls-');
      if (!isCustomClass) {
        await attendanceService.bulkSave(selectedDate, recordsToSave);
      }
      
      setStudents(prev => prev.map(s => ({ 
        ...s, 
        savedStatus: s.status,
        isSaved: true 
      })));
      setHasSavedData(true);
      
      toast.success(`Attendance saved successfully! (${students.length} students)`);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleViewHistory = async (student: any) => {
    setSelectedStudent(student);
    try {
      const response = await attendanceService.getStudentHistory(student.id);
      setStudentHistory(response.data || []);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error fetching student history:', error);
      setStudentHistory([]);
      setShowHistoryModal(true);
      toast.error('Failed to load attendance history');
    }
  };

  const getStatusButtonClass = (currentStatus: string, buttonStatus: string) => {
    if (currentStatus === buttonStatus) {
      switch (buttonStatus) {
        case 'present': return 'bg-green-600 text-white border-green-600';
        case 'absent': return 'bg-red-600 text-white border-red-600';
        case 'late': return 'bg-orange-600 text-white border-orange-600';
        case 'holiday': return 'bg-purple-600 text-white border-purple-600';
        case 'excused': return 'bg-blue-600 text-white border-blue-600';
        default: return 'bg-blue-600 text-white';
      }
    }
    return 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200';
  };

  const cls = myClasses.find(c => c.id === selectedClass);

  if (loadingClasses) {
    return (
      <div className="space-y-6 bg-slate-50 min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <h1 className="text-xl font-bold text-slate-800">Mark Student Attendance</h1>
          </div>
          <div className="flex justify-center items-center h-64 mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Mark Student Attendance</h1>
              <p className="text-sm text-slate-500">Select class and date to mark or review attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/teacher')} className="gap-2">
              <ChevronDown className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Class & Date Selection Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Class & Date Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={myClasses.length === 0}
                  >
                    {myClasses.length === 0 ? (
                      <option value="">No classes assigned</option>
                    ) : (
                      <>
                        <option value="">Select a class...</option>
                        {myClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Code: {c.code})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm" disabled={loadingClasses || !selectedClass}>
                    Load Students
                  </Button>
                </div>
              </div>
              
              {sections.length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Section (Optional)
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full md:w-64 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Sections</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {myClasses.length === 0 && (
          <Card className="border-slate-200 shadow-sm bg-amber-50 border-amber-100">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-amber-400" />
              <h3 className="text-lg font-bold text-amber-800 mb-2">No Classes Assigned</h3>
              <p className="text-amber-600">You are not assigned as a class teacher to any class. Contact administration to get class assignments.</p>
            </CardContent>
          </Card>
        )}

        {submitted && students.length === 0 && selectedClass && (
          <Card className="border-slate-200 shadow-sm bg-blue-50 border-blue-100">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-bold text-blue-800 mb-2">No Students Found</h3>
              <p className="text-blue-600">No students are enrolled in {cls?.name} for the selected date.</p>
            </CardContent>
          </Card>
        )}

        {submitted && students.length > 0 && (
          <>
            {/* Statistics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{totalStudents}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Total</div>
              </div>
              <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{presentCount}</div>
                <div className="text-xs text-green-600 uppercase tracking-wider">Present</div>
              </div>
              <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
                <div className="text-2xl font-bold text-red-700">{absentCount}</div>
                <div className="text-xs text-red-600 uppercase tracking-wider">Absent</div>
              </div>
              <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 text-center">
                <div className="text-2xl font-bold text-orange-700">{lateCount}</div>
                <div className="text-xs text-orange-600 uppercase tracking-wider">Late</div>
              </div>
              <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">{holidayCount}</div>
                <div className="text-xs text-purple-600 uppercase tracking-wider">Holiday</div>
              </div>
            </div>

            {/* Quick Actions */}
            <CanAccess module="attendance" action="mark">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  variant="outline" 
                  className="text-xs gap-1" 
                  onClick={markAllPresent} 
                  disabled={nonSchoolDay || saving}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> All Present
                </Button>
                <Button variant="outline" className="text-xs gap-1" onClick={markAllAbsent} disabled={saving}>
                  <XCircle className="w-3.5 h-3.5" /> All Absent
                </Button>
                <Button variant="outline" className="text-xs gap-1" onClick={markAllHoliday} disabled={saving}>
                  <Calendar className="w-3.5 h-3.5" /> All Holiday
                </Button>
                <Button variant="outline" className="text-xs gap-1" onClick={markAllExcused} disabled={saving}>
                  <AlertCircle className="w-3.5 h-3.5" /> All Excused
                </Button>
              </div>
            </CanAccess>

            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 w-10">#</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 w-48">Reg No</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 w-140">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Guardian</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 w-80">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student, index) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 font-mono">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img 
                                src={student.profile_picture} 
                                alt={student.full_name} 
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                              <span className="font-medium text-slate-800">{student.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{student.student_id}</td>
                          <td className="px-4 py-3">
                            <CanAccess module="attendance" action="mark">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleStatusChange(student.id, 'present')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${getStatusButtonClass(student.status, 'present')}`}
                                  disabled={saving}
                                  title="Present"
                                >P</button>
                                <button
                                  onClick={() => handleStatusChange(student.id, 'absent')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${getStatusButtonClass(student.status, 'absent')}`}
                                  disabled={saving}
                                  title="Absent"
                                >A</button>
                                <button
                                  onClick={() => handleStatusChange(student.id, 'late')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${getStatusButtonClass(student.status, 'late')}`}
                                  disabled={saving}
                                  title="Late"
                                >L</button>
                                <button
                                  onClick={() => handleStatusChange(student.id, 'holiday')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${getStatusButtonClass(student.status, 'holiday')}`}
                                  disabled={saving}
                                  title="Holiday"
                                >H</button>
                                <button
                                  onClick={() => handleStatusChange(student.id, 'excused')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${getStatusButtonClass(student.status, 'excused')}`}
                                  disabled={saving}
                                  title="Excused/Leave"
                                >E</button>
                              </div>
                            </CanAccess>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{student.guardian_name}</td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1 text-xs"
                              onClick={() => handleViewHistory(student)}
                              disabled={saving}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              History
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Save Button */}
            <CanAccess module="attendance" action="mark">
              <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                <Button 
                  onClick={saveAttendance} 
                  disabled={saving}
                  className="gap-2 px-6 py-2.5 text-sm font-bold"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Attendance
                    </>
                  )}
                </Button>
              </div>
            </CanAccess>
          </>
        )}

        {(!submitted || !selectedClass) && myClasses.length > 0 && (
          <Card className="border-slate-200 shadow-sm bg-blue-50 border-blue-100">
            <CardContent className="py-8 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-bold text-blue-800 mb-2">Select a Class and Date</h3>
              <p className="text-blue-600">Choose a class from the dropdown above and click "Load Students" to view and mark attendance.</p>
              <div className="mt-4 text-sm text-blue-500">
                <p>Your assigned classes: {myClasses.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* History Modal */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Attendance History - {selectedStudent.full_name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {studentHistory.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No attendance history found.</p>
              ) : (
                <div className="space-y-2">
                  {studentHistory.map((record: any) => (
                    <div key={record.id || record.date} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-600">{record.date}</span>
                        <Badge variant={record.status === 'present' ? 'success' : record.status === 'absent' ? 'danger' : record.status === 'late' ? 'warning' : 'default'}>
                          {record.status}
                        </Badge>
                      </div>
                      {record.reason && <span className="text-xs text-slate-500">{record.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}