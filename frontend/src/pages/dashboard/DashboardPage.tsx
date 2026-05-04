import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, Calendar, DollarSign, TrendingUp, AlertCircle, 
  Send, Plus, CheckCircle, Clock, Bell, GraduationCap,
  FileText, MessageCircle, Target, Zap, Eye, Phone, 
  Mail, CreditCard, UserPlus, BarChart3, Flag, X
} from 'lucide-react';

// ============================================================
// ENHANCED COMPONENTS
// ============================================================

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down'; label: string };
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
  icon: React.ReactNode;
  onClick?: () => void;
}

function KpiCard({ title, value, trend, color, icon, onClick }: KpiCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100'
  };
  
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${colors[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  context?: string;
  count?: number;
  color: string;
  onClick: () => void;
}

function ActionButton({ icon, label, context, count, color, onClick }: ActionButtonProps) {
  const colors = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    red: 'bg-red-500 hover:bg-red-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600'
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${colors[color]} text-white px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      {icon}
      <div className="text-left">
        {context && <div className="text-xs opacity-90">{context}</div>}
        <div>{label}</div>
      </div>
      {count && (
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs ml-1">
          {count}
        </span>
      )}
    </motion.button>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('fee_reminder');
  const [messagePreview, setMessagePreview] = useState('');

  const notifications = [
    { id: 1, message: '8 fees overdue - Action required', time: '2 hours ago', type: 'urgent', priority: 'high', icon: '🔴' },
    { id: 2, message: '3 students absent today', time: '3 hours ago', type: 'attendance', priority: 'medium', icon: '🟡' },
    { id: 3, message: '5 new applicants received', time: '1 day ago', type: 'info', priority: 'low', icon: '🟢' },
  ];

  const stats = {
    totalStudents: { value: 124, trend: 8, direction: 'up', label: 'vs last month' },
    attendanceToday: { value: 87, trend: 3, direction: 'down', label: 'vs yesterday' },
    feesCollected: { value: 450000, percentage: 80 },
    pendingFees: { value: 120000, overdue: 8 },
    newAdmissions: { value: 8, label: 'this week' }
  };

  const updateMessagePreview = (template: string, studentName = 'Ahmed Khan', amount = '5,000', date = 'May 10') => {
    if (template === 'fee_reminder') {
      setMessagePreview(`Dear ${studentName}, your fee of Rs ${amount} is due on ${date}. Please pay at your earliest convenience.`);
    } else if (template === 'attendance_alert') {
      setMessagePreview(`Dear Parent, ${studentName} was marked absent today. Please ensure regular attendance.`);
    } else if (template === 'exam_result') {
      setMessagePreview(`Dear Parent, exam results for ${studentName} are now available. 85/100 (85%) - Grade A`);
    }
  };

  useEffect(() => {
    updateMessagePreview('fee_reminder');
    setTimeout(() => setLoading(false), 500);
  }, []);

  const quickActions = [
    { icon: <UserPlus className="w-4 h-4" />, label: 'Add Student', color: 'blue', onClick: () => navigate('/education/students/add') },
    { icon: <Calendar className="w-4 h-4" />, label: 'Mark Attendance', color: 'green', onClick: () => navigate('/education/attendance/mark') },
    { icon: <CreditCard className="w-4 h-4" />, label: 'Record Payment', color: 'orange', onClick: () => navigate('/education/finance/payments') },
    { icon: <Send className="w-4 h-4" />, label: 'Send Message', color: 'purple', onClick: () => navigate('/education/communication') },
  ];

  const attendanceData = [
    { className: 'Grade 5-A', percentage: 90, status: 'good' },
    { className: 'Grade 5-B', percentage: 82, status: 'good' },
    { className: 'Grade 6-A', percentage: 95, status: 'excellent' },
    { className: 'Grade 6-B', percentage: 78, status: 'warning' },
    { className: 'Grade 7-A', percentage: 88, status: 'good' },
  ];

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceIcon = (percentage: number) => {
    if (percentage >= 85) return '🟢';
    if (percentage >= 70) return '🟡';
    return '🔴';
  };

  const recentActivities = [
    { id: 1, text: 'Ahmed Khan marked absent', time: '2 min ago', icon: '👨‍🎓' },
    { id: 2, text: 'Fee received Rs 5,000 from Fatima Ali', time: '1 hour ago', icon: '💰' },
    { id: 3, text: 'Mid-term exam results published', time: '3 hours ago', icon: '📊' },
    { id: 4, text: 'New student enrolled: Omar Hassan', time: '5 hours ago', icon: '👨‍🎓' },
    { id: 5, text: 'WhatsApp reminder sent to parents', time: '1 day ago', icon: '💬' },
  ];

  const upcomingEvents = [
    { name: 'Fee Due Date', date: 'May 10, 2026', daysLeft: 6, priority: 'high', icon: '🔴' },
    { name: 'Mid-Term Exams', date: 'May 15, 2026', daysLeft: 11, priority: 'medium', icon: '🟡' },
    { name: 'School Holiday', date: 'May 20, 2026', daysLeft: 16, priority: 'low', icon: '🟢' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6 bg-gray-50 min-h-screen"
    >
      {/* HEADER + NOTIFICATION BELL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Good Morning, {user?.full_name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
            <option>ABC School</option>
            <option>Demo School</option>
          </select>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
            <option>2025-26 Academic Year</option>
            <option>2024-25 Academic Year</option>
          </select>
          
          {/* Notification Bell with Priority Colors */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative bg-white p-2 rounded-full shadow-sm hover:shadow-md transition"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50">
                <div className="p-3 border-b font-semibold text-sm flex justify-between items-center">
                  <span>🔔 Notifications</span>
                  <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4" /></button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(notif => (
                    <div key={notif.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                      <p className="text-sm flex items-center gap-2">
                        <span>{notif.icon}</span>
                        <span>{notif.message}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 text-center">
                  <button className="text-sm text-blue-600">View all</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI CARDS - CLEAN TRENDS (NO DUPLICATION) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <KpiCard 
          title="Total Students" 
          value={stats.totalStudents.value}
          trend={{ value: stats.totalStudents.trend, direction: 'up', label: stats.totalStudents.label }}
          color="blue"
          icon={<Users className="w-5 h-5" />}
          onClick={() => navigate('/education/students')}
        />
        <KpiCard 
          title="Attendance Today" 
          value={`${stats.attendanceToday.value}%`}
          trend={{ value: stats.attendanceToday.trend, direction: 'down', label: stats.attendanceToday.label }}
          color="green"
          icon={<Calendar className="w-5 h-5" />}
          onClick={() => navigate('/education/attendance')}
        />
        <KpiCard 
          title="Fees Collected" 
          value={`₹${(stats.feesCollected.value / 1000).toFixed(0)}K`}
          color="green"
          icon={<DollarSign className="w-5 h-5" />}
          onClick={() => navigate('/education/finance')}
        />
        <KpiCard 
          title="Pending Fees" 
          value={`₹${(stats.pendingFees.value / 1000).toFixed(0)}K`}
          color="red"
          icon={<AlertCircle className="w-5 h-5" />}
          onClick={() => navigate('/education/finance?filter=pending')}
        />
        <KpiCard 
          title="New Admissions" 
          value={stats.newAdmissions.value}
          color="purple"
          icon={<TrendingUp className="w-5 h-5" />}
          onClick={() => navigate('/education/admissions')}
        />
      </div>

      {/* ACTION CENTER - CONTEXT FIRST */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <Flag className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-lg">⚠️ Needs Attention</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionButton 
            icon={<Phone className="w-4 h-4" />}
            context="12 Students"
            label="Notify Parents"
            color="orange"
            onClick={() => navigate('/education/attendance?filter=absent')}
          />
          <ActionButton 
            icon={<Send className="w-4 h-4" />}
            context="8 Overdue"
            label="Send Reminders"
            color="red"
            onClick={() => navigate('/education/finance?filter=overdue')}
          />
          <ActionButton 
            icon={<Eye className="w-4 h-4" />}
            context="3 At Risk"
            label="View Students"
            color="yellow"
            onClick={() => navigate('/education/analytics?filter=at-risk')}
          />
          <ActionButton 
            icon={<FileText className="w-4 h-4" />}
            context="5 Pending"
            label="Review Applications"
            color="blue"
            onClick={() => navigate('/education/admissions')}
          />
        </div>
      </motion.div>

      {/* MIDDLE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attendance Overview with Legend */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-lg">📅 Attendance Overview</h2>
            </div>
            <button 
              onClick={() => navigate('/education/attendance')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1"><span className="text-green-600">🟢</span> &gt;85%</span>
            <span className="flex items-center gap-1"><span className="text-yellow-600">🟡</span> 70-85%</span>
            <span className="flex items-center gap-1"><span className="text-red-600">🔴</span> &lt;70%</span>
          </div>

          <div className="space-y-3">
            {attendanceData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">{item.className}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${item.percentage >= 85 ? 'bg-green-500' : item.percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'} h-2 rounded-full`} 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${getAttendanceColor(item.percentage)}`}>
                    {getAttendanceIcon(item.percentage)} {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => navigate('/education/attendance/mark')}
            className="mt-5 w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all duration-200"
          >
            📝 Mark Today's Attendance
          </button>
        </motion.div>

        {/* Recent Activity - Single Line Alignment */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-lg">🕒 Recent Activity</h2>
          </div>

          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{activity.icon}</span>
                  <span className="text-sm text-gray-600">{activity.text}</span>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* QUICK ACTIONS - PRIMARY COLORED BUTTONS */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="font-semibold text-lg">⚡ Quick Actions</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.onClick}
              className={`${
                action.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                action.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                action.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-purple-600 hover:bg-purple-700'
              } text-white px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200`}
            >
              {action.icon}
              {action.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* WHATSAPP SECTION - WITH PREVIEW + SAFETY */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold text-lg">💬 Send Quick WhatsApp Message</h2>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <select 
            className="border border-green-200 rounded-xl px-3 py-2 text-sm bg-white flex-1 min-w-[150px]"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Select Class</option>
            <option>Grade 5-A</option>
            <option>Grade 5-B</option>
            <option>Grade 6-A</option>
            <option>Grade 6-B</option>
            <option>All Students</option>
          </select>

          <select 
            className="border border-green-200 rounded-xl px-3 py-2 text-sm bg-white flex-1 min-w-[150px]"
            value={selectedTemplate}
            onChange={(e) => {
              setSelectedTemplate(e.target.value);
              updateMessagePreview(e.target.value);
            }}
          >
            <option value="fee_reminder">Fee Reminder</option>
            <option value="attendance_alert">Attendance Alert</option>
            <option value="exam_result">Exam Result</option>
          </select>
        </div>

        {/* Message Preview with Real Example */}
        <div className="bg-white rounded-xl p-3 mb-3 border border-green-100">
          <p className="text-xs text-gray-500 mb-1">Preview:</p>
          <p className="text-sm text-gray-700">{messagePreview}</p>
        </div>

        {/* Demo Mode Warning */}
        {user?.is_demo && (
          <div className="bg-yellow-50 rounded-xl p-2 mb-3 border border-yellow-200">
            <p className="text-xs text-yellow-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              ⚠️ Demo Mode: Message will not be sent (simulation only)
            </p>
          </div>
        )}

        <button className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-all duration-200 flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send WhatsApp
        </button>
      </motion.div>

      {/* UPCOMING EVENTS WITH PRIORITY COLORS */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold text-lg">📅 Upcoming Events & Deadlines</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingEvents.map((event, idx) => (
            <div key={idx} 
              className={`rounded-xl p-3 ${
                event.priority === 'high' ? 'bg-red-50 border border-red-200' :
                event.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-green-50 border border-green-200'
              } hover:shadow-md transition-all duration-200`}
            >
              <p className="font-medium text-gray-800 flex items-center gap-2">
                <span>{event.icon}</span>
                <span>{event.name}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{event.date}</p>
              <p className={`text-xs font-medium mt-1 ${
                event.priority === 'high' ? 'text-red-600' :
                event.priority === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {event.daysLeft === 0 ? 'Today!' : `${event.daysLeft} days left`}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* SMART INSIGHT WITH REASONING */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-3 rounded-full">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">🔥 Smart Insight</h3>
              <p className="text-sm text-gray-600">Attendance dropped 5% this week in Grade 6-B</p>
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <p>Possible causes:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>3 frequent absentees identified</li>
                  <li>Monday attendance dip (20% lower)</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <ActionButton 
              icon={<Eye className="w-4 h-4" />}
              label="Investigate"
              color="blue"
              onClick={() => navigate('/education/analytics')}
            />
            <ActionButton 
              icon={<Bell className="w-4 h-4" />}
              label="Notify Teacher"
              color="orange"
              onClick={() => {}}
            />
            <ActionButton 
              icon={<Users className="w-4 h-4" />}
              label="View Students"
              color="purple"
              onClick={() => navigate('/education/students')}
            />
          </div>
        </div>
      </motion.div>

      {/* DEMO MODE BANNER - CONVERSION FOCUSED */}
      {user?.is_demo && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-5 border border-yellow-200"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-full">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">🧪 Demo Mode (6 days left)</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This is a sample school with preloaded data. Actions like WhatsApp are simulated.
                </p>
                <div className="mt-2 text-xs text-yellow-600">
                  🎯 <span className="font-medium">Pro Tip:</span> Explore all features before upgrading to your real school account
                </div>
              </div>
            </div>
            <ActionButton 
              icon={<TrendingUp className="w-4 h-4" />}
              label="Upgrade to Real Account"
              color="orange"
              onClick={() => window.open('mailto:sales@codecortex.com', '_blank')}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
