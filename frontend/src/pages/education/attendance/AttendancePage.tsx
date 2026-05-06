import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, 
  Save, RefreshCw, AlertCircle, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import api from '@/services/api';
import studentService from '@/services/student.service';
import classService, { SchoolClass, Section } from '@/services/class.service';

interface AttendanceStudent {
  id: string;
  student_id: string;
  full_name: string;
  status: 'present' | 'absent' | 'late';
  savedStatus?: 'present' | 'absent' | 'late';
  isSaved: boolean;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const navigate = useNavigate();

  // Statistics based on actual student data
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const lateCount = students.filter(s => s.status === 'late').length;
  const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

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
      // Fetch all students
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
        return classMatch && sectionMatch && s.is_active === true;
      });
      
      // Fetch existing attendance for this date
      let existingAttendance: any[] = [];
      let hasExisting = false;
      try {
        const attResponse = await api.get(`/auth/attendance/?date=${selectedDate}`);
        existingAttendance = attResponse.data || [];
        hasExisting = existingAttendance.length > 0;
      } catch (err) {
        console.log('No existing attendance found');
      }
      
      // Map students with their saved status
      const studentsWithStatus: AttendanceStudent[] = filtered.map(student => {
        const existing = existingAttendance.find((a: any) => a.student_id === student.id);
        const savedStatus = existing?.status;
        return {
          id: student.id,
          student_id: student.student_id,
          full_name: student.full_name,
          status: savedStatus || 'present',
          savedStatus: savedStatus,
          isSaved: !!existing
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

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, status: status } : s
    ));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
    toast.success(`✓ All ${students.length} students marked as Present`);
  };

  const markAllAbsent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'absent' })));
    toast.success(`✓ All ${students.length} students marked as Absent`);
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
      
      await api.post('/auth/attendance/bulk/', { records });
      
      // Update saved status for all students
      setStudents(prev => prev.map(s => ({ 
        ...s, 
        savedStatus: s.status,
        isSaved: true 
      })));
      setHasSavedData(true);
      
      toast.success(`Attendance saved successfully! (${students.length} students)`);
      
      // Refresh to get latest data
      await fetchStudentsAndAttendance();
      
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late': return <Clock className="w-4 h-4 text-orange-600" />;
      default: return null;
    }
  };

  const getStatusButtonClass = (currentStatus: string, buttonStatus: string) => {
    if (currentStatus === buttonStatus) {
      switch (buttonStatus) {
        case 'present': return 'bg-green-600 text-white border-green-600';
        case 'absent': return 'bg-red-600 text-white border-red-600';
        case 'late': return 'bg-orange-600 text-white border-orange-600';
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
            
            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                onClick={markAllPresent} 
                className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                disabled={students.length === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                All Present
              </Button>
              <Button 
                variant="outline" 
                onClick={markAllAbsent} 
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                disabled={students.length === 0}
              >
                <XCircle className="w-4 h-4 mr-2" />
                All Absent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards - FIXED: Based on actual student data */}
      {students.length > 0 ? (
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
      ) : null}

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
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{student.student_id}</td>
                      <td className="px-4 py-3 font-medium">{student.full_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${getStatusButtonClass(student.status, 'present')}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Present
                          </button>
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
                        </div>
                       </td>
                      <td className="px-4 py-3">
                        {student.isSaved ? (
                          <div className="flex flex-col">
    <div className="flex flex-col">
    <Badge variant="success" className="flex items-center gap-1 w-fit">
      <CheckCircle className="w-3 h-3" /> Saved
    </Badge>
    <span className="text-xs text-gray-400 mt-1">Today at {new Date().toLocaleTimeString()}</span>
  </div>
    <span className="text-xs text-gray-400 mt-1">Today at {new Date().toLocaleTimeString()}</span>
  </div>
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
    </div>
  );
}


