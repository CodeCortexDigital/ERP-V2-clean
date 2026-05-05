import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Calendar, BookOpen, 
  CheckCircle, XCircle, Clock, DollarSign,
  ArrowLeft, RefreshCw, MessageSquare,
  GraduationCap, AlertCircle, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import studentService from '@/services/student.service';

interface Student360Data {
  student: {
    id: string;
    student_id: string;
    full_name: string;
    email: string;
    phone: string;
    father_name?: string;
    mother_name?: string;
    guardian_phone?: string;
    program?: string;
    enrollment_date?: string;
    is_active: boolean;
    current_class?: string;
    current_section?: string;
  };
  attendance: {
    total_days: number;
    present: number;
    absent: number;
    late: number;
    attendance_rate: number;
    recent_records?: Array<{ date: string; status: string; status_display: string }>;
  };
  exams: {
    total_exams: number;
    passed: number;
    failed: number;
    average_percentage: number;
    results: Array<{
      exam_title: string;
      marks: string;
      percentage: number;
      grade: string;
      status: string;
    }>;
  };
  finance: {
    total_invoices: number;
    total_amount: number;
    total_paid: number;
    balance_due: number;
    payment_percentage: number;
  };
  performance_summary?: {
    attendance_grade: string;
    academic_grade: string;
    overall_status: string;
  };
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchStudentData();
    }
  }, [id]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const response = await studentService.get360View(id!);
      setStudentData(response.data);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Student not found</p>
        <Button onClick={() => navigate('/education/students')} className="mt-4">
          Back to Students
        </Button>
      </div>
    );
  }

  const { student, attendance, exams, finance, performance_summary } = studentData;
  const attendanceRate = attendance?.attendance_rate || 0;
  const avgScore = exams?.average_percentage || 0;
  const balanceDue = finance?.balance_due || 0;

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = () => {
    if (performance_summary?.overall_status === 'On Track') {
      return <Badge className="bg-green-100 text-green-700">On Track ✅</Badge>;
    } else if (performance_summary?.overall_status === 'Needs Attention') {
      return <Badge className="bg-yellow-100 text-yellow-700">Needs Attention 🟡</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">At Risk 🔴</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/education/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              {student.full_name}
            </h1>
            <p className="text-gray-500">Student ID: {student.student_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStudentData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="default">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>

      {/* Performance Summary Banner */}
      {performance_summary && (
        <div className={`p-4 rounded-lg ${
          performance_summary.overall_status === 'On Track' ? 'bg-green-50 border border-green-200' :
          performance_summary.overall_status === 'Needs Attention' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {performance_summary.overall_status === 'On Track' ? 
                <CheckCircle className="w-5 h-5 text-green-600" /> :
                <AlertCircle className="w-5 h-5 text-yellow-600" />}
              <div>
                <p className="font-medium">Overall Status: {performance_summary.overall_status}</p>
                <p className="text-sm text-gray-600">
                  Attendance: {performance_summary.attendance_grade} | 
                  Academic: {performance_summary.academic_grade}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Attendance Rate</p>
                <p className={`text-2xl font-bold ${getAttendanceColor(attendanceRate)}`}>{attendanceRate}%</p>
              </div>
              <div className={`p-3 rounded-full ${attendanceRate >= 80 ? 'bg-green-100' : attendanceRate >= 70 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <CheckCircle className={`w-6 h-6 ${attendanceRate >= 80 ? 'text-green-600' : attendanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
            </div>
            <Progress value={attendanceRate} className="mt-3" />
            <p className="text-xs text-gray-500 mt-2">{attendance?.present || 0} present / {attendance?.total_days || 0} days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {exams?.passed || 0} passed / {exams?.total_exams || 0} exams
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fee Balance</p>
                <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${balanceDue.toFixed(2)}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Paid: ${finance?.total_paid?.toFixed(2) || '0'} / ${finance?.total_amount?.toFixed(2) || '0'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Class</p>
                <p className="text-xl font-bold text-purple-600">{student.current_class || 'Not assigned'}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <GraduationCap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Section: {student.current_section || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Student ID: {student.student_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{student.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{student.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Enrolled: {student.enrollment_date || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={student.is_active ? 'success' : 'secondary'}>
                    {student.is_active ? 'Active Student' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guardian Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Father: {student.father_name || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Mother: {student.mother_name || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Guardian Phone: {student.guardian_phone || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Present</p>
                  <p className="text-3xl font-bold text-green-600">{attendance?.present || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Absent</p>
                  <p className="text-3xl font-bold text-red-600">{attendance?.absent || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Late</p>
                  <p className="text-3xl font-bold text-orange-600">{attendance?.late || 0}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Overall Attendance Rate</p>
                <div className="flex items-center gap-4 justify-center">
                  <Progress value={attendanceRate} className="w-64" />
                  <span className={`text-2xl font-bold ${getAttendanceColor(attendanceRate)}`}>{attendanceRate}%</span>
                </div>
              </div>
              {attendance?.recent_records && attendance.recent_records.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium mb-3">Recent Attendance Records</p>
                  <div className="space-y-2">
                    {attendance.recent_records.slice(0, 7).map((record, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm">{record.date}</span>
                        <Badge variant={record.status === 'present' ? 'success' : record.status === 'absent' ? 'destructive' : 'warning'}>
                          {record.status_display}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams Tab */}
        <TabsContent value="exams">
          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Exams</p>
                  <p className="text-2xl font-bold">{exams?.total_exams || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{exams?.passed || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold text-blue-600">{exams?.average_percentage || 0}%</p>
                </div>
              </div>
              {exams?.results && exams.results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Exam</th>
                        <th className="px-4 py-3 text-center">Marks</th>
                        <th className="px-4 py-3 text-center">Percentage</th>
                        <th className="px-4 py-3 text-center">Grade</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.results.map((result, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-3">{result.exam_title}</td>
                          <td className="px-4 py-3 text-center">{result.marks}</td>
                          <td className="px-4 py-3 text-center">{result.percentage}%</td>
                          <td className="px-4 py-3 text-center font-bold">{result.grade}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={result.status === 'Pass' ? 'success' : 'destructive'}>
                              {result.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No exam results available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
