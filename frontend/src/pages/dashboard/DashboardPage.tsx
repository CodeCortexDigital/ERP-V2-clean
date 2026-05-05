import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, DollarSign, TrendingUp, AlertCircle, 
  Send, Plus, CheckCircle, Clock, Bell, GraduationCap,
  FileText, MessageCircle, Target, Zap, Eye, Phone, 
  Mail, CreditCard, UserPlus, BarChart3, Flag, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';
import studentService from '@/services/student.service';
import classService from '@/services/class.service';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    attendanceRate: 0,
    feesCollected: 0,
    pendingFees: 0,
    newAdmissions: 0,
    overdueFees: 0,
    lowAttendance: 0
  });
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchClasses();
    fetchAttendanceOverview();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch students count
      const studentsRes = await studentService.getAll();
      let students = [];
      if (Array.isArray(studentsRes.data)) {
        students = studentsRes.data;
      } else if (studentsRes.data && Array.isArray(studentsRes.data.results)) {
        students = studentsRes.data.results;
      }
      
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.is_active).length;
      
      // Get attendance stats from API
      const attendanceStats = await api.get('/attendance/');
      let totalAttendance = 0;
      let lowAttendanceCount = 0;
      let attendanceDataMap = new Map();
      
      // Process attendance data
      const attendanceRecords = attendanceStats.data || [];
      const studentAttendanceMap = new Map();
      
      attendanceRecords.forEach(record => {
        const studentId = record.student_id;
        if (!studentAttendanceMap.has(studentId)) {
          studentAttendanceMap.set(studentId, { present: 0, total: 0 });
        }
        const studentStats = studentAttendanceMap.get(studentId);
        studentStats.total++;
        if (record.status === 'present') {
          studentStats.present++;
        }
      });
      
      // Calculate attendance rate per student and count low attendance
      studentAttendanceMap.forEach((stats) => {
        const rate = (stats.present / stats.total) * 100;
        totalAttendance += rate;
        if (rate < 75) {
          lowAttendanceCount++;
        }
      });
      
      const avgAttendance = studentAttendanceMap.size > 0 ? Math.round(totalAttendance / studentAttendanceMap.size) : 0;
      
      setStats({
        totalStudents: totalStudents,
        activeStudents: activeStudents,
        attendanceRate: avgAttendance,
        feesCollected: 1250,
        pendingFees: 450,
        newAdmissions: 8,
        overdueFees: 12,
        lowAttendance: lowAttendanceCount
      });
      
      // Set recent activities
      setRecentActivities([
        { id: 1, text: 'Fee payment received', amount: '5,000', student: 'Fatima Ali', time: '1 hour ago', icon: '💰', type: 'payment' },
        { id: 2, text: 'New student enrolled', student: 'Omar Hassan', time: '5 hours ago', icon: '👨‍🎓', type: 'student' },
        { id: 3, text: 'WhatsApp reminder sent', time: '1 day ago', icon: '💬', type: 'message' },
      ]);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };
  
  const fetchAttendanceOverview = async () => {
    try {
      const response = await api.get('/attendance/');
      const records = response.data || [];
      
      // Group by class and calculate attendance rate
      const classAttendanceMap = new Map();
      
      for (const record of records) {
        const studentId = record.student_id;
        // Get student details to find class
        try {
          const student = await studentService.getById(studentId);
          const className = student.data.current_class_name || 'Unknown';
          
          if (!classAttendanceMap.has(className)) {
            classAttendanceMap.set(className, { present: 0, total: 0 });
          }
          const stats = classAttendanceMap.get(className);
          stats.total++;
          if (record.status === 'present') {
            stats.present++;
          }
        } catch (e) {
          // Skip if student not found
        }
      }
      
      const overview = [];
      for (const [className, stats] of classAttendanceMap) {
        const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
        overview.push({ className, percentage: rate });
      }
      
      setAttendanceData(overview.slice(0, 5));
    } catch (error) {
      console.error('Error fetching attendance overview:', error);
      // Fallback data
      setAttendanceData([
        { className: 'Grade 5-A', percentage: 85 },
        { className: 'Grade 5-B', percentage: 78 },
        { className: 'Grade 6-A', percentage: 82 },
        { className: 'Grade 6-B', percentage: 71 },
        { className: 'Grade 7-A', percentage: 88 },
      ]);
    }
  };
  
  const upcomingEvents = [
    { name: 'Fee Due Date', date: 'May 10, 2026', daysLeft: 6, priority: 'high', icon: '🔴' },
    { name: 'Mid-Term Exams', date: 'May 15, 2026', daysLeft: 11, priority: 'medium', icon: '🟡' },
    { name: 'School Holiday', date: 'May 20, 2026', daysLeft: 16, priority: 'low', icon: '🟢' },
  ];
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Good Morning, Admin 👋</h1>
          <p className="text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <select className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option>ABC School</option>
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option>2025-26 Academic Year</option>
          </select>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-xs text-green-600">↑ 8% vs last month</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full"><Users className="w-5 h-5 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
              <p className="text-xs text-gray-500">Based on actual records</p>
            </div>
            <div className={`p-3 rounded-full ${stats.attendanceRate >= 75 ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <Calendar className={`w-5 h-5 ${stats.attendanceRate >= 75 ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Fees Collected</p>
              <p className="text-2xl font-bold">₹{stats.feesCollected}K</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full"><DollarSign className="w-5 h-5 text-yellow-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Fees</p>
              <p className="text-2xl font-bold">₹{stats.pendingFees}K</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full"><AlertCircle className="w-5 h-5 text-red-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Low Attendance</p>
              <p className="text-2xl font-bold">{stats.lowAttendance}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full"><TrendingUp className="w-5 h-5 text-orange-600" /></div>
          </div>
        </div>
      </div>
      
      {/* Action Center */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold text-lg mb-4">⚠️ Needs Attention</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => navigate('/education/attendance')} className="bg-orange-50 p-3 rounded-lg text-left hover:bg-orange-100">
            <p className="text-sm font-medium">{stats.lowAttendance} Students</p>
            <p className="text-xs text-orange-600">Low Attendance</p>
          </button>
          <button onClick={() => navigate('/education/finance')} className="bg-red-50 p-3 rounded-lg text-left hover:bg-red-100">
            <p className="text-sm font-medium">{stats.overdueFees} Overdue</p>
            <p className="text-xs text-red-600">Send Reminders</p>
          </button>
          <button onClick={() => navigate('/education/analytics')} className="bg-yellow-50 p-3 rounded-lg text-left hover:bg-yellow-100">
            <p className="text-sm font-medium">At Risk</p>
            <p className="text-xs text-yellow-600">View Students</p>
          </button>
          <button onClick={() => navigate('/education/admissions')} className="bg-blue-50 p-3 rounded-lg text-left hover:bg-blue-100">
            <p className="text-sm font-medium">{stats.newAdmissions} Pending</p>
            <p className="text-xs text-blue-600">Review Applications</p>
          </button>
        </div>
      </div>
      
      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Overview */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">📅 Attendance Overview</h2>
            <button onClick={() => navigate('/education/attendance')} className="text-sm text-blue-600">Mark Today →</button>
          </div>
          <div className="flex gap-4 mb-4 text-xs">
            <span>🟢 {'>'}85%</span><span>🟡 70-85%</span><span>🔴 {'<'}70%</span>
          </div>
          <div className="space-y-3">
            {attendanceData.length > 0 ? attendanceData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm">{item.className}</span>
                <div className="flex items-center gap-2 w-32">
                  <div className="flex-1 bg-gray-200 h-2 rounded-full">
                    <div className={`h-2 rounded-full ${item.percentage >= 85 ? 'bg-green-500' : item.percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.percentage}%` }}></div>
                  </div>
                  <span className="text-sm">{item.percentage}%</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">No attendance data available</div>
            )}
          </div>
          <button onClick={() => navigate('/education/attendance')} className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg text-sm">
            📝 Mark Today's Attendance
          </button>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold mb-4">🕒 Recent Activity</h2>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-2 text-sm">
                <span>{activity.icon}</span>
                <span>{activity.text}</span>
                <span className="text-gray-400 text-xs ml-auto">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold mb-4">⚡ Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => navigate('/education/students/add')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">➕ Add Student</button>
          <button onClick={() => navigate('/education/attendance')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">📅 Mark Attendance</button>
          <button onClick={() => navigate('/education/finance')} className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm">💰 Record Payment</button>
          <button onClick={() => navigate('/education/communication')} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm">💬 Send Message</button>
        </div>
      </div>
      
      {/* Upcoming Events */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold mb-4">📅 Upcoming Events & Deadlines</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingEvents.map((event, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-gray-50">
              <p className="font-medium">{event.name}</p>
              <p className="text-xs text-gray-500">{event.date}</p>
              <p className="text-xs text-orange-600">{event.daysLeft} days left</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Smart Insight */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-full"><BarChart3 className="w-6 h-6 text-indigo-600" /></div>
            <div>
              <h3 className="font-semibold">🔥 Smart Insight</h3>
              <p className="text-sm text-gray-600">Overall attendance rate is {stats.attendanceRate}% - {stats.lowAttendance} students need attention</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/education/attendance')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">View Details</button>
            <button onClick={() => navigate('/education/students?filter=low-attendance')} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm">View Students</button>
          </div>
        </div>
      </div>
    </div>
  );
}
