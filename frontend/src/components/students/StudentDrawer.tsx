import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Phone, Calendar, BookOpen, DollarSign, TrendingUp, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import studentService from '@/services/student.service';
import { resolveMediaUrl } from '@/utils/fileUpload';
import { Modal } from '@/components/ui/Modal';
import financeService from '@/services/finance.service';
import pdfService from '@/services/pdf.service';

interface StudentDrawerProps {
  studentId: string | null;
  onClose: () => void;
}

export default function StudentDrawer({ studentId, onClose }: StudentDrawerProps) {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchStudentInvoices = async () => {
    if (!student?.id) return;
    setLoadingInvoices(true);
    try {
      const res = await financeService.getInvoices({ student_id: student.id });
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setInvoices(data);
    } catch (err) {
      console.error('Error fetching student invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (feeModalOpen) {
      fetchStudentInvoices();
    }
  }, [feeModalOpen]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (student?.profile_picture) {
        const url = await resolveMediaUrl(student.profile_picture);
        if (active) setProfilePictureUrl(url);
      } else {
        if (active) setProfilePictureUrl(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [student?.profile_picture]);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const response = await studentService.getById(studentId!);
      setStudent(response.data);
      
      try {
        const dashboard = await studentService.get360View(studentId!);
        setDashboardData(dashboard.data);
      } catch (e) {
        console.error('Error fetching dashboard:', e);
      }
    } catch (error) {
      console.error('Error fetching student:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!studentId) return null;

  return (
    <>
      {/* Overlay - clicking closes drawer */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Student Profile</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : student ? (
          <div className="p-5 space-y-5">
            <div className="text-center">
              <div 
                onClick={() => profilePictureUrl && setIsImageModalOpen(true)}
                className={`w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold overflow-hidden ${profilePictureUrl ? 'cursor-pointer hover:ring-4 hover:ring-blue-55 transition duration-200' : ''}`}
                title={profilePictureUrl ? "Click to view full image" : ""}
              >
                {profilePictureUrl ? (
                  <img 
                    src={profilePictureUrl} 
                    alt={student.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  student.full_name?.charAt(0)
                )}
              </div>
              <h3 className="text-xl font-bold mt-3">{student.full_name}</h3>
              <p className="text-gray-500 text-sm">{student.student_id}</p>
              <Badge variant={student.is_active ? 'success' : 'secondary'} className="mt-2">
                {student.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Attendance</p>
                <p className="text-xl font-bold text-blue-600">{dashboardData?.attendance?.attendance_rate || 0}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-xl font-bold text-red-600">${dashboardData?.finance?.balance_due || 0}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Contact Information</h4>
              <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" />{student.email}</div>
              <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" />{student.phone || 'Not provided'}</div>
              <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-gray-400" />Father: {student.father_name || 'N/A'}</div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={() => { navigate(`/education/students/${student.id}`); onClose(); }} className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Full Profile
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setFeeModalOpen(true)}>
                <DollarSign className="w-4 h-4 mr-2" />
                Fee Details
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-5 text-center text-gray-500">Student not found</div>
        )}
      </div>
      {/* Fee Details Modal */}
      <Modal
        open={feeModalOpen}
        onClose={() => setFeeModalOpen(false)}
        title={`Fee Details - ${student?.full_name}`}
        description={`View and download fee receipts for STU-${student?.student_id}`}
        size="lg"
      >
        {loadingInvoices ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No invoices found for this student.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Invoice No</th>
                  <th className="p-3 text-left">Due Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                    <td className="p-3 text-gray-600">{inv.due_date}</td>
                    <td className="p-3 text-right font-medium">${Number(inv.total_amount || 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-green-600">${Number(inv.paid_amount || 0).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={
                        inv.status === 'paid' ? 'success' :
                        inv.status === 'partially_paid' || inv.status === 'partial' || (Number(inv.paid_amount) > 0 && Number(inv.balance_due) > 0) ? 'warning' :
                        inv.status === 'overdue' ? 'destructive' : 'secondary'
                      }>
                        {inv.status?.replace('_', ' ') || 'pending'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      {inv.status === 'paid' || Number(inv.paid_amount) > 0 ? (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => pdfService.downloadFeeReceipt(inv.id)}
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4 text-blue-600" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => pdfService.downloadFeeReceipt(inv.id)}
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4 text-gray-400" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
      {/* Profile Picture Full-screen Modal */}
      {isImageModalOpen && profilePictureUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 transition-opacity cursor-zoom-out"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-lg max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <img 
              src={profilePictureUrl} 
              alt={student?.full_name} 
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
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
    </>
  );
}
