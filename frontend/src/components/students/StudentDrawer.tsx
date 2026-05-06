import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Phone, Calendar, BookOpen, DollarSign, TrendingUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import studentService from '@/services/student.service';

interface StudentDrawerProps {
  studentId: string | null;
  onClose: () => void;
}

export default function StudentDrawer({ studentId, onClose }: StudentDrawerProps) {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const navigate = useNavigate();

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
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold">
                {student.full_name?.charAt(0)}
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
              <Button variant="outline" className="flex-1">
                <DollarSign className="w-4 h-4 mr-2" />
                Fee Details
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-5 text-center text-gray-500">Student not found</div>
        )}
      </div>
    </>
  );
}
