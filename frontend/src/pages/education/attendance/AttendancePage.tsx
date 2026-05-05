import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, Save, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/services/api';
import classService, { SchoolClass } from '@/services/class.service';
import studentService from '@/services/student.service';

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  attendance_status?: 'present' | 'absent' | 'late';
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && students.length > 0) {
      fetchExistingAttendance();
    }
  }, [selectedClass, selectedDate, students.length]);

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getAll();
      let allStudents: any[] = [];
      if (Array.isArray(response.data)) {
        allStudents = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        allStudents = response.data.results;
      }
      
      let filteredStudents = allStudents;
      if (selectedClass) {
        filteredStudents = allStudents.filter(s => s.current_class === selectedClass);
      }
      
      setStudents(filteredStudents.map((s: any) => ({
        id: s.id,
        student_id: s.student_id,
        full_name: s.full_name,
        attendance_status: 'present'
      })));
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    if (!selectedClass) return;
    try {
      const response = await api.get('/attendance/', {
        params: { date: selectedDate, class_id: selectedClass }
      });
      
      if (response.data && response.data.length > 0) {
        const attendanceMap = new Map();
        response.data.forEach((record: any) => {
          attendanceMap.set(record.student_id, record.status);
        });
        
        setStudents(prev => prev.map(s => ({
          ...s,
          attendance_status: (attendanceMap.get(s.id) as 'present' | 'absent' | 'late') || 'present'
        })));
      }
    } catch (error) {
      console.error('Error fetching existing attendance:', error);
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, attendance_status: status } : s
    ));
  };

  const handleBulkStatusChange = (status: 'present' | 'absent' | 'late') => {
    const studentsToUpdate = selectedStudents.length > 0 ? selectedStudents : students.map(s => s.id);
    setStudents(prev => prev.map(s => 
      studentsToUpdate.includes(s.id) ? { ...s, attendance_status: status } : s
    ));
    setSelectedStudents([]);
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === paginatedStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(paginatedStudents.map(s => s.id));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        status: s.attendance_status
      }));
      
      const response = await api.post('/attendance/bulk/', {
        date: selectedDate,
        records: records
      });
      
      if (response.status === 200) {
        alert(`Attendance saved successfully! ${response.data.message || ''}`);
      }
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppAlerts = () => {
    const absentStudents = students.filter(s => s.attendance_status === 'absent');
    if (absentStudents.length === 0) {
      alert('No absent students to notify');
      return;
    }
    alert(`Send WhatsApp alerts to ${absentStudents.length} parents?`);
  };

  const paginatedStudents = students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(students.length / itemsPerPage);
  
  const presentCount = students.filter(s => s.attendance_status === 'present').length;
  const absentCount = students.filter(s => s.attendance_status === 'absent').length;
  const lateCount = students.filter(s => s.attendance_status === 'late').length;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'present': return <Badge className="bg-green-100 text-green-700">PRESENT</Badge>;
      case 'absent': return <Badge className="bg-red-100 text-red-700">ABSENT</Badge>;
      case 'late': return <Badge className="bg-yellow-100 text-yellow-700">LATE</Badge>;
      default: return <Badge>UNKNOWN</Badge>;
    }
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
      <div>
        <h1 className="text-2xl font-bold">Attendance Management</h1>
        <p className="text-gray-500">Mark daily attendance for students</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Class</label>
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
              <label className="block text-sm font-medium mb-1">Date</label>
              <input 
                type="date" 
                className="w-full border rounded-lg px-3 py-2"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={saveAttendance} disabled={saving || !selectedClass} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && students.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-blue-700">{students.length}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-700">{presentCount}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-700">{absentCount}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-bold text-yellow-700">{lateCount}</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button onClick={() => handleBulkStatusChange('present')} className="bg-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark All Present
                  </Button>
                  <Button onClick={() => handleBulkStatusChange('absent')} variant="destructive">
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark All Absent
                  </Button>
                  <Button onClick={() => handleBulkStatusChange('late')} className="bg-yellow-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Mark All Late
                  </Button>
                </div>
                {absentCount > 0 && (
                  <Button onClick={sendWhatsAppAlerts} variant="outline" className="border-green-500 text-green-600">
                    <Send className="w-4 h-4 mr-2" />
                    Send WhatsApp Alerts ({absentCount})
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 w-10 text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Student ID</th>
                      <th className="px-4 py-3 text-left">Student Name</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => (
                      <tr key={student.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleSelectStudent(student.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{student.student_id}</td>
                        <td className="px-4 py-3 font-medium">{student.full_name}</td>
                        <td className="px-4 py-3">{getStatusBadge(student.attendance_status || 'present')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleStatusChange(student.id, 'present')}
                              className="px-3 py-1 rounded text-xs bg-green-100 hover:bg-green-200"
                            >
                              P
                            </button>
                            <button 
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              className="px-3 py-1 rounded text-xs bg-red-100 hover:bg-red-200"
                            >
                              A
                            </button>
                            <button 
                              onClick={() => handleStatusChange(student.id, 'late')}
                              className="px-3 py-1 rounded text-xs bg-yellow-100 hover:bg-yellow-200"
                            >
                              L
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, students.length)} of {students.length}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-3 py-1 text-sm bg-gray-100 rounded-lg">{currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedClass && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Select a class to mark attendance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
