import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, BookOpen, Award, Edit2, CreditCard, Camera, X
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

  useEffect(() => {
    loadClassMaps();
  }, []);

  useEffect(() => {
    if (id && classMap.size > 0) {
      fetchStudentData();
      fetchAttendance();
      fetchResults();
      fetchFinanceData();
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

  const fetchAttendance = async () => {
    if (!id) return;
    try {
      const res = await attendanceService.getAttendance({ student_id: id });
      let attendanceData: AttendanceRecord[] = [];
      if (Array.isArray(res.data)) {
        attendanceData = res.data;
      } else if (res.data?.results) {
        attendanceData = res.data.results;
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PK');
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
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
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
            onClick={async () => { 
              const pdfService = await import("@/services/pdf.service"); 
              pdfService.default.downloadResultCard(id); 
            }} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            📄 Download Result Card
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        
        <div className="bg-yellow-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-700">${finance?.balance_due || 0}</p>
          <p className="text-xs text-gray-600">Balance Due</p>
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
                                  'destructive'
                                }
                              >
                                {record.status === 'present' ? 'Present' : 
                                 record.status === 'late' ? 'Late' : 
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
              <CardTitle>Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{results.length}</p>
                  <p className="text-xs text-gray-500">Total Exams</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{passedExams}</p>
                  <p className="text-xs text-gray-500">Passed</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{examsTaken - passedExams}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No exam results found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Exam</th>
                        <th className="p-2 text-left">Subject</th>
                        <th className="p-2 text-left">Marks</th>
                        <th className="p-2 text-left">Percentage</th>
                        <th className="p-2 text-left">Grade</th>
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
                            <Badge variant={result.is_pass ? 'success' : 'destructive'}>
                              {result.grade || 'N/A'}
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
      </Tabs>
    </div>
  );
}