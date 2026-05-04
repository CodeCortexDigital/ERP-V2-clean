import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MessageCircle, DollarSign, Calendar, FileText,
  User, Mail, Phone, BookOpen, CheckCircle, XCircle, Clock,
  TrendingUp, Award, AlertCircle, Send, CreditCard, Eye,
  Check, X, Plus, Download, Printer, Trash2, Edit2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import studentService, { Student360Data } from '@/services/student.service';

// Format phone number
const formatPhone = (phone: string) => {
  if (!phone) return 'Not provided';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
  }
  return phone;
};

// Reusable Card Component
function InfoCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        {icon && <div className="text-gray-400">{icon}</div>}
        <p className="text-sm text-gray-500">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [student, setStudent] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Save last tab to localStorage
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('studentLastTab', activeTab);
      setSearchParams({ tab: activeTab });
    }
  }, [activeTab, setSearchParams]);

  // Load last tab from localStorage on mount
  useEffect(() => {
    const lastTab = localStorage.getItem('studentLastTab');
    if (lastTab && !searchParams.get('tab')) {
      setActiveTab(lastTab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const fetchStudentData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await studentService.get360View(id);
      setStudent(response.data);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (status: string) => {
    setMarkingAttendance(true);
    try {
      // API call to mark attendance
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Attendance marked as ${status}`);
      fetchStudentData();
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Payment of Rs ${paymentAmount} recorded successfully`);
      setShowPaymentModal(false);
      setPaymentAmount('');
      fetchStudentData();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const handleSendWhatsApp = (type: string) => {
    if (!student) return;
    let message = '';
    const phone = student.student.guardian_phone || student.student.phone;
    
    switch (type) {
      case 'fee_reminder':
        message = `Dear Parent, fee of Rs ${student.finance.balance} is due for ${student.student.full_name}. Please pay at your earliest convenience.`;
        break;
      case 'attendance_alert':
        message = `Dear Parent, ${student.student.full_name} was marked absent today. Please ensure regular attendance.`;
        break;
      case 'result':
        message = `Dear Parent, exam results for ${student.student.full_name} are now available. Average: ${student.exams.average_percentage}%`;
        break;
      default:
        message = `Dear Parent, this is a message regarding ${student.student.full_name}.`;
    }
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const attendanceRate = student?.attendance.attendance_rate || 0;
  const balanceDue = student?.finance.balance || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500">Student not found</p>
        <Button onClick={() => navigate('/education/students')} className="mt-4">
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/education/students')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center text-xl font-bold">
            {student.student.full_name?.charAt(0) || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{student.student.full_name}</h1>
              <Badge variant={student.student.is_active ? 'success' : 'secondary'}>
                {student.student.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {student.class_info.class_name || 'No Class'} {student.class_info.section_name ? `• ${student.class_info.section_name}` : ''} • {student.student.student_id}
            </p>
          </div>
        </div>

        {/* QUICK ACTIONS BAR */}
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => handleSendWhatsApp('general')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Payment
          </button>
          <button 
            onClick={() => handleMarkAttendance('present')}
            disabled={markingAttendance}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard title="Attendance Rate" icon={<CheckCircle className="w-4 h-4" />}>
          <p className="text-2xl font-bold text-green-600">{attendanceRate}%</p>
          <Progress value={attendanceRate} className="mt-2" />
        </InfoCard>
        
        <InfoCard title="Average Marks" icon={<Award className="w-4 h-4" />}>
          <p className="text-2xl font-bold text-blue-600">{student.exams.average_percentage}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {student.exams.passed} passed / {student.exams.total_exams} exams
          </p>
        </InfoCard>
        
        <InfoCard title="Fee Balance" icon={<DollarSign className="w-4 h-4" />}>
          <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
            Rs {balanceDue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Paid: Rs {student.finance.paid.toLocaleString()} / Rs {student.finance.total_fees.toLocaleString()}
          </p>
        </InfoCard>
        
        <InfoCard title="Status" icon={<AlertCircle className="w-4 h-4" />}>
          <div className="flex items-center gap-2">
            {attendanceRate < 75 ? (
              <>
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-orange-600">Needs Attention</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600">Good Standing</span>
              </>
            )}
          </div>
          {attendanceRate < 75 && (
            <button 
              onClick={() => handleSendWhatsApp('attendance_alert')}
              className="mt-2 text-xs text-orange-600 hover:underline flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              Notify Parent
            </button>
          )}
        </InfoCard>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Basic Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Student ID:</span>
                  <span className="font-mono">{student.student.student_id}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Email:</span>
                  <span>{student.student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Phone:</span>
                  <span>{formatPhone(student.student.phone)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Program:</span>
                  <span>{student.student.program || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Guardian Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Father:</span>
                  <span>{student.student.father_name || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Mother:</span>
                  <span>{student.student.mother_name || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Guardian Phone:</span>
                  <span>{formatPhone(student.student.guardian_phone)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="flex gap-3">
            <button 
              onClick={() => handleMarkAttendance('present')}
              disabled={markingAttendance}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Mark Present Today
            </button>
            <button 
              onClick={() => handleMarkAttendance('absent')}
              disabled={markingAttendance}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Mark Absent
            </button>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-medium mb-3">Recent Records</h3>
            <div className="space-y-2">
              {student.attendance.recent_records?.slice(0, 10).map((record, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">{record.date}</span>
                  <Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'destructive'}>
                    {record.status}
                  </Badge>
                </div>
              ))}
              {(!student.attendance.recent_records || student.attendance.recent_records.length === 0) && (
                <p className="text-gray-500 text-center py-4">No attendance records found</p>
              )}
            </div>
          </div>

          {attendanceRate < 75 && (
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-orange-700">Low attendance detected (below 75%)</span>
                </div>
                <button 
                  onClick={() => handleSendWhatsApp('attendance_alert')}
                  className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
                >
                  <Send className="w-3 h-3" />
                  Notify Parent
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* FINANCE TAB */}
        <TabsContent value="finance" className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-semibold mb-2">Financial Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Total Fees</p>
                <p className="text-lg font-bold">Rs {student.finance.total_fees.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid Amount</p>
                <p className="text-lg font-bold text-green-600">Rs {student.finance.paid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance Due</p>
                <p className={`text-lg font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Rs {balanceDue.toLocaleString()}
                </p>
              </div>
            </div>
            <Progress value={student.finance.payment_percentage} className="h-2" />
            <p className="text-xs text-gray-500 text-center mt-2">
              {Math.round(student.finance.payment_percentage)}% Paid
            </p>
          </div>

          {student.finance.last_payment && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-green-700">
                Last Payment: Rs {student.finance.last_payment.amount} on {student.finance.last_payment.date}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
            {balanceDue > 0 && (
              <button 
                onClick={() => handleSendWhatsApp('fee_reminder')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Reminder
              </button>
            )}
          </div>
        </TabsContent>

        {/* EXAMS TAB */}
        <TabsContent value="exams" className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Exam</th>
                  <th className="px-4 py-3 text-center">Marks</th>
                  <th className="px-4 py-3 text-center">Percentage</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                 </tr>
              </thead>
              <tbody>
                {student.exams.recent_results?.map((result, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-3">{result.exam_title}</td>
                    <td className="px-4 py-3 text-center">{result.marks}</td>
                    <td className="px-4 py-3 text-center">{result.percentage}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${
                        result.grade === 'A+' || result.grade === 'A' ? 'text-green-600' :
                        result.grade === 'B' ? 'text-blue-600' :
                        result.grade === 'C' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.grade}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!student.exams.recent_results || student.exams.recent_results.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No exam results available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button 
            onClick={() => handleSendWhatsApp('result')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Results via WhatsApp
          </button>
        </TabsContent>
      </Tabs>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
            <div className="space-y-4">
              <div>
                <Label>Amount (Rs)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <select 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Credit/Debit Card</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleRecordPayment} className="flex-1">Record Payment</Button>
                <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
