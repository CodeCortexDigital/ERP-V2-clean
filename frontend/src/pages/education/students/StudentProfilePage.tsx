import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, BookOpen, Award, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from 'sonner';
import studentService from '@/services/student.service';
import attendanceService from '@/services/attendance.service';
import examService from '@/services/exam.service';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStudentData();
      fetchAttendance();
      fetchResults();
    }
  }, [id]);

  const fetchStudentData = async () => {
    try {
      const res = await studentService.getById(id);
      setStudent(res.data);
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Failed to load student data');
      setStudent(null);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await attendanceService.getAttendance({ student_id: id });
      let attendanceData = [];
      if (Array.isArray(res.data)) {
        attendanceData = res.data;
      } else if (res.data?.results) {
        attendanceData = res.data.results;
      }
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await examService.getResults();
      let allResults = [];
      if (Array.isArray(res.data)) {
        allResults = res.data;
      } else if (res.data?.results) {
        allResults = res.data.results;
      }
      const studentResults = allResults.filter(r => r.student === id);
      setResults(studentResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceRate = () => {
    if (!attendance || attendance.length === 0) return 0;
    const present = attendance.filter(a => a.status === 'present').length;
    return Math.round((present / attendance.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600">Student not found</h2>
        <Button onClick={() => navigate('/education/students')} className="mt-4">
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/education/students')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{student?.full_name || 'Student'}</h1>
            <p className="text-gray-500">{student?.student_id || 'No ID'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/education/students/${id}/edit`)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /></div>
          <p className="text-2xl font-bold text-blue-700">{student?.current_class_name || 'Not Assigned'}</p>
          <p className="text-xs text-gray-600">Current Class</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><Award className="w-5 h-5 text-green-600" /></div>
          <p className="text-2xl font-bold text-green-700">{calculateAttendanceRate()}%</p>
          <p className="text-xs text-gray-600">Attendance Rate ({attendance.length} records)</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><Award className="w-5 h-5 text-purple-600" /></div>
          <p className="text-2xl font-bold text-purple-700">{results.length}</p>
          <p className="text-xs text-gray-600">Exams Taken</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="results">Exam Results</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-500">Full Name</label><p className="font-medium">{student?.full_name || 'N/A'}</p></div>
                <div><label className="text-sm text-gray-500">Student ID</label><p className="font-mono">{student?.student_id || 'N/A'}</p></div>
                <div><label className="text-sm text-gray-500">Email</label><p>{student?.email || 'N/A'}</p></div>
                <div><label className="text-sm text-gray-500">Phone</label><p>{student?.phone || 'N/A'}</p></div>
                <div><label className="text-sm text-gray-500">Date of Birth</label><p>{student?.date_of_birth || 'N/A'}</p></div>
                <div><label className="text-sm text-gray-500">Gender</label><p>{student?.gender || 'N/A'}</p></div>
                <div><label className="text-sm text-gray-500">Current Class</label><p>{student?.current_class_name || 'N/A'}</p></div>
                <div><label className="text-sm text-gray-500">Status</label>
                  <Badge variant={student?.is_active ? 'success' : 'danger'}>{student?.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Attendance Records</CardTitle></CardHeader>
            <CardContent>
              {!attendance || attendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No attendance records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Status</th></tr>
                    </thead>
                    <tbody>
                      {attendance.slice(0, 20).map((record, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{record.date}</td>
                          <td className="p-2">
                            <Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'}>
                              {record.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader><CardTitle>Exam Results</CardTitle></CardHeader>
            <CardContent>
              {!results || results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No exam results found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr><th className="p-2">Exam</th><th className="p-2">Subject</th><th className="p-2">Marks</th><th className="p-2">Percentage</th><th className="p-2">Grade</th></tr>
                    </thead>
                    <tbody>
                      {results.map((result, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{result.exam_title || 'N/A'}</td>
                          <td className="p-2">{result.subject_name || 'N/A'}</td>
                          <td className="p-2">{result.obtained_marks} / {result.total_marks}</td>
                          <td className="p-2">{result.percentage}%</td>
                          <td className="p-2">
                            <Badge variant={result.is_pass ? 'success' : 'danger'}>{result.grade}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
