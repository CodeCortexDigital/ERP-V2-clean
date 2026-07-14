import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  guardian_name?: string;
  profile_picture?: string;
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

/** Use existing saved status if available; otherwise fall back to default for the day. */
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
  const totalTeachers = teachers.length;  const [subTab, setSubTab] = useState<'manual' | 'card'>('manual');
  const [manualSubmitClicked, setManualSubmitClicked] = useState(false);
  const [teacherSubmitClicked, setTeacherSubmitClicked] = useState(false);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const typeParam = searchParams.get('type');
  const activeView = tabParam || (typeParam === 'staff' ? 'teachers' : 'students');

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
    if (selectedClass && selectedDate && manualSubmitClicked) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClass, selectedSection, selectedDate]);

  const handleTeacherManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherSubmitClicked(true);
    fetchTeachersAndAttendance();
  };

  useEffect(() => {
    if (teacherSubmitClicked) {
      fetchTeachersAndAttendance();
    }
  }, [selectedDate, teacherSubmitClicked]);

  const fetchTeachersAndAttendance = async () => {
    setLoadingTeachers(true);
    try {
      const tRes = await api.get('/auth/academics/teachers/');
      const tList = extractListData<any>(tRes.data);
      const activeTList = tList.filter((t: any) => t.is_active);

      // Merge custom_teachers from localStorage, but only those NOT already in
      // the DB. Match on id, employee_id or email so stale localStorage copies
      // of teachers that now exist server-side don't create duplicate rows
      // (which caused attendance to be saved against the wrong id).
      const customTeachers = JSON.parse(localStorage.getItem('custom_teachers') || '[]');
      const dbIds = new Set(activeTList.map((t: any) => String(t.id)));
      const dbEmpIds = new Set(activeTList.map((t: any) => String(t.employee_id || '').toLowerCase()).filter(Boolean));
      const dbEmails = new Set(activeTList.map((t: any) => String(t.email || '').toLowerCase()).filter(Boolean));

      const merged = [...activeTList];
      customTeachers.forEach((ct: any) => {
        const alreadyInDb =
          dbIds.has(String(ct.id)) ||
          (ct.employee_id && dbEmpIds.has(String(ct.employee_id).toLowerCase())) ||
          (ct.email && dbEmails.has(String(ct.email).toLowerCase()));
        if (!alreadyInDb) {
          merged.push(ct);
        }
      });

      // Filter out deleted teachers (same logic as TeachersManagement)
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const filteredTeacherList = merged.filter((t: any) => !deletedIds.includes(t.id));

      // Deduplicate final teacher list by ID
      const seenTeacherIds = new Set();
      const finalTeacherList = filteredTeacherList.filter((t: any) => {
        const tid = String(t.id);
        if (seenTeacherIds.has(tid)) return false;
        seenTeacherIds.add(tid);
        return true;
      });

      const attRes = await api.get(`/auth/academics/teacher-attendance/?date=${selectedDate}`);
      const attList = extractListData<any>(attRes.data);

      const mappedTeachers = finalTeacherList.map((t: any) => {
        const existing = attList.find((a: any) => String(a.teacher) === String(t.id));
        return {
          id: t.id,
          employee_id: t.employee_id || t.id,
          full_name: t.full_name || t.name || 'Unknown',
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
        employee_id: t.employee_id,
        date: selectedDate,
        status: t.status,
        reason: t.reason,
      }));

      const res = await api.post('/auth/academics/teacher-attendance/', recordsToSave);

      const saved = res.data?.saved ?? res.data ?? [];
      const skipped = res.data?.skipped ?? [];
      const skippedIds = new Set(skipped.map((s: any) => String(s.teacher)));

      setTeachers((prev) =>
        prev.map((t) => ({
          ...t,
          isSaved: !skippedIds.has(String(t.id)),
        }))
      );
      setTeacherHasSavedData(true);

      const savedCount = Array.isArray(saved) ? saved.length : teachers.length;
      if (skipped.length > 0) {
        toast.success(
          `Saved ${savedCount} teacher(s). Skipped ${skipped.length} not yet synced to the server.`
        );
      } else {
        toast.success(`Teacher attendance saved successfully! (${savedCount} teachers)`);
      }
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

  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const fetchClassReportData = async () => {
    setReportLoading(true);
    try {
      // 1. Fetch classes
      const classRes = await classService.getAll().catch(() => ({ data: [] }));
      const rawClasses = extractListData<any>(classRes.data || []);
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const rawAllClasses = [...rawClasses, ...customClasses];
      const seenClasses = new Set();
      const allClasses = rawAllClasses.filter((c: any) => {
        const cid = String(c.id || c.name);
        if (seenClasses.has(cid)) return false;
        seenClasses.add(cid);
        return true;
      });

      // 2. Fetch students
      const studentRes = await studentService.getAll().catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(studentRes.data || []);
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const allStudents = [...rawStudents, ...customStudents];

      // 3. Fetch attendance
      let apiAttendance: any[] = [];
      try {
        const attRes = await attendanceService.getByDate(selectedDate);
        apiAttendance = attRes.data || [];
      } catch (err) {
        console.log('No backend attendance found for report');
      }

      // Merge local attendance
      const localRecords = JSON.parse(localStorage.getItem('marked_student_attendance') || '[]');
      const matchingLocal = localRecords.filter((r: any) => r.date === selectedDate);
      
      const mergedAttendance = [...apiAttendance];
      matchingLocal.forEach((lr: any) => {
        const index = mergedAttendance.findIndex((a: any) => String(a.student_id) === String(lr.student_id));
        if (index === -1) {
          mergedAttendance.push(lr);
        } else {
          mergedAttendance[index] = { ...mergedAttendance[index], ...lr };
        }
      });

      // 4. Group by class
      const mappedData = allClasses.map((cls: any) => {
        // Find students in this class
        const classStudents = allStudents.filter((s: any) => {
          const studentClass = s.current_class || s.class_id || s.class_ref || s.class_name;
          return studentClass === cls.id || studentClass === cls.name;
        });

        let present = 0;
        let absent = 0;
        let leave = 0;
        let total = 0;

        classStudents.forEach((student: any) => {
          const att = mergedAttendance.find((a: any) => 
            String(a.student_id) === String(student.id) || 
            (student.student_id && String(a.student_id) === String(student.student_id))
          );
          if (att) {
            total++;
            if (att.status === 'present' || att.status === 'late') present++;
            else if (att.status === 'absent') absent++;
            else if (att.status === 'excused' || att.status === 'on_leave' || att.status === 'leave') leave++;
          }
        });

        return {
          id: cls.id,
          name: cls.name,
          present,
          absent,
          leave,
          total
        };
      });

      setReportData(mappedData);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load class report data');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'class-report') {
      fetchClassReportData();
    }
  }, [activeView, selectedDate]);

  const [reportStartDate, setReportStartDate] = useState('2026-07-01');
  const [reportEndDate, setReportEndDate] = useState('2026-07-02');
  const [studentReportRecords, setStudentReportRecords] = useState<any[]>([]);
  const [studentReportLoading, setStudentReportLoading] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  const formatReportDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y.slice(2)}`;
  };

  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = parseDateOnly(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dateObj.getDay()];
  };

  const fetchStudentReportData = async () => {
    setStudentReportLoading(true);
    try {
      // 1. Fetch classes
      const classRes = await classService.getAll().catch(() => ({ data: [] }));
      const rawClasses = extractListData<any>(classRes.data || []);
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const rawAllClasses = [...rawClasses, ...customClasses];
      const seenClasses = new Set();
      const allClasses = rawAllClasses.filter((c: any) => {
        const cid = String(c.id || c.name);
        if (seenClasses.has(cid)) return false;
        seenClasses.add(cid);
        return true;
      });

      // 2. Fetch students
      const studentRes = await studentService.getAll().catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(studentRes.data || []);
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const allStudents = [...rawStudents, ...customStudents];

      // 3. Fetch all attendance records in range
      const datesInRange: string[] = [];
      let current = parseDateOnly(reportStartDate);
      const end = parseDateOnly(reportEndDate);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        datesInRange.push(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }

      let apiRecords: any[] = [];
      for (const dateStr of datesInRange) {
        try {
          const res = await api.get(`/auth/attendance/?date=${dateStr}`).catch(() => ({ data: [] }));
          const list = extractListData<any>(res.data || []);
          list.forEach((r: any) => {
            apiRecords.push({ ...r, date: dateStr });
          });
        } catch (e) {
          // ignore
        }
      }

      const localRecords = JSON.parse(localStorage.getItem('marked_student_attendance') || '[]');
      const matchingLocal = localRecords.filter((r: any) => r.date >= reportStartDate && r.date <= reportEndDate);
      
      const mergedAttendance = [...apiRecords];
      matchingLocal.forEach((lr: any) => {
        const index = mergedAttendance.findIndex(
          (a: any) => String(a.student_id) === String(lr.student_id) && a.date === lr.date
        );
        if (index === -1) {
          mergedAttendance.push(lr);
        } else {
          mergedAttendance[index] = { ...mergedAttendance[index], ...lr };
        }
      });

      // 4. Map to report format
      const mappedRecords: any[] = [];
      mergedAttendance.forEach((att: any) => {
        const student = allStudents.find((s: any) => 
          String(s.id) === String(att.student_id) || 
          (s.student_id && String(s.student_id) === String(att.student_id))
        );
        if (!student) return;

        const cls = allClasses.find((c: any) => {
          const studentClass = student.current_class || student.class_id || student.class_ref || student.class_name;
          return studentClass === c.id || studentClass === c.name;
        });

        const statusChar = att.status === 'present' || att.status === 'late'
          ? 'P'
          : att.status === 'absent'
            ? 'A'
            : att.status === 'excused' || att.status === 'on_leave' || att.status === 'leave'
              ? 'L'
              : 'H';

        mappedRecords.push({
          date: att.date,
          formattedDate: formatReportDate(att.date),
          day: getDayOfWeek(att.date),
          roll: student.student_id || student.roll_number || '001',
          name: student.full_name || 'Student Name',
          className: cls ? cls.name : (student.current_class || 'Grade 1-A'),
          statusChar
        });
      });

      mappedRecords.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.name.localeCompare(b.name);
      });

      setStudentReportRecords(mappedRecords);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load student report records');
    } finally {
      setStudentReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'student-report') {
      fetchStudentReportData();
    }
  }, [activeView, reportStartDate, reportEndDate]);

  const handleCopyReport = () => {
    const headers = ['DATE', 'DAY', 'ID', 'NAME', 'CLASS', 'STATUS'];
    const rows = studentReportRecords.map(r => [
      r.formattedDate,
      r.day,
      r.roll,
      r.name,
      r.className,
      r.statusChar
    ]);
    const text = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Report data copied to clipboard!');
  };

  const handleExportCSV = (filename = 'students_attendance_record.csv') => {
    const headers = ['DATE', 'DAY', 'ID', 'NAME', 'CLASS', 'STATUS'];
    const rows = studentReportRecords.map(r => [
      `"${r.formattedDate}"`,
      `"${r.day}"`,
      `"${r.roll}"`,
      `"${r.name}"`,
      `"${r.className}"`,
      `"${r.statusChar}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} exported successfully!`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const [staffReportRecords, setStaffReportRecords] = useState<any[]>([]);
  const [staffReportLoading, setStaffReportLoading] = useState(false);
  const [staffReportSearchQuery, setStaffReportSearchQuery] = useState('');

  const fetchStaffReportData = async () => {
    setStaffReportLoading(true);
    try {
      // 1. Fetch teachers
      const tRes = await api.get('/auth/academics/teachers/').catch(() => ({ data: [] }));
      const tList = extractListData<any>(tRes.data || []);
      const activeTList = tList.filter((t: any) => t.is_active);

      // 2. Fetch all teacher attendance in range
      const datesInRange: string[] = [];
      let current = parseDateOnly(reportStartDate);
      const end = parseDateOnly(reportEndDate);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        datesInRange.push(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }

      let apiRecords: any[] = [];
      for (const dateStr of datesInRange) {
        try {
          const res = await api.get(`/auth/academics/teacher-attendance/?date=${dateStr}`).catch(() => ({ data: [] }));
          const list = extractListData<any>(res.data || []);
          list.forEach((r: any) => {
            apiRecords.push({ ...r, date: dateStr });
          });
        } catch (e) {
          // ignore
        }
      }

      // 3. Map to report format
      const mappedRecords: any[] = [];
      apiRecords.forEach((att: any) => {
        const teacher = activeTList.find((t: any) => String(t.id) === String(att.teacher));
        if (!teacher) return;

        const statusChar = att.status === 'present'
          ? 'P'
          : att.status === 'absent'
            ? 'A'
            : att.status === 'on_leave' || att.status === 'leave'
              ? 'L'
              : 'H';

        mappedRecords.push({
          date: att.date,
          formattedDate: formatReportDate(att.date),
          day: getDayOfWeek(att.date),
          roll: teacher.employee_id || 'T-001',
          name: teacher.full_name || 'Staff Name',
          roleName: teacher.specializations && teacher.specializations.length > 0
            ? teacher.specializations.join(', ')
            : 'Teacher',
          statusChar
        });
      });

      mappedRecords.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.name.localeCompare(b.name);
      });

      setStaffReportRecords(mappedRecords);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load staff report records');
    } finally {
      setStaffReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'staff-report') {
      fetchStaffReportData();
    }
  }, [activeView, reportStartDate, reportEndDate]);

  const handleCopyStaffReport = () => {
    const headers = ['DATE', 'DAY', 'ID', 'NAME', 'TYPE', 'STATUS', 'TIME (Card scanning)'];
    const rows = staffReportRecords.map(r => [
      r.formattedDate,
      r.day,
      r.roll,
      r.name,
      r.roleName,
      r.statusChar,
      '-'
    ]);
    const text = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Report data copied to clipboard!');
  };

  const handleExportStaffCSV = (filename = 'employees_attendance_record.csv') => {
    const headers = ['DATE', 'DAY', 'ID', 'NAME', 'TYPE', 'STATUS', 'TIME (Card scanning)'];
    const rows = staffReportRecords.map(r => [
      `"${r.formattedDate}"`,
      `"${r.day}"`,
      `"${r.roll}"`,
      `"${r.name}"`,
      `"${r.roleName}"`,
      `"${r.statusChar}"`,
      `"-"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} exported successfully!`);
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
      const response = await classService.getAll().catch(() => ({ data: [] }));
      const rawClasses = extractListData<SchoolClass>(response.data || []);
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const seenClasses = new Set();
      let classList: SchoolClass[] = [...rawClasses, ...customClasses].filter((c: any) => {
        const cid = String(c.id || c.name);
        if (seenClasses.has(cid)) return false;
        seenClasses.add(cid);
        return true;
      });

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

      // Deduplicate classList by ID or name
      const uniqueClasses: SchoolClass[] = [];
      const seenClassIds = new Set();
      classList.forEach(c => {
        const cid = c.id || c.name;
        if (cid && !seenClassIds.has(cid)) {
          seenClassIds.add(cid);
          uniqueClasses.push(c);
        }
      });
      setClasses(uniqueClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  // FIXED: Properly handle the sections API response format
  const fetchSections = async (classId: string) => {
    if (!classId || classId.startsWith('cls-')) {
      setSections([]);
      setSelectedSection('');
      return;
    }
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
      
      // Auto-select first section if available. Sections are optional - many
      // classes embed the section in their name (e.g. "Grade 10A"), so the
      // absence of sections is normal and attendance is taken by class.
      if (sectionList.length > 0) {
        setSelectedSection(sectionList[0].id);
      } else {
        setSelectedSection('');
      }
      
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
      setSelectedSection('');
      toast.error('Failed to load sections');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }
    setManualSubmitClicked(true);
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
      
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const allStudents = [...rawStudents, ...customStudents];
      
      const filtered = allStudents.filter((s: any) => {
        const studentClass = s.current_class || s.class_id || s.class_ref || s.class_name;
        // Match either class name or ID/reference
        const isMatch = !selectedClass || 
          studentClass === selectedClass || 
          (classes.find(c => c.id === selectedClass)?.name === studentClass);
        
        return isMatch;
      });
      
      let existingAttendance: any[] = [];
      let hasExisting = false;
      
      const isCustomClass = selectedClass && selectedClass.startsWith('cls-');
      
      if (!isCustomClass) {
        try {
          const attResponse = await attendanceService.getByDate(
            selectedDate,
            selectedClass || undefined,
            selectedSection || undefined,
          );
          existingAttendance = attResponse.data || [];
          // If there are ANY records for this date+class → already taken
          hasExisting = existingAttendance.length > 0;
        } catch (err) {
          console.log('No existing attendance found');
        }
      }

      // Merge from localStorage for offline/fallback persistence
      try {
        const localRecords = JSON.parse(localStorage.getItem('marked_student_attendance') || '[]');
        const matchingLocal = localRecords.filter((r: any) => 
          r.date === selectedDate && 
          (!selectedClass || r.class_id === selectedClass)
        );
        if (matchingLocal.length > 0) {
          hasExisting = true;
          matchingLocal.forEach((lr: any) => {
            const index = existingAttendance.findIndex((a: any) => String(a.student_id) === String(lr.student_id));
            if (index !== -1) {
              existingAttendance[index] = { ...existingAttendance[index], ...lr, marked_by: 'local' };
            } else {
              existingAttendance.push({ ...lr, marked_by: 'local' });
            }
          });
        }
      } catch (e) {
        console.error('Error loading local attendance:', e);
      }
      
      const studentsWithStatus: AttendanceStudent[] = filtered.map((student) => {
        const existing = matchAttendanceRecord(existingAttendance, student);
        const status = resolveStatusForMarking(existing, selectedDate);
        const teacherMarked = Boolean(existing?.marked_by_id || existing?.marked_by_name || existing?.marked_by);
        return {
          id: student.id || `std-${Math.random()}`,
          student_id: student.student_id || student.registration_no || '001',
          full_name: student.full_name || student.name || 'Student Name',
          guardian_name: student.parent_name || student.guardian_name || student.father_name || 'Guardian Name',
          profile_picture: student.profile_picture || student.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
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
          class_id: selectedClass,
          section_id: selectedSection
        }));
      
      if (isFuture && recordsToSave.length === 0) {
        toast.info('No future holiday or leave changes selected to save.');
        setSaving(false);
        return;
      }
      
      console.log('Saving attendance records:', recordsToSave);
      
      const isCustomClass = selectedClass && selectedClass.startsWith('cls-');
      if (!isCustomClass) {
        try {
          await attendanceService.bulkSave(selectedDate, recordsToSave);
        } catch (apiErr) {
          console.warn('Backend API bulkSave failed, falling back to localStorage persistence:', apiErr);
        }
      }

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

      <Tabs value={activeView} className="space-y-4">

        <TabsContent value="students" className="space-y-6">
          
          {/* Top Breadcrumb Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
              <span className="text-slate-500 font-bold">Attendance</span>
              <span>|</span>
              <span className="text-slate-450 font-bold flex items-center gap-1">
                📁 - Mark or update Student Attendance
              </span>
            </div>
          </div>

          {/* Sub-tabs Selection - Replicates Manual vs Card scanning tabs */}
          <div className="flex border-b border-slate-150 print:hidden mb-1 select-none">
            <button
              onClick={() => {
                setSubTab('manual');
                setManualSubmitClicked(false);
              }}
              className={`px-6 py-2.5 text-xs font-bold transition-all border-t-2 border-x ${
                subTab === 'manual' 
                  ? 'bg-white border-t-[#5C53CD] border-x-slate-150 text-[#5C53CD] -mb-[1px] rounded-t-xl shadow-4xs' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Manual Attendance
            </button>
            <button
              onClick={() => setSubTab('card')}
              className={`px-6 py-2.5 text-xs font-bold transition-all border-t-2 border-x ${
                subTab === 'card' 
                  ? 'bg-white border-t-[#5C53CD] border-x-slate-150 text-[#5C53CD] -mb-[1px] rounded-t-xl shadow-4xs' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Card Scanning
            </button>
          </div>

          {subTab === 'card' ? (
            /* CARD SCANNING LOCKED VIEW - Matches Screenshot 2 exactly */
            <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[340px]">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#1C1656] tracking-tight">Mark attendance with card scanning</h3>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold mt-1">
                  <span className="flex items-center gap-1 text-[#5C53CD]"><span className="w-1.5 h-1.5 rounded-full bg-[#5C53CD] block"></span> Required*</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 block"></span> Optional</span>
                </div>
              </div>

              {/* Scanning yellow ID badge icon */}
              <div className="w-16 h-16 rounded-full bg-[#FFFBEB] flex items-center justify-center text-amber-500 shadow-inner">
                <Users className="w-7 h-7" />
              </div>

              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-slate-55 p-3.5 rounded-xl border border-slate-150">
                🔒 This option is locked. Available in paid Desktop version.
              </p>
            </div>
          ) : (
            /* MANUAL ATTENDANCE VIEW */
            !manualSubmitClicked ? (
              /* SELECTION FORM CARD - Matches Screenshot 1 exactly */
              <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-6 max-w-2xl mx-auto">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#1C1656] tracking-tight">Add/update attendance</h3>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold mt-1">
                    <span className="flex items-center gap-1 text-[#5C53CD]"><span className="w-1.5 h-1.5 rounded-full bg-[#5C53CD] block"></span> Required*</span>
                    <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 block"></span> Optional</span>
                  </div>
                </div>

                <form onSubmit={handleManualSubmit} className="w-full max-w-md space-y-5 text-left">
                  <div>
                    <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">DATE *</label>
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">SEARCH CLASS *</label>
                    <select
                      className="w-full h-11 px-4 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      type="submit"
                      className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      ✓ Submit
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ── MARKING SHEET — eskooly style ─────────────────────────── */
              <div className="space-y-4 max-w-2xl mx-auto">

                {/* Stats row */}
                {students.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'TOTAL STUDENTS', value: totalStudents, color: 'text-slate-700' },
                      { label: 'PRESENT',         value: presentCount,  color: 'text-emerald-600' },
                      { label: 'ABSENT',          value: absentCount,   color: 'text-rose-500' },
                      { label: 'LATE',            value: lateCount,     color: 'text-amber-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main attendance card */}
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">

                  {/* Card header */}
                  <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800">
                        {classes.find(c => c.id === selectedClass)?.name || 'Class'}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        {parseDateOnly(selectedDate).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    {hasSavedData && (
                      <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/>
                        Already Taken
                      </span>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="px-6 py-2.5 flex items-center gap-4 text-[10px] font-bold border-b border-slate-50 bg-slate-50/40">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> Present
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/> On Leave
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-500">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/> Absent
                    </span>
                  </div>

                  {/* Student rows */}
                  <div className="divide-y divide-slate-50">
                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                        No students found for this class
                      </div>
                    ) : (
                      students.map((student) => (
                        <div key={student.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors">

                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {student.profile_picture && !student.profile_picture.includes('unsplash') ? (
                              <img
                                src={student.profile_picture}
                                alt={student.full_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-100"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                                }}
                              />
                            ) : null}
                            <div
                              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-black text-sm border-2 border-purple-100"
                              hidden={!!(student.profile_picture && !student.profile_picture.includes('unsplash'))}
                            >
                              {student.full_name.charAt(0).toUpperCase()}
                            </div>
                          </div>

                          {/* Name + ID */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate capitalize">
                              {student.full_name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-semibold">{student.student_id} ↓</p>
                          </div>

                          {/* P / L / A buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Present */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'present')}
                              className={`w-8 h-8 rounded-full text-[11px] font-black transition-all border-2 ${
                                student.status === 'present'
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500'
                              }`}
                            >P</button>

                            {/* Leave */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'excused')}
                              className={`w-8 h-8 rounded-full text-[11px] font-black transition-all border-2 ${
                                student.status === 'excused'
                                  ? 'bg-amber-400 border-amber-400 text-white shadow-md shadow-amber-200'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500'
                              }`}
                            >L</button>

                            {/* Absent */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              className={`w-8 h-8 rounded-full text-[11px] font-black transition-all border-2 ${
                                student.status === 'absent'
                                  ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500'
                              }`}
                            >A</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Update Attendance button */}
                  {students.length > 0 && (
                    <div className="px-6 py-5 border-t border-slate-100 flex justify-center">
                      <button
                        type="button"
                        onClick={saveAttendance}
                        disabled={saving || students.length === 0}
                        className="flex items-center gap-2 px-10 py-3 bg-[#5C53CD] hover:bg-[#4b43c0] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-200 transition-all"
                      >
                        {saving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>✓</span>
                        )}
                        {hasSavedData ? 'Update Attendance' : 'Submit Attendance'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Back link */}
                <div className="flex justify-start">
                  <button
                    onClick={() => setManualSubmitClicked(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1 transition-colors"
                  >
                    ← Back to selection
                  </button>
                </div>

              </div>
            )
          )}

        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          
          {/* Top Breadcrumb Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
              <span className="text-slate-500 font-bold">Attendance</span>
              <span>|</span>
              <span className="text-slate-450 font-bold flex items-center gap-1">
                📁 - Mark or update Employee Attendance
              </span>
            </div>
          </div>

          {/* Sub-tabs Selection - Replicates Manual vs Card scanning tabs */}
          <div className="flex border-b border-slate-150 print:hidden mb-1 select-none">
            <button
              onClick={() => {
                setSubTab('manual');
                setTeacherSubmitClicked(false);
              }}
              className={`px-6 py-2.5 text-xs font-bold transition-all border-t-2 border-x ${
                subTab === 'manual' 
                  ? 'bg-white border-t-[#5C53CD] border-x-slate-150 text-[#5C53CD] -mb-[1px] rounded-t-xl shadow-4xs' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Manual Attendance
            </button>
            <button
              onClick={() => setSubTab('card')}
              className={`px-6 py-2.5 text-xs font-bold transition-all border-t-2 border-x ${
                subTab === 'card' 
                  ? 'bg-white border-t-[#5C53CD] border-x-slate-150 text-[#5C53CD] -mb-[1px] rounded-t-xl shadow-4xs' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Card Scanning
            </button>
          </div>

          {subTab === 'card' ? (
            /* CARD SCANNING LOCKED VIEW - Matches Screenshot 2 exactly */
            <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[340px]">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#1C1656] tracking-tight">Mark attendance with card scanning</h3>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold mt-1">
                  <span className="flex items-center gap-1 text-[#5C53CD]"><span className="w-1.5 h-1.5 rounded-full bg-[#5C53CD] block"></span> Required*</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 block"></span> Optional</span>
                </div>
              </div>

              {/* Scanning yellow ID badge icon */}
              <div className="w-16 h-16 rounded-full bg-[#FFFBEB] flex items-center justify-center text-amber-500 shadow-inner">
                <Users className="w-7 h-7" />
              </div>

              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-slate-55 p-3.5 rounded-xl border border-slate-150">
                🔒 This option is locked. Available in paid Desktop version.
              </p>
            </div>
          ) : (
            /* MANUAL ATTENDANCE VIEW */
            !teacherSubmitClicked ? (
              /* SELECTION FORM CARD - Matches Screenshot 1 format */
              <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-6 max-w-2xl mx-auto">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#1C1656] tracking-tight">Add/update attendance</h3>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold mt-1">
                    <span className="flex items-center gap-1 text-[#5C53CD]"><span className="w-1.5 h-1.5 rounded-full bg-[#5C53CD] block"></span> Required*</span>
                    <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 block"></span> Optional</span>
                  </div>
                </div>

                <form onSubmit={handleTeacherManualSubmit} className="w-full max-w-md space-y-5 text-left">
                  <div>
                    <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">DATE *</label>
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      type="submit"
                      className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      ✓ Submit
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* MARKING SHEET SCREEN */
              <div className="space-y-6">
                
                {/* Filters info header with back button */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-[#5C53CD] font-bold">
                      💼
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        Staff Members Attendance
                      </h4>
                      <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                        Marking Date: {selectedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isAdmin && (
                      <Button 
                        size="sm"
                        onClick={saveTeacherAttendance} 
                        disabled={savingTeachers || teachers.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        {savingTeachers ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {teacherHasSavedData ? 'Update Attendance' : 'Save Attendance'}
                      </Button>
                    )}
                    <button
                      onClick={() => setTeacherSubmitClicked(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      ← Back
                    </button>
                  </div>
                </div>

                {/* Statistics Cards Row */}
                {teachers.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-24">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Staff</span>
                      <span className="text-xl font-black text-blue-600 block">{totalTeachers}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-4 border-l-[#10B981] border border-slate-150 shadow-2xs flex flex-col justify-between h-24">
                      <span className="text-[9px] font-black text-[#10B981] uppercase tracking-widest block">Present</span>
                      <span className="text-xl font-black text-[#10B981] block">{teacherPresentCount}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-4 border-l-[#EF4444] border border-slate-150 shadow-2xs flex flex-col justify-between h-24">
                      <span className="text-[9px] font-black text-[#EF4444] uppercase tracking-widest block">Absent</span>
                      <span className="text-xl font-black text-[#EF4444] block">{teacherAbsentCount}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-4 border-l-purple-500 border border-slate-150 shadow-2xs flex flex-col justify-between h-24">
                      <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest block">On Leave</span>
                      <span className="text-xl font-black text-purple-500 block">{teacherLeaveCount}</span>
                    </div>
                  </div>
                )}

                {/* Staff Attendance marking list sheet */}
                <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-8 space-y-6 max-w-4xl mx-auto text-center flex flex-col items-center">
                  
                  {/* Attendance Header Status Details */}
                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold select-none">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      teacherHasSavedData ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
                    }`}>
                      {teacherHasSavedData ? 'Attendance taken' : 'Not taken yet'}
                    </span>
                    <span className="text-blue-600 font-extrabold">Employees</span>
                    <span className="text-slate-400">
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#1C1656] tracking-tight">Mark Attendance</h3>
                    {/* Status Legends */}
                    <div className="flex items-center justify-center gap-3 text-[10px] font-bold mt-1">
                      <span className="flex items-center gap-1 text-blue-600">
                        <span className="w-2 h-2 rounded-full bg-blue-600 block"></span> Present
                      </span>
                      <span className="flex items-center gap-1 text-purple-600">
                        <span className="w-2 h-2 rounded-full bg-purple-600 block"></span> On leave
                      </span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <span className="w-2 h-2 rounded-full bg-rose-500 block"></span> Absent
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto w-full rounded-xl border border-slate-100 mt-2">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider select-none text-[9px]">
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Employee Name</th>
                          <th className="py-3 px-4">Father Name</th>
                          <th className="py-3 px-4">Employee role</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold text-[10px]">
                        {teachers.map((teacher) => (
                          <tr key={teacher.id} className="hover:bg-slate-50/30 transition-colors">
                            {/* ID */}
                            <td className="py-2.5 px-4 font-mono text-slate-500">{teacher.employee_id || '250922'}</td>
                            
                            {/* Name */}
                            <td className="py-2.5 px-4 font-bold text-slate-800 text-left capitalize">
                              {teacher.full_name?.toLowerCase()}
                            </td>

                            {/* Father Name */}
                            <td className="py-2.5 px-4 text-slate-400 text-left">
                              -
                            </td>
                            
                            {/* Designation */}
                            <td className="py-2.5 px-4 text-slate-505 text-left capitalize">
                              {teacher.specializations && teacher.specializations.length > 0
                                ? teacher.specializations.join(', ')
                                : teacher.id === 'tch-1' ? 'Principal' : 'Teacher'}
                            </td>

                            {/* Status Buttons P, L, A */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex justify-center gap-2 select-none">
                                {/* Present */}
                                <button
                                  type="button"
                                  disabled={!isAdmin}
                                  onClick={() => handleTeacherStatusChange(teacher.id, 'present')}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all border ${
                                    teacher.status === 'present'
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                      : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'
                                  }`}
                                >
                                  P
                                </button>

                                {/* Leave */}
                                <button
                                  type="button"
                                  disabled={!isAdmin}
                                  onClick={() => handleTeacherStatusChange(teacher.id, 'on_leave')}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all border ${
                                    teacher.status === 'on_leave'
                                      ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                                      : 'bg-white border-slate-200 text-purple-600 hover:bg-slate-50'
                                  }`}
                                >
                                  L
                                </button>

                                {/* Absent */}
                                <button
                                  type="button"
                                  disabled={!isAdmin}
                                  onClick={() => handleTeacherStatusChange(teacher.id, 'absent')}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all border ${
                                    teacher.status === 'absent'
                                      ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                                      : 'bg-white border-slate-200 text-rose-500 hover:bg-slate-50'
                                  }`}
                                >
                                  A
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Centered Submit Button */}
                  {isAdmin && (
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={saveTeacherAttendance}
                        disabled={savingTeachers || teachers.length === 0}
                        className="px-10 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                      >
                        {savingTeachers ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>✓ Submit</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )
          )}

        </TabsContent>

        <TabsContent value="class-report" className="space-y-6">
          
          {/* Top Breadcrumb Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
              <span className="text-slate-500 font-bold">Attendance</span>
              <span>|</span>
              <span className="text-slate-450 font-bold flex items-center gap-1">
                📁 - Class wise Attendance Report
              </span>
            </div>
          </div>

          {/* Date Selector Filter Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm print:hidden max-w-sm">
            <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">SELECT REPORT DATE *</label>
            <input
              type="date"
              className="w-full h-11 px-4 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </div>

          {reportLoading ? (
            <div className="flex justify-center items-center h-48">
              <RefreshCw className="animate-spin rounded-full h-8 w-8 text-[#5C53CD]" />
            </div>
          ) : (
            /* Grid layout of class cards */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reportData.map((clsData) => (
                <div key={clsData.id} className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 text-center flex flex-col justify-between min-h-[300px]">
                  
                  {/* Card Header */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Attendance report: {new Date(selectedDate).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })} for
                    </p>
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-tight">
                      {clsData.name}
                    </h4>
                  </div>

                  {/* Body Content */}
                  {clsData.total === 0 ? (
                    /* NOT MARKED YET VIEW - Replicates Screenshot 2/3 sad face */
                    <div className="flex flex-col items-center justify-center space-y-3 py-6 select-none">
                      <span className="text-4xl text-amber-400 block animate-bounce">😞</span>
                      <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Attendance is not marked yet.
                      </p>
                    </div>
                  ) : (
                    /* MARKED VIEW - Replicates Screenshot 3 SVG Donut Chart */
                    (() => {
                      const radius = 35;
                      const circ = 2 * Math.PI * radius; // ~219.9
                      const pDash = (clsData.present / clsData.total) * circ;
                      const lDash = (clsData.leave / clsData.total) * circ;
                      const aDash = (clsData.absent / clsData.total) * circ;

                      return (
                        <div className="flex flex-col items-center justify-center space-y-4 py-2">
                          <div className="relative w-28 h-28 flex items-center justify-center select-none">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              {/* Gray base circle */}
                              <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                stroke="#f1f5f9"
                                strokeWidth="12"
                              />
                              
                              {/* Present (Blue) */}
                              {pDash > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="transparent"
                                  stroke="#3b82f6"
                                  strokeWidth="12"
                                  strokeDasharray={`${pDash} ${circ - pDash}`}
                                  strokeDashoffset={0}
                                  className="transition-all duration-500 ease-out"
                                />
                              )}

                              {/* On Leave (Purple) */}
                              {lDash > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="transparent"
                                  stroke="#8b5cf6"
                                  strokeWidth="12"
                                  strokeDasharray={`${lDash} ${circ - lDash}`}
                                  strokeDashoffset={-pDash}
                                  className="transition-all duration-500 ease-out"
                                />
                              )}

                              {/* Absent (Red) */}
                              {aDash > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="transparent"
                                  stroke="#ef4444"
                                  strokeWidth="12"
                                  strokeDasharray={`${aDash} ${circ - aDash}`}
                                  strokeDashoffset={-(pDash + lDash)}
                                  className="transition-all duration-500 ease-out"
                                />
                              )}
                            </svg>
                            
                            {/* Centered Total Count */}
                            <div className="absolute text-center">
                              <p className="text-lg font-black text-slate-800">{clsData.total}</p>
                              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                            </div>
                          </div>

                          {/* Legends under donut chart */}
                          <div className="flex items-center justify-center gap-3 text-[9px] font-bold mt-2">
                            <span className="flex items-center gap-1 text-blue-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 block"></span> P: {clsData.present}
                            </span>
                            <span className="flex items-center gap-1 text-purple-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 block"></span> L: {clsData.leave}
                            </span>
                            <span className="flex items-center gap-1 text-rose-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block"></span> A: {clsData.absent}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  )}
                  
                  {/* Bottom Action spacer */}
                  <div className="pt-2"></div>
                </div>
              ))}
              {reportData.length === 0 && (
                <div className="col-span-full bg-white p-12 text-center rounded-3xl border border-slate-150 shadow-sm text-slate-450 font-bold">
                  No classes registered to display report.
                </div>
              )}
            </div>
          )}

        </TabsContent>

        <TabsContent value="student-report" className="space-y-6">
          
          {/* Print only Header Title */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-xl font-black text-slate-800">
              Students attendance record ({new Date(reportStartDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })} - {new Date(reportEndDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })})
            </h1>
          </div>

          {/* Top Breadcrumb Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
              <span className="text-slate-500 font-bold">Attendance</span>
              <span>|</span>
              <span className="text-slate-450 font-bold flex items-center gap-1">
                📁 - Students Attendance Record
              </span>
            </div>
          </div>

          {/* Blue Date Range Selector Card - Matches Screenshot 2 */}
          <div className="bg-[#5C53CD] p-6 rounded-2xl border border-[#4c43bd] shadow-sm print:hidden text-white space-y-4 max-w-lg">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Calendar className="w-4 h-4" />
              <span>Select Date Range</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black tracking-wider text-purple-200 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-lg border-0 bg-white/10 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white focus:bg-white/20 transition-all placeholder-white/50"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black tracking-wider text-purple-200 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-lg border-0 bg-white/10 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white focus:bg-white/20 transition-all placeholder-white/50"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Data Table Card */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden p-6 print:border-0 print:shadow-none print:p-0">
            {/* Top Toolbar: Buttons & Search */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 print:hidden mb-4">
              <div className="flex flex-wrap items-center gap-1.5 select-none">
                <button
                  onClick={handleCopyReport}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleExportCSV('students_attendance_record.csv')}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExportCSV('students_attendance_record.csv')}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  Excel
                </button>
                <button
                  onClick={handlePrintReport}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  PDF
                </button>
                <button
                  onClick={handlePrintReport}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  Print
                </button>
              </div>

              {/* Search filter input */}
              <div className="flex items-center gap-2 select-none text-[10px] font-bold text-slate-400">
                <span>Search:</span>
                <input
                  type="text"
                  className="h-8 px-3 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {studentReportLoading ? (
              <div className="flex justify-center items-center h-48">
                <RefreshCw className="animate-spin rounded-full h-8 w-8 text-[#5C53CD]" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-100 print:border-slate-200">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-100 print:text-slate-700">
                        <th className="py-2.5 px-4 text-center">DATE</th>
                        <th className="py-2.5 px-4 text-center">DAY</th>
                        <th className="py-2.5 px-4 text-center">ID</th>
                        <th className="py-2.5 px-4">NAME</th>
                        <th className="py-2.5 px-4">CLASS</th>
                        <th className="py-2.5 px-4 text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold print:divide-slate-200">
                      {studentReportRecords
                        .filter(r =>
                          r.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                          r.roll.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                          r.className.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                          r.statusChar.toLowerCase().includes(reportSearchQuery.toLowerCase())
                        )
                        .map((rec, index) => (
                          <tr key={index} className="hover:bg-slate-50/30 transition-colors print:hover:bg-transparent">
                            <td className="py-2 px-4 text-center font-mono text-slate-500">{rec.formattedDate}</td>
                            <td className="py-2 px-4 text-center text-slate-500">{rec.day}</td>
                            <td className="py-2 px-4 text-center font-mono text-slate-500">{rec.roll}</td>
                            <td className="py-2 px-4 font-bold text-slate-800 capitalize">{rec.name?.toLowerCase()}</td>
                            <td className="py-2 px-4 text-slate-550 capitalize">{rec.className}</td>
                            <td className="py-2 px-4 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                rec.statusChar === 'P'
                                  ? 'text-blue-600 bg-blue-50'
                                  : rec.statusChar === 'L'
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-rose-600 bg-rose-50'
                              }`}>
                                {rec.statusChar}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer text */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 select-none print:hidden">
                  <span>
                    Showing 1 to {
                      studentReportRecords.filter(r =>
                        r.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                        r.roll.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                        r.className.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                        r.statusChar.toLowerCase().includes(reportSearchQuery.toLowerCase())
                      ).length
                    } of {studentReportRecords.length} entries
                  </span>
                </div>
              </div>
            )}
          </div>

        </TabsContent>

        <TabsContent value="staff-report" className="space-y-6">
          
          {/* Print only Header Title */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-xl font-black text-slate-800">
              Employees attendance record ({new Date(reportStartDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })} - {new Date(reportEndDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })})
            </h1>
          </div>

          {/* Top Breadcrumb Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
              <span className="text-slate-500 font-bold">Attendance</span>
              <span>|</span>
              <span className="text-slate-450 font-bold flex items-center gap-1">
                📁 - Employees Attendance Record
              </span>
            </div>
          </div>

          {/* Blue Date Range Selector Card - Matches eSkooly */}
          <div className="bg-[#5C53CD] p-6 rounded-2xl border border-[#4c43bd] shadow-sm print:hidden text-white space-y-4 max-w-lg">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Calendar className="w-4 h-4" />
              <span>Select Date Range</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black tracking-wider text-purple-200 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-lg border-0 bg-white/10 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white focus:bg-white/20 transition-all placeholder-white/50"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black tracking-wider text-purple-200 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-lg border-0 bg-white/10 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white focus:bg-white/20 transition-all placeholder-white/50"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Data Table Card */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden p-6 print:border-0 print:shadow-none print:p-0">
            {/* Top Toolbar: Buttons & Search */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 print:hidden mb-4">
              <div className="flex flex-wrap items-center gap-1.5 select-none">
                <button
                  onClick={handleCopyStaffReport}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleExportStaffCSV('employees_attendance_record.csv')}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExportStaffCSV('employees_attendance_record.csv')}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  Excel
                </button>
                <button
                  onClick={handlePrintReport}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  PDF
                </button>
                <button
                  onClick={handlePrintReport}
                  className="px-3.5 py-1.5 border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-50 transition-all uppercase shadow-4xs"
                >
                  Print
                </button>
              </div>

              {/* Search filter input */}
              <div className="flex items-center gap-2 select-none text-[10px] font-bold text-slate-400">
                <span>Search:</span>
                <input
                  type="text"
                  className="h-8 px-3 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  value={staffReportSearchQuery}
                  onChange={(e) => setStaffReportSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {staffReportLoading ? (
              <div className="flex justify-center items-center h-48">
                <RefreshCw className="animate-spin rounded-full h-8 w-8 text-[#5C53CD]" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-100 print:border-slate-200">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-100 print:text-slate-700">
                        <th className="py-2.5 px-4 text-center">DATE</th>
                        <th className="py-2.5 px-4 text-center">DAY</th>
                        <th className="py-2.5 px-4 text-center">ID</th>
                        <th className="py-2.5 px-4">NAME</th>
                        <th className="py-2.5 px-4">TYPE</th>
                        <th className="py-2.5 px-4 text-center">STATUS</th>
                        <th className="py-2.5 px-4 text-center">TIME <span className="text-[7px] font-normal lowercase italic">(card scanning)</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold print:divide-slate-200">
                      {staffReportRecords
                        .filter(r =>
                          r.name.toLowerCase().includes(staffReportSearchQuery.toLowerCase()) ||
                          r.roll.toLowerCase().includes(staffReportSearchQuery.toLowerCase()) ||
                          r.roleName.toLowerCase().includes(staffReportSearchQuery.toLowerCase()) ||
                          r.statusChar.toLowerCase().includes(staffReportSearchQuery.toLowerCase())
                        )
                        .map((rec, index) => (
                          <tr key={index} className="hover:bg-slate-50/30 transition-colors print:hover:bg-transparent">
                            <td className="py-2 px-4 text-center font-mono text-slate-500">{rec.formattedDate}</td>
                            <td className="py-2 px-4 text-center text-slate-500">{rec.day}</td>
                            <td className="py-2 px-4 text-center font-mono text-slate-500">{rec.roll}</td>
                            <td className="py-2 px-4 font-bold text-slate-800 capitalize">{rec.name?.toLowerCase()}</td>
                            <td className="py-2 px-4 text-slate-550 capitalize">{rec.roleName}</td>
                            <td className="py-2 px-4 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                rec.statusChar === 'P'
                                  ? 'text-blue-600 bg-blue-50'
                                  : rec.statusChar === 'L'
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-rose-600 bg-rose-50'
                              }`}>
                                {rec.statusChar}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-center font-mono text-slate-400">-</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer text */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 select-none print:hidden">
                  <span>
                    Showing 1 to {
                      staffReportRecords.filter(r =>
                        r.name.toLowerCase().includes(staffReportSearchQuery.toLowerCase()) ||
                        r.roll.toLowerCase().includes(staffReportSearchQuery.toLowerCase()) ||
                        r.roleName.toLowerCase().includes(staffReportSearchQuery.toLowerCase()) ||
                        r.statusChar.toLowerCase().includes(staffReportSearchQuery.toLowerCase())
                      ).length
                    } of {staffReportRecords.length} entries
                  </span>
                </div>
              </div>
            )}
          </div>

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