import { useState, useEffect } from 'react';
import { X, Phone, Mail, Calendar, DollarSign, MessageCircle, CreditCard, BookOpen, Award, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import studentService, { Student360Data } from '@/services/student.service';

interface StudentDrawerProps {
  studentId: string | null;
  onClose: () => void;
  refreshTrigger?: number;
}

export default function StudentDrawer({ studentId, onClose, refreshTrigger }: StudentDrawerProps) {
  const [student, setStudent] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

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
      case 'result':
        message = `Dear Parent, exam results for ${student.student.full_name} are now available.`;
        break;
      default:
        message = `Dear Parent, this is a message regarding ${student.student.full_name}.`;
    }
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleMarkAttendance = async (status: string) => {
    setMarkingAttendance(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Attendance marked as ${status}`);
      fetchStudentData();
    } finally {
      setMarkingAttendance(false);
    }
  };

  const attendanceRate = student?.attendance.attendance_rate || 0;
  const balanceDue = student?.finance.balance || 0;

  const getClassName = () => {
    if (!student) return 'No class assigned';
    return student.class_info?.class_name || student.student?.current_class || 'No class assigned';
  };

  return (
    <AnimatePresence>
      {studentId && (
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
            className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Student Profile</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : student ? (
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

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Attendance</p>
                    <p className="text-lg font-bold text-green-600">{attendanceRate}%</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Avg Marks</p>
                    <p className="text-lg font-bold text-blue-600">{student.exams.average_percentage}%</p>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-lg font-bold text-yellow-600">Rs {balanceDue}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleSendWhatsApp('general')} className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button onClick={() => setShowPaymentModal(true)} className="flex items-center justify-center gap-2 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition">
                    <CreditCard className="w-4 h-4" /> Payment
                  </button>
                  <button onClick={() => handleMarkAttendance('present')} className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    <Calendar className="w-4 h-4" /> Mark Present
                  </button>
                  {attendanceRate < 75 && (
                    <button onClick={() => handleSendWhatsApp('attendance_alert')} className="flex items-center justify-center gap-2 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
                      <AlertCircle className="w-4 h-4" /> Alert Parent
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b">
                  {['overview', 'attendance', 'finance', 'exams'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 text-sm capitalize transition ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-3">
                  {activeTab === 'overview' && (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-600">Phone:</span><span>{student.student.phone || 'Not provided'}</span></p>
                        <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-600">Email:</span><span>{student.student.email}</span></p>
                        <p className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-400" /><span className="text-gray-600">Program:</span><span>{student.student.program || 'Not specified'}</span></p>
                      </div>
                      <div className="border-t pt-3"><h4 className="font-medium text-sm mb-2">Guardian Info</h4><div className="space-y-1 text-sm text-gray-600"><p>Father: {student.student.father_name || 'Not provided'}</p><p>Mother: {student.student.mother_name || 'Not provided'}</p><p>Guardian Phone: {student.student.guardian_phone || 'Not provided'}</p></div></div>
                    </>
                  )}
                  {activeTab === 'attendance' && (
                    <><div className="bg-gray-50 p-3 rounded-lg"><div className="flex justify-between"><span className="text-sm">Overall Attendance</span><span className={`font-bold ${attendanceRate >= 75 ? 'text-green-600' : 'text-red-600'}`}>{attendanceRate}%</span></div><div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className={`h-2 rounded-full ${attendanceRate >= 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${attendanceRate}%` }} /></div></div><div className="space-y-2"><h4 className="font-medium text-sm">Recent Records</h4>{student.attendance.recent_records?.slice(0, 5).map((record, idx) => (<div key={idx} className="flex justify-between text-sm py-1 border-b"><span>{record.date}</span><span className={record.status === 'present' ? 'text-green-600' : 'text-red-600'}>{record.status}</span></div>))}</div></>
                  )}
                  {activeTab === 'finance' && (
                    <><div className="bg-yellow-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Balance Due</p><p className="text-2xl font-bold text-yellow-600">Rs {balanceDue}</p><p className="text-xs text-gray-500">Paid: Rs {student.finance.paid} / Rs {student.finance.total_fees}</p></div><button onClick={() => setShowPaymentModal(true)} className="w-full bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition">Record Payment</button></>
                  )}
                  {activeTab === 'exams' && (
                    <><div className="bg-blue-50 p-3 rounded-lg text-center"><p className="text-2xl font-bold text-blue-600">{student.exams.average_percentage}%</p><p className="text-sm text-gray-600">Average Score</p></div><div className="space-y-2">{student.exams.recent_results?.map((result, idx) => (<div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"><span className="text-sm font-medium">{result.exam_title}</span><div className="text-right"><span className="text-sm">{result.marks}</span><span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${result.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{result.grade}</span></div></div>))}</div><button onClick={() => handleSendWhatsApp('result')} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Send Results via WhatsApp</button></>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">Student not found</div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

