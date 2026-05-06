import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, 
  Save, RefreshCw, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import api from '@/services/api';
import studentService from '@/services/student.service';
import classService, { SchoolClass } from '@/services/class.service';

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<string, string>>(new Map());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const navigate = useNavigate();

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
      fetchStudents();
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

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Get all students
      const response = await studentService.getAll();
      let allStudents = [];
      if (Array.isArray(response.data)) {
        allStudents = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        allStudents = response.data.results;
      }
      
      // Filter by selected class and section
      const filtered = allStudents.filter(s => {
        const classMatch = !selectedClass || s.current_class === selectedClass;
        const sectionMatch = !selectedSection || s.current_section === selectedSection;
        return classMatch && sectionMatch;
      });
      
      setStudents(filtered);
      
      // Fetch existing attendance for these students on selected date
      await fetchExistingAttendance(filtered);
      
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async (studentsList: Student[]) => {
    try {
      // Fetch all attendance records for this date
      const response = await api.get(`/auth/attendance/?date=${selectedDate}`);
      const records = response.data || [];
      
      // Create a map of student_id -> status from existing records
      const existingStatus = new Map();
      records.forEach((record: any) => {
        existingStatus.set(record.student_id, record.status);
      });
      
      // Initialize attendance map: use existing status if found, otherwise default to 'present'
      const newAttendance = new Map();
      studentsList.forEach(student => {
        const existing = existingStatus.get(student.id);
        newAttendance.set(student.id, existing || 'present');
      });
      
      setAttendance(newAttendance);
      updateSummary(newAttendance);
      
    } catch (error) {
      console.error('Error fetching existing attendance:', error);
      // If error, default all to present
      const newAttendance = new Map();
      studentsList.forEach(student => {
        newAttendance.set(student.id, 'present');
      });
      setAttendance(newAttendance);
      updateSummary(newAttendance);
    }
  };

  const updateSummary = (attendanceMap: Map<string, string>) => {
    let present = 0, absent = 0, late = 0;
    attendanceMap.forEach((status) => {
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
    });
    setSummary({ present, absent, late, total: students.length });
  };

  const handleStatusChange = (studentId: string, status: string) => {
    const newAttendance = new Map(attendance);
    newAttendance.set(studentId, status);
    setAttendance(newAttendance);
    updateSummary(newAttendance);
  };

  const markAllPresent = () => {
    const newAttendance = new Map();
    students.forEach(student => {
      newAttendance.set(student.id, 'present');
    });
    setAttendance(newAttendance);
    updateSummary(newAttendance);
  };

  const markAllAbsent = () => {
    const newAttendance = new Map();
    students.forEach(student => {
      newAttendance.set(student.id, 'absent');
    });
    setAttendance(newAttendance);
    updateSummary(newAttendance);
  };

  const saveAttendance = async () => {
    setSaving(true);
    setSavedStatus('idle');
    
    try {
      const records = Array.from(attendance.entries()).map(([studentId, status]) => ({
        student_id: studentId,
        status,
        date: selectedDate,
        class_id: selectedClass,
        section_id: selectedSection
      }));
      
      await api.post('/auth/attendance/bulk/', { records });
      setSavedStatus('success');
      
      // Refresh to ensure UI is in sync with server
      setTimeout(() => {
        setSavedStatus('idle');
        // Reload to confirm saved data
        fetchStudents();
      }, 2000);
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      setSavedStatus('error');
      setTimeout(() => setSavedStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const attendanceRate = summary.total > 0 ? (summary.present / summary.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-gray-500">Mark and track student attendance</p>
        </div>
        <Button onClick={saveAttendance} disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Attendance
        </Button>
      </div>

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
            
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={markAllPresent} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                All Present
              </Button>
              <Button variant="outline" onClick={markAllAbsent} className="flex-1">
                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                All Absent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedSection && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Students</p><p className="text-2xl font-bold">{summary.total}</p></div><Users className="w-8 h-8 text-blue-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Present</p><p className="text-2xl font-bold text-green-600">{summary.present}</p></div><CheckCircle className="w-8 h-8 text-green-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Absent</p><p className="text-2xl font-bold text-red-600">{summary.absent}</p></div><XCircle className="w-8 h-8 text-red-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Late</p><p className="text-2xl font-bold text-orange-600">{summary.late}</p></div><Clock className="w-8 h-8 text-orange-500" /></div></CardContent></Card>
        </div>
      )}

      {summary.total > 0 && (
        <Card><CardContent className="pt-6"><div className="flex justify-between text-sm mb-2"><span>Attendance Rate</span><span className={attendanceRate >= 75 ? 'text-green-600' : 'text-red-600'}>{attendanceRate.toFixed(1)}%</span></div><Progress value={attendanceRate} /></CardContent></Card>
      )}

      {savedStatus === 'success' && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">✅ Attendance saved successfully!</div>}
      {savedStatus === 'error' && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">❌ Failed to save attendance. Please try again.</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : students.length === 0 ? (
        <Card><CardContent className="text-center py-12"><AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="text-gray-500">No students found in this class/section</p></CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Mark Attendance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="px-4 py-3 text-left">Student ID</th><th className="px-4 py-3 text-left">Student Name</th><th className="px-4 py-3 text-left">Status</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{student.student_id}</td>
                      <td className="px-4 py-3 font-medium">{student.full_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleStatusChange(student.id, 'present')} className={`px-3 py-1 rounded-lg flex items-center gap-1 transition ${attendance.get(student.id) === 'present' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}><CheckCircle className="w-4 h-4" />Present</button>
                          <button onClick={() => handleStatusChange(student.id, 'absent')} className={`px-3 py-1 rounded-lg flex items-center gap-1 transition ${attendance.get(student.id) === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}><XCircle className="w-4 h-4" />Absent</button>
                          <button onClick={() => handleStatusChange(student.id, 'late')} className={`px-3 py-1 rounded-lg flex items-center gap-1 transition ${attendance.get(student.id) === 'late' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-100'}`}><Clock className="w-4 h-4" />Late</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
