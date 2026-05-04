import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Search, Filter, Save, Check, X, Clock, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import classService from '@/services/class.service';

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  status?: 'present' | 'absent' | 'late';
}

export default function AttendancePage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSections();
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

  const fetchSections = async () => {
    try {
      const response = await api.get(`/api/classes/${selectedClass}/sections/`);
      setSections(response.data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/classes/${selectedClass}/students/`, {
        params: { section: selectedSection, date: selectedDate }
      });
      const studentsWithStatus = (response.data || []).map(s => ({
        ...s,
        status: s.attendance_status || 'present'
      }));
      setStudents(studentsWithStatus);
      updateSummary(studentsWithStatus);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSummary = (studentList: Student[]) => {
    const present = studentList.filter(s => s.status === 'present').length;
    const absent = studentList.filter(s => s.status === 'absent').length;
    const late = studentList.filter(s => s.status === 'late').length;
    setSummary({ present, absent, late });
  };

  const updateStudentStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    const updatedStudents = students.map(s =>
      s.id === studentId ? { ...s, status } : s
    );
    setStudents(updatedStudents);
    updateSummary(updatedStudents);
  };

  const markAll = (status: 'present' | 'absent' | 'late') => {
    const updatedStudents = students.map(s => ({ ...s, status }));
    setStudents(updatedStudents);
    updateSummary(updatedStudents);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendanceData = students.map(s => ({
        student_id: s.id,
        status: s.status,
        date: selectedDate,
        class_id: selectedClass,
        section_id: selectedSection
      }));
      
      await api.post('/api/attendance/bulk/', { records: attendanceData });
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-300';
      case 'absent': return 'bg-red-100 text-red-700 border-red-300';
      case 'late': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Mark and manage student attendance</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
            >
              <option value="">Select Section</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
            
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {students.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <Check className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
            <p className="text-sm text-gray-600">Present</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
            <p className="text-sm text-gray-600">Late</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <X className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
            <p className="text-sm text-gray-600">Absent</p>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {students.length > 0 && (
        <div className="flex gap-2 justify-end">
          <button onClick={() => markAll('present')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200">All Present</button>
          <button onClick={() => markAll('late')} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200">All Late</button>
          <button onClick={() => markAll('absent')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">All Absent</button>
        </div>
      )}

      {/* Student List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No students found for selected class</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{student.full_name}</p>
                    <p className="text-xs text-gray-400">{student.student_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStudentStatus(student.id, 'present')}
                      className={`px-3 py-1 rounded-lg text-sm transition ${student.status === 'present' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => updateStudentStatus(student.id, 'late')}
                      className={`px-3 py-1 rounded-lg text-sm transition ${student.status === 'late' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-yellow-100'}`}
                    >
                      Late
                    </button>
                    <button
                      onClick={() => updateStudentStatus(student.id, 'absent')}
                      className={`px-3 py-1 rounded-lg text-sm transition ${student.status === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {students.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={saveAttendance}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
            Save Attendance
          </button>
        </div>
      )}
    </motion.div>
  );
}
