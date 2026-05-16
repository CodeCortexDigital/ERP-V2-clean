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
import attendanceService from '@/services/attendance.service';
import studentService from '@/services/student.service';
import classService, { SchoolClass, Section } from '@/services/class.service';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday';

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

/** Present on school days / holiday on Sunday; only keep absent/late if a teacher saved it. */
function resolveStatusForMarking(
  existing: { status?: string; marked_by_id?: string | null; marked_by_name?: string } | undefined,
  dateStr: string,
): AttendanceStatus {
  const def = defaultStatusForDate(dateStr);
  if (!existing?.status) return def;

  const teacherMarked = Boolean(existing.marked_by_id || existing.marked_by_name);
  if (!teacherMarked) return def;

  const s = String(existing.status).toLowerCase();
  if (s === 'present' || s === 'absent' || s === 'late' || s === 'holiday') {
    return s as AttendanceStatus;
  }
  return def;
}

export default function AttendancePage() {
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

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId: string) => {
    try {
      const response = await classService.getSections(classId);
      setSections(response.data || []);
      if (response.data?.length > 0) {
        setSelectedSection(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
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
      }
      
      const filtered = allStudents.filter((s: any) => {
        const classMatch = !selectedClass || s.current_class === selectedClass;
        const sectionMatch = !selectedSection || s.current_section === selectedSection;
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
        const existing = matchAttendanceRecord(existingAttendance, student);
        const status = resolveStatusForMarking(existing, selectedDate);
        const teacherMarked = Boolean(existing?.marked_by_id || existing?.marked_by_name);
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

  const saveAttendance = async () => {
    if (students.length === 0) {
      toast.error('No students to save attendance for');
      return;
    }

    setSaving(true);
    
    try {
      const records = students.map(student => ({
        student_id: student.id,
        status: student.status,
        date: selectedDate,
        class_id: selectedClass,
        section_id: selectedSection
      }));
      
      await attendanceService.bulkSave(records);
      
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
      toast.error(error.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleViewHistory = async (student: any) => {
    setSelectedStudent(student);
    try {
      const response = await attendanceService.getStudentHistory(student.id);
      setStudentHistory(response.data);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error fetching student history:', error);
      setStudentHistory([]);
      setShowHistoryModal(true);
    }
  };

  const getStatusButtonClass = (currentStatus: string, buttonStatus: string) => {
    if (currentStatus === buttonStatus) {
      switch (buttonStatus) {
        case 'present': return 'bg-green-600 text-white border-green-600';
        case 'absent': return 'bg-red-600 text-white border-red-600';
        case 'late': return 'bg-orange-600 text-white border-orange-600';
        case 'holiday': return 'bg-purple-600 text-white border-purple-600';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-gray-500">Mark and track student attendance</p>
        </div>
        <Button 
          onClick={saveAttendance} 
          disabled={saving || students.length === 0}
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
                  <p className="text-2xl font-bold text-blue-700">{studentHistory.length}</p>
                  <p className="text-xs text-gray-600">Total Days</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{studentHistory.filter((h: any) => h.status === 'present').length}</p>
                  <p className="text-xs text-gray-600">Present</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {studentHistory.length > 0 ? Math.round((studentHistory.filter((h: any) => h.status === 'present').length / studentHistory.length) * 100) : 0}%
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
                      {studentHistory.map((record: any) => (
                        <tr key={record.id || `${record.date}-${record.status}`} className="border-t">
                          <td className="p-2">{record.date}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                record.status === 'present'
                                  ? 'success'
                                  : record.status === 'absent'
                                    ? 'danger'
                                    : record.status === 'holiday'
                                      ? 'secondary'
                                      : 'warning'
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
