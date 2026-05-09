import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, BookOpen, Award, Edit2, CheckCircle, XCircle, Clock, MapPin, Users, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from 'sonner';
import studentService from '@/services/student.service';
import attendanceService from '@/services/attendance.service';
import examService from '@/services/exam.service';
import financeService from '@/services/finance.service';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStudentData();
      fetchAttendance();
      fetchResults();
      fetchFinanceData();
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
    }
  };

  const fetchFinanceData = async () => {
    try {
      const res = await studentService.get360View(id);
      setFinance(res.data?.finance);
    } catch (error) {
      console.error('Error fetching finance data:', error);
      setFinance(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceRate = () => {
    if (!attendance || attendance.length === 0) return 0;
    const present = attendance.filter(a => a.status === 'present').length;
    return Math.round((present / attendance.length) * 100);
  };

  const getPresentCount = () => {
    return attendance.filter(a => a.status === 'present').length;
  };

  const getAbsentCount = () => {
    return attendance.filter(a => a.status === 'absent').length;
  };

  const getLateCount = () => {
    return attendance.filter(a => a.status === 'late').length;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PK');
  };

  const getParentNames = () => {
    const parents = [];
    if (student?.father_name) parents.push(`Father: ${student.father_name}`);
    if (student?.mother_name) parents.push(`Mother: ${student.mother_name}`);
    if (student?.guardian_name) parents.push(`Guardian: ${student.guardian_name}`);
    return parents.length > 0 ? parents.join(' | ') : 'Not provided';
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /></div>
          <p className="text-2xl font-bold text-blue-700">{student?.current_class_name || 'Not Assigned'}</p>
          <p className="text-xs text-gray-600">Current Class</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><Award className="w-5 h-5 text-green-600" /></div>
          <p className="text-2xl font-bold text-green-700">{calculateAttendanceRate()}%</p>
          <p className="text-xs text-gray-600">Attendance Rate</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><Award className="w-5 h-5 text-purple-600" /></div>
          <p className="text-2xl font-bold text-purple-700">{results.length}</p>
          <p className="text-xs text-gray-600">Exams Taken</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-yellow-600" /></div>
          <p className="text-2xl font-bold text-yellow-700">${finance?.balance_due || 0}</p>
          <p className="text-xs text-gray-600">Balance Due</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><User className="w-5 h-5 text-emerald-600" /></div>
          <Badge variant={student?.is_active ? 'success' : 'secondary'} className="mt-1">
            {student?.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <p className="text-xs text-gray-600 mt-2">Status</p>
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
            <CardContent className="space-y-4">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                  <div><label className="text-sm text-gray-500">Full Name</label><p className="font-medium">{student?.full_name || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Student ID</label><p className="font-mono">{student?.student_id || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Date of Birth</label><p>{student?.date_of_birth ? formatDate(student.date_of_birth) : 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Gender</label><p>{student?.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'N/A'}</p></div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Mail className="w-4 h-4" /> Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                  <div><label className="text-sm text-gray-500">Email</label><p>{student?.email || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Phone</label><p>{student?.phone || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Guardian Phone</label><p>{student?.guardian_phone || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Emergency Contact</label><p>{student?.emergency_contact || 'N/A'}</p></div>
                </div>
              </div>

              {/* Parent Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Family Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                  <div><label className="text-sm text-gray-500">Father's Name</label><p>{student?.father_name || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Mother's Name</label><p>{student?.mother_name || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Guardian Name</label><p>{student?.guardian_name || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Parents/Guardian</label><p className="text-sm">{getParentNames()}</p></div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                  <div><label className="text-sm text-gray-500">Current Class</label><p>{student?.current_class_name || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Current Section</label><p>{student?.current_section_name || 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Admission Date</label><p>{student?.admission_date ? formatDate(student.admission_date) : 'N/A'}</p></div>
                  <div><label className="text-sm text-gray-500">Roll Number</label><p>{student?.student_id || 'N/A'}</p></div>
                </div>
              </div>

              {/* Address Information */}
              {student?.address && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Address</h3>
                  <div className="pl-4">
                    <p className="text-sm">{student.address}</p>
                    {student.city && <p className="text-sm text-gray-600 mt-1">{student.city}, {student.state} {student.postal_code}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Attendance Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{attendance.length}</p>
                  <p className="text-xs text-gray-500">Total Days</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /><p className="text-2xl font-bold text-green-700">{getPresentCount()}</p></div>
                  <p className="text-xs text-gray-500">Present</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1"><XCircle className="w-4 h-4 text-red-600" /><p className="text-2xl font-bold text-red-700">{getAbsentCount()}</p></div>
                  <p className="text-xs text-gray-500">Absent</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1"><Clock className="w-4 h-4 text-yellow-600" /><p className="text-2xl font-bold text-yellow-700">{getLateCount()}</p></div>
                  <p className="text-xs text-gray-500">Late</p>
                </div>
              </div>

              {/* Attendance Table */}
              {!attendance || attendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No attendance records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.slice(0, 50).map((record, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{record.date}</td>
                          <td className="p-2">
                            <Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'}>
                              {record.status === 'present' ? '✓ Present' : record.status === 'late' ? '⏰ Late' : '✗ Absent'}
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
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Exam Results Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{results.length}</p>
                  <p className="text-xs text-gray-500">Total Exams</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{results.filter(r => r.is_pass).length}</p>
                  <p className="text-xs text-gray-500">Passed</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{results.filter(r => !r.is_pass).length}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>

              {/* Results Table */}
              {!results || results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No exam results found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2">Exam</th>
                        <th className="p-2">Subject</th>
                        <th className="p-2">Marks</th>
                        <th className="p-2">Percentage</th>
                        <th className="p-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{result.exam_title || 'N/A'}</td>
                          <td className="p-2">{result.subject_name || 'N/A'}</td>
                          <td className="p-2">{result.obtained_marks} / {result.total_marks || 100}</td>
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