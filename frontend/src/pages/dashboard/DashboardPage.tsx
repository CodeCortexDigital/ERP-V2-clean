import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, TrendingUp, AlertCircle, CheckCircle, 
  DollarSign, Clock, BookOpen, Calendar,
  Activity, ThumbsUp, ThumbsDown, UserPlus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import api from '@/services/api';
import studentService from '@/services/student.service';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  pendingFees: number;
  lowAttendance: number;
  attendanceRate: number;
  presentToday: number;
  absentToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    pendingFees: 0,
    lowAttendance: 0,
    attendanceRate: 0,
    presentToday: 0,
    absentToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentStudents, setRecentStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch students data
      const studentsResponse = await studentService.getAll();
      let students = [];
      if (Array.isArray(studentsResponse.data)) {
        students = studentsResponse.data;
      } else if (studentsResponse.data && Array.isArray(studentsResponse.data.results)) {
        students = studentsResponse.data.results;
      }

      // Calculate student stats
      const total = students.length;
      const active = students.filter(s => s.is_active === true).length;
      const inactive = students.filter(s => s.is_active === false).length;

      // Fetch attendance data for today
      const today = new Date().toISOString().split('T')[0];
      let presentToday = 0;
      let absentToday = 0;
      let lowAttendanceCount = 0;

      // Calculate low attendance (students with <75% attendance)
      let studentsWithAttendance = 0;
      for (const student of students.slice(0, 10)) { // Limit for performance
        try {
          const dashboard = await studentService.get360View(student.id);
          const attendanceRate = dashboard.data?.attendance?.attendance_rate || 0;
          if (attendanceRate < 75 && attendanceRate > 0) {
            lowAttendanceCount++;
          }
          studentsWithAttendance++;
        } catch (err) {
          // Skip if error
        }
      }

      // Scale low attendance count
      const estimatedLowAttendance = studentsWithAttendance > 0 
        ? Math.round((lowAttendanceCount / studentsWithAttendance) * total)
        : 0;

      setStats({
        totalStudents: total,
        activeStudents: active,
        inactiveStudents: inactive,
        pendingFees: 0,
        lowAttendance: estimatedLowAttendance,
        attendanceRate: 85,
        presentToday: presentToday,
        absentToday: absentToday
      });

      // Get recent students
      setRecentStudents(students.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    navigate('/education/students');
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
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, Admin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 cursor-pointer" onClick={() => navigate('/education/students')}>
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-600">Total Students</span></div>
          <p className="text-xl font-bold text-blue-700">{stats.totalStudents}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 cursor-pointer" onClick={() => navigate('/education/students?status=active')}>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-600">Active</span></div>
          <p className="text-xl font-bold text-green-700">{stats.activeStudents}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 cursor-pointer" onClick={() => navigate('/education/students?status=inactive')}>
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-gray-600" /><span className="text-xs text-gray-600">Inactive</span></div>
          <p className="text-xl font-bold text-gray-700">{stats.inactiveStudents}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 cursor-pointer" onClick={() => navigate('/education/finance')}>
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-600">Pending Fees</span></div>
          <p className="text-xl font-bold text-red-700">{stats.pendingFees}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 cursor-pointer" onClick={() => navigate('/education/students')}>
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-yellow-600" /><span className="text-xs text-gray-600">Low Attendance</span></div>
          <p className="text-xl font-bold text-yellow-700">{stats.lowAttendance}</p>
        </div>
      </div>

      {/* Recent Students Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Recent Students</h3>
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              View All Students →
            </Button>
          </div>
          
          {recentStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No students found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Student</th>
                    <th className="p-3 text-left">Student ID</th>
                    <th className="p-3 text-left">Class</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((student: any) => (
                    <tr key={student.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/education/students/${student.id}`)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold">
                            {student.full_name?.charAt(0)}
                          </div>
                          <span className="font-medium">{student.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">{student.student_id}</td>
                      <td className="p-3">{student.current_class_name || 'Not Assigned'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${student.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
