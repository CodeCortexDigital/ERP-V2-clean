import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, BookOpen, Award, Edit2, CreditCard, Camera, X, Download, DollarSign, TrendingUp, Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { StudentAttendanceCalendar } from '@/components/calendar/StudentAttendanceCalendar';
import { toast } from 'sonner';
import studentService, { Student } from '@/services/student.service';
import attendanceService from '@/services/attendance.service';
import examService from '@/services/exam.service';
import classService, { SchoolClass, Section } from '@/services/class.service';
import api from '@/services/api';
import { uploadStudentProfile, resolveMediaUrl, validateFileClient } from '@/utils/fileUpload';
import financeService from '@/services/finance.service';
import pdfService from '@/services/pdf.service';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | string;
  status_display?: string;
}

interface ResultRecord {
  student: string;
  exam_title?: string;
  subject_name?: string;
  obtained_marks?: number;
  total_marks?: number;
  percentage?: number;
  is_pass?: boolean;
  grade?: string;
}

interface FinanceData {
  balance_due?: number;
  total_invoices?: number;
  total_amount?: number;
  total_paid?: number;
}

interface StudentProfile extends Omit<Student, 'current_class' | 'current_section'> {
  current_class?: string;
  current_section?: string;
  resolved_class_name?: string;
  resolved_section_name?: string;
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [classMap, setClassMap] = useState<Map<string, string>>(new Map());
  const [sectionMap, setSectionMap] = useState<Map<string, string>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    loadClassMaps();
  }, []);

  useEffect(() => {
    if (id && classMap.size > 0) {
      fetchStudentData();
      fetchAttendance();
      fetchResults();
      fetchFinanceData();
      fetchInvoices();
    }
  }, [id, classMap]);

  useEffect(() => {
    let active = true;
    (async () => {
      const url = await resolveMediaUrl(student?.profile_picture);
      if (active) setProfilePictureUrl(url);
    })();
    return () => {
      active = false;
    };
  }, [student?.profile_picture]);

  const loadClassMaps = async () => {
    try {
      const res = await classService.getAll();
      const classes: SchoolClass[] = res.data || [];
      const newClassMap = new Map<string, string>();
      const newSectionMap = new Map<string, string>();
      
      classes.forEach((cls: SchoolClass) => {
        newClassMap.set(cls.id, cls.name);
      });
      
      for (const cls of classes) {
        try {
          const sectionsRes = await classService.getSections(cls.id);
          const sections: Section[] = sectionsRes.data || [];
          sections.forEach((sec: Section) => {
            newSectionMap.set(sec.id, sec.name);
          });
        } catch (e) {
          console.error(`Error loading sections for class ${cls.id}:`, e);
        }
      }
      
      setClassMap(newClassMap);
      setSectionMap(newSectionMap);
    } catch (error) {
      console.error('Error loading class maps:', error);
      toast.error('Failed to load class data');
    }
  };

  const fetchStudentData = async () => {
    if (!id) return;
    try {
      const res = await studentService.getById(id);
      const studentData: Student = res.data;
      
      let className = studentData.current_class_name || '';
      if (!className && studentData.current_class && classMap.has(studentData.current_class)) {
        className = classMap.get(studentData.current_class) ?? '';
      }
      
      let sectionName = studentData.current_section_name || '';
      if (!sectionName && studentData.current_section && sectionMap.has(studentData.current_section)) {
        sectionName = sectionMap.get(studentData.current_section) ?? '';
      }
      
      setStudent({
        ...studentData,
        resolved_class_name: className,
        resolved_section_name: sectionName
      });
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Failed to load student data');
    }
  };

  const handleProfilePictureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFileClient(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!id) return;

    setUploading(true);
    try {
      const result = await uploadStudentProfile(id, file);
      const picturePath = result.profile_picture ?? result.storage_key;
      setStudent(prev => (prev ? { ...prev, profile_picture: picturePath } : prev));
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!id) return;
    try {
      await api.patch(`/auth/students/${id}/`, { profile_picture: null });
      setStudent(prev => prev ? { ...prev, profile_picture: null } : prev);
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  // ✅ FIXED: Use getStudentHistory instead of getAttendance
  const fetchAttendance = async () => {
    if (!id) return;
    try {
      const res = await attendanceService.getStudentHistory(id);
      let attendanceData: AttendanceRecord[] = [];
      if (Array.isArray(res.data)) {
        attendanceData = res.data;
      } else if (res.data?.results) {
        attendanceData = res.data.results;
      } else if (res.data?.attendance_records) {
        attendanceData = res.data.attendance_records;
      }
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
      toast.error('Failed to load attendance data');
    }
  };

  const fetchResults = async () => {
    try {
      const res = await examService.getResults();
      let allResults: ResultRecord[] = [];
      if (Array.isArray(res.data)) {
        allResults = res.data;
      } else if (res.data?.results) {
        allResults = res.data.results;
      }
      const studentResults = allResults.filter((r: ResultRecord) => r.student === id);
      setResults(studentResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults([]);
      toast.error('Failed to load exam results');
    }
  };

  const fetchFinanceData = async () => {
    if (!id) return;
    try {
      const res = await studentService.get360View(id);
      setFinance(res.data?.finance || null);
    } catch (error) {
      console.error('Error fetching finance data:', error);
      setFinance(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!id) return;
    setLoadingInvoices(true);
    try {
      const res = await financeService.getInvoices({ student_id: id });
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
      toast.error('Failed to load fee history');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const calculateAttendanceRate = () => {
    if (!attendance || attendance.length === 0) return 0;
    const present = attendance.filter(a => a.status === 'present').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const totalSchoolDays = present + late + absent;
    if (totalSchoolDays === 0) return 0;
    return Math.round(((present + late) / totalSchoolDays) * 100);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PK');
  };

  const downloadResultCard = () => {
    if (id) {
      import("@/services/pdf.service").then(module => {
        module.default.downloadResultCard(id);
      });
    }
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

  const attendanceRate = calculateAttendanceRate();
  const examsTaken = results.length;
  const passedExams = results.filter(r => r.is_pass === true).length;
  const displayClassName = student.resolved_class_name || student.current_class_name || 'Not Assigned';
  const displaySectionName = student.resolved_section_name || student.current_section_name || '';

  return (
    <div className="space-y-6">
      {/* Header with Profile Picture */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/education/students')} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Profile Picture */}
          <div className="relative">
            <div 
              onClick={() => profilePictureUrl && setIsImageModalOpen(true)}
              className={`w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden ${profilePictureUrl ? 'cursor-pointer hover:ring-4 hover:ring-blue-100 transition duration-200' : ''}`}
              title={profilePictureUrl ? "Click to view full image" : ""}
            >
              {profilePictureUrl ? (
                <img 
                  src={profilePictureUrl} 
                  alt={student.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {student.full_name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors"
              disabled={uploading}
              title="Upload Profile Picture"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="hidden"
            />
            
            {profilePictureUrl && (
              <button
                onClick={handleRemoveProfilePicture}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                title="Remove Profile Picture"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">{student.full_name}</h1>
            <p className="text-gray-500">{student.student_id}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/education/students/${id}/edit`)}
          >
            <Edit2 className="w-4 h-4 mr-2" /> 
            Edit
          </Button>
          
          <button 
            onClick={downloadResultCard} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            📄 Download Result Card
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{displayClassName}</p>
          <p className="text-xs text-gray-600">Current Class</p>
          {displaySectionName && (
            <p className="text-xs text-gray-500 mt-1">Section: {displaySectionName}</p>
          )}
        </div>
        
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">{attendanceRate}%</p>
          <p className="text-xs text-gray-600">Attendance Rate</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{examsTaken}</p>
          <p className="text-xs text-gray-600">Exams Taken</p>
        </div>
        
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
          </div>
          <Badge variant={student.is_active ? 'success' : 'secondary'}>
            {student.is_active ? 'Active' : 'Inactive'}
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
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Full Name</label>
                  <p className="font-medium">{student.full_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Student ID</label>
                  <p className="font-mono">{student.student_id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Date of Birth</label>
                  <p>{student.date_of_birth ? formatDate(student.date_of_birth) : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Gender</label>
                  <p>{student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p>{student.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p>{student.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Father's Name</label>
                  <p>{student.father_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Mother's Name</label>
                  <p>{student.mother_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Guardian Name</label>
                  <p>{student.guardian_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Guardian Phone</label>
                  <p>{student.guardian_phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Emergency Contact</label>
                  <p>{student.emergency_contact || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Admission Date</label>
                  <p>{student.admission_date ? formatDate(student.admission_date) : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Current Class</label>
                  <p>{displayClassName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Current Section</label>
                  <p>{displaySectionName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Street Address</label>
                  <p>{student.address || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">City</label>
                  <p>{student.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">State</label>
                  <p>{student.state || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Postal Code</label>
                  <p>{student.postal_code || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Attendance Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{attendance.length}</p>
                  <p className="text-xs text-gray-500">Total Days</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{getPresentCount()}</p>
                  <p className="text-xs text-gray-500">Present</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{getAbsentCount()}</p>
                  <p className="text-xs text-gray-500">Absent</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{getLateCount()}</p>
                  <p className="text-xs text-gray-500">Late</p>
                </div>
              </div>

              {/* Calendar View */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Attendance Calendar</h3>
                <StudentAttendanceCalendar 
                  studentId={student.id} 
                  studentName={student.full_name} 
                />
              </div>

              {/* Detailed Records Table */}
              {attendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No attendance records found</div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-4">Detailed Records</h3>
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
                              <Badge 
                                variant={
                                  record.status === 'present' ? 'success' : 
                                  record.status === 'late' ? 'warning' : 
                                  record.status === 'holiday' ? 'info' : 
                                  record.status === 'excused' ? 'secondary' :
                                  'destructive'
                                }
                                className={
                                  record.status === 'holiday' 
                                    ? 'bg-purple-100 text-purple-800 border-transparent hover:bg-purple-200' 
                                    : ''
                                }
                              >
                                {record.status === 'present' ? 'Present' : 
                                 record.status === 'late' ? 'Late' : 
                                 record.status === 'holiday' ? 'Holiday' : 
                                 record.status === 'excused' ? 'Excused' :
                                 'Absent'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Academic Performance & Exam Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exam Performance Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Exams Taken</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{results.length}</p>
                  </div>
                  <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Passed Exams</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">{passedExams}</p>
                  </div>
                  <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Failed Exams</p>
                    <p className="text-2xl font-bold text-red-800 mt-1">{results.length - passedExams}</p>
                  </div>
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                    <X className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border border-dashed rounded-xl">
                  <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium text-gray-700">No exam results found</p>
                  <p className="text-sm text-gray-500 mt-1">This student has no graded exam records.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/75 border-b">
                      <tr>
                        <th className="p-4 text-left font-semibold text-gray-700">Exam</th>
                        <th className="p-4 text-left font-semibold text-gray-700">Subject</th>
                        <th className="p-4 text-right font-semibold text-gray-700">Obtained Marks</th>
                        <th className="p-4 text-right font-semibold text-gray-700">Passing Marks</th>
                        <th className="p-4 text-right font-semibold text-gray-700">Percentage</th>
                        <th className="p-4 text-center font-semibold text-gray-700">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result: any, idx) => {
                        const getGradeBadgeVariant = (grade?: string) => {
                          if (!grade) return 'secondary';
                          const g = grade.toUpperCase();
                          if (g.startsWith('A')) return 'success';
                          if (g.startsWith('B')) return 'info';
                          if (g.startsWith('C')) return 'warning';
                          return 'destructive';
                        };

                        return (
                          <tr key={idx} className="border-b hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-semibold text-gray-900">{result.exam_title || 'N/A'}</td>
                            <td className="p-4 text-gray-600 font-medium">{result.subject_name || 'N/A'}</td>
                            <td className={`p-4 text-right font-bold ${result.is_pass ? 'text-green-600' : 'text-red-600'}`}>
                              {Number(result.obtained_marks)}
                            </td>
                            <td className="p-4 text-right text-gray-500 font-medium">
                              {Number(result.passing_marks || 33)} / {Number(result.total_marks || 100)}
                            </td>
                            <td className="p-4 text-right font-semibold text-gray-800">
                              {Number(result.percentage).toFixed(0)}%
                            </td>
                            <td className="p-4 text-center">
                              <Badge variant={getGradeBadgeVariant(result.grade)}>
                                {result.grade || 'N/A'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Picture Full-screen Modal */}
      {isImageModalOpen && profilePictureUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 transition-opacity cursor-zoom-out"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <img 
              src={profilePictureUrl} 
              alt={student.full_name} 
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            <button 
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 bg-black/60 text-white hover:bg-black/80 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}