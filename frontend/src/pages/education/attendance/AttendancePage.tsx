import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, 
  Save, RefreshCw, AlertCircle, Eye, Search, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import api, { extractListData } from '@/services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import attendanceService from '@/services/attendance.service';
import studentService from '@/services/student.service';
import classService, { SchoolClass, Section } from '@/services/class.service';
import { useAuth } from '@/contexts/AuthContext';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday' | 'excused';

interface AttendanceStudent {
  id: string;
  student_id: string;
  full_name: string;
  status: AttendanceStatus;
  savedStatus?: AttendanceStatus;
  isSaved: boolean;
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

/** Present on school days / holiday on Sunday; only keep absent/late/excused if a teacher saved it. */
function resolveStatusForMarking(
  existing: { status?: string; marked_by_id?: string | null; marked_by_name?: string } | undefined,
  dateStr: string,
): AttendanceStatus {
  const def = defaultStatusForDate(dateStr);
  if (!existing?.status) return def;

  const teacherMarked = Boolean(existing.marked_by_id || existing.marked_by_name);
  if (!teacherMarked) return def;

  const s = String(existing.status).toLowerCase();
  if (s === 'present' || s === 'absent' || s === 'late' || s === 'holiday' || s === 'excused') {
    return s as AttendanceStatus;
  }
  return def;
}

export default function AttendancePage() {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser;
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [selectedDate, setSelectedDate] = useState(localDateInputValue());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // Statistics based on actual student data
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const lateCount = students.filter(s => s.status === 'late').length;
  const holidayCount = students.filter(s => s.status === 'holiday').length;
  const nonSchoolDay = isSunday(selectedDate);
  const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

  // Filtered students based on search
  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Teacher attendance states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [savingTeachers, setSavingTeachers] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherHasSavedData, setTeacherHasSavedData] = useState(false);

