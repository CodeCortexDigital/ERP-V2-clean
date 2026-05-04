import { useState, useEffect } from 'react';
import { X, Phone, Mail, Calendar, DollarSign, MessageCircle, CreditCard, BookOpen, Award, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import studentService, { Student360Data } from '@/services/student.service';

interface StudentDrawerProps {
  studentId: string | null;
  onClose: () => void;
  refreshTrigger?: number;
}

// Mini attendance trend component
const AttendanceTrend = ({ data }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-8 mt-2">
      {data.map((value, idx) => (
        <div 
          key={idx}
          className="flex-1 bg-blue-500 rounded-sm transition-all"
          style={{ height: `${(value / max) * 100}%`, width: '100%' }}
          title={`Week ${idx + 1}: ${value}%`}
        />
      ))}
    </div>
  );
};

// Activity timeline component
const ActivityTimeline = ({ activities }) => {
  const getIcon = (type) => {
    switch(type) {
      case 'payment': return <DollarSign className="w-3 h-3 text-green-500" />;
      case 'attendance': return <Calendar className="w-3 h-3 text-blue-500" />;
      case 'exam': return <Award className="w-3 h-3 text-purple-500" />;
      default: return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-2">
      {activities.map((activity, idx) => (
        <div key={idx} className="flex items-start gap-2 text-xs">
          {getIcon(activity.type)}
          <div className="flex-1">
            <p className="text-gray-600">{activity.message}</p>
            <p className="text-gray-400 text-[10px]">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Fee history component
const FeeHistory = ({ history }) => (
  <div className="space-y-2">
    {history.map((item, idx) => (
      <div key={idx} className="flex justify-between items-center text-xs">
        <span className="text-gray-500">{item.month}</span>
        <span className={item.status === 'paid' ? 'text-green-600' : item.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}>
          {item.status === 'paid' ? '✓ Paid' : item.status === 'pending' ? '⏳ Pending' : '⚠️ Overdue'}
        </span>
        <span className="font-medium">Rs {item.amount}</span>
      </div>
    ))}
  </div>
);

export default function StudentDrawer({ studentId, onClose, refreshTrigger = 0 }: StudentDrawerProps) {
  const [student, setStudent] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId, refreshTrigger]);

  const fetchStudentData = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const response = await studentService.get360View(studentId);
      setStudent(response.data);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = (type: string) => {
    if (!student) return;
    let message = '';
    const phone = student.student.guardian_phone || student.student.phone;
    
    switch (type) {
      case 'fee_reminder':
        message = `Dear Parent, fee of Rs ${student.finance.balance} is due for ${student.student.full_name}.`;
        break;
      case 'attendance_alert':
        message = `Dear Parent, ${student.student.full_name} was marked absent today.`;
        break;
      default:
        message = `Dear Parent, this is a message regarding ${student.student.full_name}.`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getAttendanceLabel = (rate: number) => {
    if (rate >= 85) return 'Excellent';
    if (rate >= 70) return 'Average';
    return 'Needs improvement';
  };

  const attendanceRate = student?.attendance?.attendance_rate || 0;
  const balanceDue = student?.finance?.balance || 0;

  // Mock data for trends (should come from API)
  const attendanceTrend = [85, 82, 78, 80, 75, 72, 68];
  const feeHistory = [
    { month: 'Jan', amount: 5000, status: 'paid' },
    { month: 'Feb', amount: 5000, status: 'paid' },
    { month: 'Mar', amount: 5000, status: 'pending' },
  ];
  const activities = [
    { type: 'payment', message: 'Fee payment received: Rs 5,000', time: '2 days ago' },
    { type: 'attendance', message: 'Marked absent', time: 'Yesterday' },
    { type: 'attendance', message: 'Marked present', time: 'Today' },
  ];

  const getClassName = () => {
    if (!student) return 'No class assigned';
    return student.class_info?.class_name || student.student?.current_class || 'No class assigned';
  };

  if (loading) {
    return (
      <AnimatePresence>
        {studentId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {studentId && student && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Student Profile</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                  {student.student.full_name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{student.student.full_name}</h3>
                  <p className="text-sm text-gray-500">{student.student.student_id}</p>
                  <p className="text-xs text-gray-400 mt-1">{getClassName()}</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Attendance</p>
                    {attendanceRate >= 75 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                  </div>
                  <p className="text-xl font-bold text-green-600">{attendanceRate}%</p>
                  <p className="text-xs text-gray-400">{getAttendanceLabel(attendanceRate)}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Avg Marks</p>
                  <p className="text-xl font-bold text-blue-600">{student.exams.average_percentage}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${student.exams.average_percentage}%` }} />
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="text-lg font-bold text-yellow-600">Rs {balanceDue.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">Due: {balanceDue > 0 ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleSendWhatsApp('general')} className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button className="flex items-center justify-center gap-2 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition">
                  <CreditCard className="w-4 h-4" /> Payment
                </button>
                <button className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                  <Calendar className="w-4 h-4" /> Attendance
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 border-b overflow-x-auto">
                {['overview', 'attendance', 'finance', 'timeline'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 text-sm capitalize whitespace-nowrap transition ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === 'overview' && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-600">Phone:</span><span>{student.student.phone || 'Not provided'}</span></p>
                      <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-600">Email:</span><span>{student.student.email}</span></p>
                      <p className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-400" /><span className="text-gray-600">Program:</span><span>{student.student.program || 'Not specified'}</span></p>
                    </div>
                    <div className="border-t pt-3">
                      <h4 className="font-medium text-sm mb-2">Guardian Info</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Father: {student.student.father_name || 'Not provided'}</p>
                        <p>Mother: {student.student.mother_name || 'Not provided'}</p>
                        <p>Guardian Phone: {student.student.guardian_phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'attendance' && (
                  <>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall Attendance</span>
                        <span className={`font-bold ${attendanceRate >= 75 ? 'text-green-600' : 'text-red-600'}`}>{attendanceRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className={`h-2 rounded-full ${attendanceRate >= 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${attendanceRate}%` }} />
                      </div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">Attendance Trend (Last 7 weeks)</p>
                      <AttendanceTrend data={attendanceTrend} />
                      <p className="text-xs text-gray-400 text-center mt-2">⬇️ Slight decline - needs attention</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Recent Records</h4>
                      {student.attendance.recent_records?.slice(0, 5).map((record, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 border-b">
                          <span>{record.date}</span>
                          <span className={record.status === 'present' ? 'text-green-600' : 'text-red-600'}>{record.status}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'finance' && (
                  <>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Balance Due</p>
                      <p className="text-2xl font-bold text-yellow-600">Rs {balanceDue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Paid: Rs {student.finance.paid.toLocaleString()} / Rs {student.finance.total_fees.toLocaleString()}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${student.finance.payment_percentage}%` }} />
                      </div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">Fee History</p>
                      <FeeHistory history={feeHistory} />
                    </div>
                    
                    <button className="w-full bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition">
                      Record Payment
                    </button>
                    {balanceDue > 0 && (
                      <button onClick={() => handleSendWhatsApp('fee_reminder')} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                        Send Reminder
                      </button>
                    )}
                  </>
                )}

                {activeTab === 'timeline' && (
                  <div className="bg-white border rounded-lg p-3">
                    <p className="text-sm font-medium mb-3">Activity Timeline</p>
                    <ActivityTimeline activities={activities} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