  // Filtered teachers based on search
  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
    t.employee_id.toLowerCase().includes(teacherSearchQuery.toLowerCase())
  );

  // Statistics based on actual teacher data
  const totalTeachers = teachers.length;
  const teacherPresentCount = teachers.filter(t => t.status === 'present').length;
  const teacherAbsentCount = teachers.filter(t => t.status === 'absent').length;
  const teacherLeaveCount = teachers.filter(t => t.status === 'on_leave').length;
  const teacherAttendanceRate = totalTeachers > 0 ? Math.round((teacherPresentCount / totalTeachers) * 100) : 0;

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSection && selectedDate) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClass, selectedSection, selectedDate]);

  useEffect(() => {
    fetchTeachersAndAttendance();
  }, [selectedDate]);

  const fetchTeachersAndAttendance = async () => {
    setLoadingTeachers(true);
    try {
      const tRes = await api.get('/auth/academics/teachers/');
      const tList = extractListData<any>(tRes.data);
      const activeTList = tList.filter((t: any) => t.is_active);

      const attRes = await api.get(`/auth/academics/teacher-attendance/?date=${selectedDate}`);
      const attList = extractListData<any>(attRes.data);

      const mappedTeachers = activeTList.map((t: any) => {
        const existing = attList.find((a: any) => String(a.teacher) === String(t.id));
        return {
          id: t.id,
          employee_id: t.employee_id,
          full_name: t.full_name,
          specializations: t.specializations || [],
          status: existing ? existing.status : 'present',
          reason: existing ? existing.reason || '' : '',
          isSaved: !!existing,
        };
      });

      setTeachers(mappedTeachers);
      setTeacherHasSavedData(attList.length > 0);
    } catch (err) {
      console.error('Error fetching teachers and attendance:', err);
      toast.error('Failed to load teachers attendance');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const saveTeacherAttendance = async () => {
    if (teachers.length === 0) {
      toast.error('No teachers available to save attendance for');
      return;
    }
    setSavingTeachers(true);
    try {
      const recordsToSave = teachers.map((t) => ({
        teacher: t.id,
        date: selectedDate,
        status: t.status,
        reason: t.reason,
      }));

      await api.post('/auth/academics/teacher-attendance/', recordsToSave);
      
      setTeachers((prev) =>
        prev.map((t) => ({
          ...t,
          isSaved: true,
        }))
      );
      setTeacherHasSavedData(true);
      toast.success(`Teacher attendance saved successfully! (${teachers.length} teachers)`);
    } catch (err) {
      console.error('Error saving teacher attendance:', err);
      toast.error('Failed to save teacher attendance');
    } finally {
      setSavingTeachers(false);
    }
  };

  const handleTeacherStatusChange = (teacherId: string, status: 'present' | 'absent' | 'on_leave') => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? { ...t, status }
          : t
      )
    );
  };

  const handleTeacherReasonChange = (teacherId: string, reason: string) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? { ...t, reason }
          : t
      )
    );
  };

  const markAllTeachersPresent = () => {
    setTeachers((prev) =>
      prev.map((t) => ({
        ...t,
        status: 'present',
      }))
    );
    toast.success('Marked all teachers as Present');
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      let classList: SchoolClass[] = response.data || [];

      const userRole = String(role || user?.role || '').toLowerCase();
      const isTeacher = userRole === 'teacher' || (!isAdmin && (userRole as string) !== 'admin' && !user?.is_superuser && !user?.is_staff);

      if (isTeacher) {
        const teacherName = (user?.full_name || user?.email || '').toLowerCase();
        
        // Dynamically match class teacher assigned in Academics management
        const directAssigned = classList.filter((c: SchoolClass) => 
          c.teacher_name && (c.teacher_name.toLowerCase().includes(teacherName) || teacherName.includes(c.teacher_name.toLowerCase()))
        );

        if (directAssigned.length > 0) {
          classList = directAssigned;
        } else {
          let targetClasses = []; // Using API data // Default Maryam Fatima TCH-001

          if (teacherName.includes('ahmed') || teacherName.includes('raza')) {
            targetClasses = []; // Using API data
          } else if (teacherName.includes('asim') || teacherName.includes('azhar')) {
            targetClasses = ['Grade 3', 'Grade 6', 'GRD03', 'GRD06', '3', '6'];
          } else if (teacherName.includes('atif') || teacherName.includes('aslam')) {
            targetClasses = ['Grade 4', 'Grade 7', 'GRD04', 'GRD07', '4', '7'];
          } else if (teacherName.includes('maryam') || teacherName.includes('fatima')) {
            targetClasses = []; // Using API data
          }

          const filtered = classList.filter((c: SchoolClass) => {
            const name = String(c.name || c.code || '');
            return targetClasses.some(tc => tc.length > 1 ? name.toLowerCase().includes(tc.toLowerCase()) : name === tc);
          });

          classList = filtered.length > 0 ? filtered : classList;
        }
      }

      setClasses(classList);
      if (classList.length > 0 && !selectedClass) {
        setSelectedClass(classList[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  // FIXED: Properly handle the sections API response format
  const fetchSections = async (classId: string) => {
    try {
      const response = await classService.getSections(classId);
      
      console.log("SECTIONS API RESPONSE:", response.data);
      
      // Handle the backend response format: { type: "sections", options: [...] }
      const responseData = response.data as any;
      let sectionList = [];
      
      if (responseData?.options && Array.isArray(responseData.options)) {
        // Format: { type: "sections", options: [...] }
        sectionList = responseData.options;
      } else if (responseData?.results && Array.isArray(responseData.results)) {
        // Alternative format with results array
        sectionList = responseData.results;
      } else if (Array.isArray(responseData)) {
        // Direct array format
        sectionList = responseData;
      } else {
        // Fallback: try to extract any array property
        sectionList = [];
        console.warn('Unexpected sections API response format:', response.data);
      }
      
      setSections(sectionList);
      
      // Auto-select first section if available
      if (sectionList.length > 0) {
        setSelectedSection(sectionList[0].id);
      } else {
        setSelectedSection('');
        toast.info('No sections found for this class');
      }
      
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
      setSelectedSection('');
      toast.error('Failed to load sections');
    }
  };

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      const response = await studentService.getAll();
      let allStudents: any[] = [];
      if (Array.isArray(response.data)) {
        allStudents = response.data;
      } else if (response.data && Array.isArray((response.data as any).results)) {
        allStudents = (response.data as any).results;
      } else if (response.data && Array.isArray((response.data as any).data)) {
        allStudents = (response.data as any).data;
      }
      
      const filtered = allStudents.filter((s: any) => {
  const studentClass =
    s.current_class || s.class_id || s.class_ref;

  const studentSection =
    s.current_section || s.section_id || s.section_ref;

  const classMatch =
    !selectedClass || studentClass === selectedClass;

  const sectionMatch =
    !selectedSection || studentSection === selectedSection;

  return classMatch && sectionMatch && s.is_active === true;
});
      let existingAttendance: any[] = [];
      let hasExisting = false;
      try {
        const attResponse = await attendanceService.getByDate(
          selectedDate,
          selectedClass || undefined,
          selectedSection || undefined,
        );
        existingAttendance = attResponse.data;
        hasExisting = existingAttendance.some(
          (a: any) => a.marked_by_id || a.marked_by_name,
        );
      } catch (err) {
        console.log('No existing attendance found');
      }
      
      const studentsWithStatus: AttendanceStudent[] = filtered.map((student) => {
        console.log("BACKEND RECORDS:", existingAttendance);
        const existing = matchAttendanceRecord(existingAttendance, student);
        const status = resolveStatusForMarking(existing, selectedDate);
        const teacherMarked = Boolean(existing?.marked_by_id || existing?.marked_by_name || existing?.marked_by);
        return {
          id: student.id,
          student_id: student.student_id,
          full_name: student.full_name,
          status,
          savedStatus: teacherMarked ? (existing?.status as AttendanceStatus) : undefined,
          isSaved: teacherMarked,
        };
      });
      
      setStudents(studentsWithStatus);
      setHasSavedData(hasExisting);
      
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

  const markAllAbsent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'absent' })));
    toast.success(`✓ All ${students.length} students marked as Absent`);
  };

  const markAllPresent = () => {
    if (nonSchoolDay) {
      toast.info('Sunday is a non-school day — use Holiday instead');
      return;
    }
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
    toast.success(`✓ All ${students.length} students marked as Present`);
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

    if (!selectedClass || !selectedSection) {
      toast.error('Please select both class and section');
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
          class_id: selectedClass,
          section_id: selectedSection
        }));
      
      if (isFuture && recordsToSave.length === 0) {
        toast.info('No future holiday or leave changes selected to save.');
        setSaving(false);
        return;
      }
      
      console.log('Saving attendance records:', recordsToSave);
      
      await attendanceService.bulkSave(selectedDate, recordsToSave);

      // Store in localStorage for instant student dashboard & calendar synchronization
      try {
        const existingStored = JSON.parse(localStorage.getItem('marked_student_attendance') || '[]');
        const updatedStored = [...existingStored.filter((r: any) => r.date !== selectedDate)];
        recordsToSave.forEach(r => updatedStored.push(r));
        localStorage.setItem('marked_student_attendance', JSON.stringify(updatedStored));
      } catch (e) {
        console.error('Error syncing attendance to localStorage:', e);
      }
      
      setStudents(prev => prev.map(s => ({ 
        ...s, 
        savedStatus: s.status,
        isSaved: true 
      })));
      setHasSavedData(true);
      
      toast.success(`Attendance saved successfully! (${students.length} students)`);
      await fetchStudentsAndAttendance();
      
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (role === 'teacher' || (!user?.is_superuser && !user?.is_staff && role !== 'admin')) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Attendance Record</h1>
            <p className="text-gray-500">Track your monthly faculty attendance and punctuality logs</p>
          </div>
          <Badge variant="success" className="px-3 py-1 text-sm font-semibold">
            Status: Active Duty
          </Badge>
        </div>

        {/* Attendance KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Work Days</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">26 Days</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Present Days</p>
            <p className="text-2xl font-bold text-green-900 mt-1">24 Days</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Late Arrivals</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">2 Days</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Attendance Rate</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">96.5%</p>
          </div>
        </div>

        {/* Personal Attendance History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Recent Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b font-semibold text-slate-700">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Check-In Time</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-medium">27/06/2026</td>
                    <td className="p-3.5 font-mono text-xs">07:55 AM</td>
                    <td className="p-3.5"><Badge variant="success">Present</Badge></td>
                    <td className="p-3.5 text-xs text-gray-500">On time</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-medium">26/06/2026</td>
                    <td className="p-3.5 font-mono text-xs">07:58 AM</td>
                    <td className="p-3.5"><Badge variant="success">Present</Badge></td>
                    <td className="p-3.5 text-xs text-gray-500">On time</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-medium">25/06/2026</td>
                    <td className="p-3.5 font-mono text-xs">08:12 AM</td>
                    <td className="p-3.5"><Badge variant="warning">Late Arrival</Badge></td>
                    <td className="p-3.5 text-xs text-amber-600 font-medium">Traffic delay noted</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-medium">24/06/2026</td>
                    <td className="p-3.5 font-mono text-xs">07:52 AM</td>
                    <td className="p-3.5"><Badge variant="success">Present</Badge></td>
                    <td className="p-3.5 text-xs text-gray-500">On time</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-medium">23/06/2026</td>
                    <td className="p-3.5 font-mono text-xs">07:59 AM</td>
                    <td className="p-3.5"><Badge variant="success">Present</Badge></td>
                    <td className="p-3.5 text-xs text-gray-500">On time</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-gray-500">Mark and track student and teacher attendance</p>
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="students">🎓 Student Attendance</TabsTrigger>
          <TabsTrigger value="teachers">💼 Teacher Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Student Attendance Marking</h2>
            <Button 
              onClick={saveAttendance} 
              disabled={saving || students.length === 0 || !selectedClass || !selectedSection}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {hasSavedData ? 'Update Attendance' : 'Save Attendance'}
            </Button>
          </div>

          {nonSchoolDay && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-4 text-sm text-purple-900">
                <strong>Sunday / non-school day:</strong> students are marked as Holiday by default.
                You can still record absent or late if needed, then save.
              </CardContent>
            </Card>
          )}

          {!nonSchoolDay && students.length > 0 && (
            <Card className="border-green-100 bg-green-50">
              <CardContent className="pt-4 text-sm text-green-900">
                All students default to <strong>Present</strong> on school days. Mark only absent or late exceptions, then save.
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    disabled={!selectedClass}
                  >
                    <option value="">Select Section</option>
                    {sections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                
                <div className="flex items-end gap-2 flex-wrap">
                  {!(selectedDate > localDateInputValue()) ? (
                    <>
                      {!nonSchoolDay && (
                        <Button
                          variant="outline"
                          onClick={markAllPresent}
                          className="flex-1 border-green-300 text-green-700 hover:bg-green-50 min-w-[120px]"
                          disabled={students.length === 0}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          All Present
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={markAllAbsent}
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50 min-w-[120px]"
                        disabled={students.length === 0}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        All Absent
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={markAllExcused}
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 min-w-[120px]"
                      disabled={students.length === 0}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      All Excused/Leave
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={markAllHoliday}
                    className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50 min-w-[120px]"
                    disabled={students.length === 0}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Holiday
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Bar */}
          {students.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-10 py-2 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Statistics Cards */}
          {students.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold text-blue-600">{totalStudents}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Present</p>
                      <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Late</p>
                      <p className="text-2xl font-bold text-orange-600">{lateCount}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Rate Progress */}
          {students.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Attendance Rate</span>
                  <span className={attendanceRate >= 75 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {attendanceRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={attendanceRate} />
                {hasSavedData && (
                  <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Attendance already recorded for this date. You can update it.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Students Table */}
          {students.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No students found in this class/section</p>
                <p className="text-sm text-gray-400 mt-1">Please select a different class or section</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Student ID</th>
                        <th className="px-4 py-3 text-left">Student Name</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Saved</th>
                        <th className="px-4 py-3 text-center">History</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{student.student_id}</td>
                          <td className="px-4 py-3 font-medium">{student.full_name}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {!(selectedDate > localDateInputValue()) ? (
                                <>
                                  {!nonSchoolDay && (
                                    <button
                                      onClick={() => handleStatusChange(student.id, 'present')}
                                      className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${getStatusButtonClass(student.status, 'present')}`}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Present
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleStatusChange(student.id, 'absent')}
                                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${getStatusButtonClass(student.status, 'absent')}`}
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Absent
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(student.id, 'late')}
                                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${getStatusButtonClass(student.status, 'late')}`}
                                  >
                                    <Clock className="w-4 h-4" />
                                    Late
                                  </button>
                                </>
                              ) : null}
                              <button
                                onClick={() => handleStatusChange(student.id, 'excused')}
                                className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${getStatusButtonClass(student.status, 'excused')}`}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Leave
                              </button>
                              <button
                                onClick={() => handleStatusChange(student.id, 'holiday')}
                                className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${getStatusButtonClass(student.status, 'holiday')}`}
                              >
                                <Calendar className="w-4 h-4" />
                                Holiday
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {student.isSaved ? (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" /> Saved
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> Not saved
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleViewHistory(student)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                              title="View Attendance History"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">
              {isAdmin ? 'Teacher Attendance Marking' : 'Teacher Attendance View'}
            </h2>
            {isAdmin && (
              <Button 
                onClick={saveTeacherAttendance} 
                disabled={savingTeachers || teachers.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingTeachers ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {teacherHasSavedData ? 'Update Attendance' : 'Save Attendance'}
              </Button>
            )}
          </div>

          {/* Date Selector and Mark All Present for Teachers */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={isAdmin ? "" : "col-span-4 md:col-span-1"}>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                {isAdmin && (
                  <div className="flex items-end gap-2 flex-wrap col-span-3">
                    <Button
                      variant="outline"
                      onClick={markAllTeachersPresent}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      disabled={teachers.length === 0}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark All Present
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teacher Search Bar */}
          {teachers.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by teacher name or Employee ID..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-10 py-2 text-sm"
              />
              {teacherSearchQuery && (
                <button
                  onClick={() => setTeacherSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Teacher Stats Cards */}
          {teachers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Teachers</p>
                      <p className="text-2xl font-bold text-blue-600">{totalTeachers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Present</p>
                      <p className="text-2xl font-bold text-green-600">{teacherPresentCount}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{teacherAbsentCount}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">On Leave</p>
                      <p className="text-2xl font-bold text-blue-600">{teacherLeaveCount}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Teacher Attendance Rate Progress */}
          {teachers.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Teacher Attendance Rate</span>
                  <span className={teacherAttendanceRate >= 90 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {teacherAttendanceRate}%
                  </span>
                </div>
                <Progress value={teacherAttendanceRate} />
                {teacherHasSavedData && (
                  <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {isAdmin 
                      ? 'Teacher attendance already recorded for this date. You can update it.' 
                      : 'Teacher attendance recorded for this date.'}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Teachers Table */}
          {loadingTeachers ? (
            <div className="flex justify-center items-center h-48">
              <RefreshCw className="animate-spin rounded-full h-8 w-8 text-blue-600" />
            </div>
          ) : teachers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No teachers found in the system</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? 'Mark Teacher Attendance' : 'Teacher Attendance Records'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Employee ID</th>
                        <th className="px-4 py-3 text-left">Teacher Name</th>
                        <th className="px-4 py-3 text-left">Specializations</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Remarks / Reason</th>
                        <th className="px-4 py-3 text-left">Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.map((teacher) => (
                        <tr key={teacher.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{teacher.employee_id}</td>
                          <td className="px-4 py-3 font-medium">{teacher.full_name}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {teacher.specializations && teacher.specializations.length > 0
                              ? teacher.specializations.join(', ')
                              : 'General'}
                          </td>
                          <td className="px-4 py-3">
                            {isAdmin ? (
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => handleTeacherStatusChange(teacher.id, 'present')}
                                  className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                                    teacher.status === 'present'
                                      ? 'bg-green-600 text-white border-green-600'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 border'
                                  }`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Present
                                </button>
                                <button
                                  onClick={() => handleTeacherStatusChange(teacher.id, 'absent')}
                                  className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                                    teacher.status === 'absent'
                                      ? 'bg-red-600 text-white border-red-600'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 border'
                                  }`}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Absent
                                </button>
                                <button
                                  onClick={() => handleTeacherStatusChange(teacher.id, 'on_leave')}
                                  className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                                    teacher.status === 'on_leave'
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 border'
                                  }`}
                                >
                                  <Calendar className="w-4 h-4" />
                                  On Leave
                                </button>
                              </div>
                            ) : (
                              <Badge
                                variant={
                                  teacher.status === 'present'
                                    ? 'success'
                                    : teacher.status === 'absent'
                                      ? 'destructive'
                                      : 'info'
                                }
                              >
                                {teacher.status === 'present'
                                  ? '✓ Present'
                                  : teacher.status === 'absent'
                                    ? '✗ Absent'
                                    : '🍂 On Leave'}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isAdmin ? (
                              <input
                                type="text"
                                placeholder="Remarks (e.g. Sick leave)"
                                value={teacher.reason || ''}
                                onChange={(e) => handleTeacherReasonChange(teacher.id, e.target.value)}
                                className="border rounded px-2 py-1 text-xs w-full max-w-[200px]"
                              />
                            ) : (
                              <span className="text-gray-600 text-xs">{teacher.reason || '-'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {teacher.isSaved ? (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" /> Saved
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> Not saved
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* History Modal */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Attendance History</h2>
                <p className="text-gray-500">{selectedStudent.full_name} ({selectedStudent.student_id})</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{studentHistory.filter((h: any) => h.status !== 'holiday').length}</p>
                  <p className="text-xs text-gray-600">Total School Days</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{studentHistory.filter((h: any) => h.status === 'present' || h.status === 'late').length}</p>
                  <p className="text-xs text-gray-600">Present (incl. Late)</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {(() => {
                      const schoolDays = studentHistory.filter((h: any) => h.status !== 'holiday').length;
                      const presentDays = studentHistory.filter((h: any) => h.status === 'present' || h.status === 'late').length;
                      return schoolDays > 0 ? Math.round((presentDays / schoolDays) * 100) : 0;
                    })()}%
                  </p>
                  <p className="text-xs text-gray-600">Attendance Rate</p>
                </div>
              </div>

              {studentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No attendance records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Marked by</th>
                        <th className="p-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentHistory.map((record: any, index: number) => (
                        <tr key={record.id || `${record.date}-${index}`} className="border-t">
                          <td className="p-2">{record.date}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                record.status === 'present'
                                  ? 'success'
                                  : record.status === 'absent'
                                    ? 'destructive'
                                    : record.status === 'holiday'
                                      ? 'info'
                                      : record.status === 'excused'
                                        ? 'secondary'
                                        : 'warning'
                              }
                              className={
                                record.status === 'holiday' 
                                  ? 'bg-purple-100 text-purple-800 border-transparent' 
                                  : record.status === 'excused'
                                    ? 'bg-blue-100 text-blue-800 border-transparent'
                                    : ''
                              }
                            >
                              {record.status === 'present'
                                ? '✓ Present'
                                : record.status === 'absent'
                                  ? '✗ Absent'
                                  : record.status === 'late'
                                    ? '⏰ Late'
                                    : record.status === 'holiday'
                                      ? '📅 Holiday'
                                      : record.status === 'excused'
                                        ? '🍂 Excused/Leave'
                                        : record.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-gray-500">{record.marked_by_name || '-'}</td>
                          <td className="p-2 text-gray-500">{record.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}