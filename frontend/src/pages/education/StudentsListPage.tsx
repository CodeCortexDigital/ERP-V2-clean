import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Search, ArrowUpDown, Edit2, Trash2, MessageCircle, DollarSign,
  Users, TrendingUp, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, UserPlus, X, Clock, Filter
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useForm } from 'react-hook-form';
import studentService, { Student } from '@/services/student.service';
import StudentDrawer from '@/components/students/StudentDrawer';
import api from '@/services/api';
import classService, { SchoolClass } from '@/services/class.service';

interface StudentWithData extends Student {
  attendance_percentage?: number;
  fee_status?: string;
  balance?: number;
  priority?: string;
  last_activity?: string;
  class_name?: string;
}

interface StudentFormData {
  full_name: string;
  email: string;
  phone: string;
  student_id: string;
  father_name: string;
  mother_name: string;
  guardian_phone: string;
  current_class?: string;
}

export default function StudentsListPage() {
  const [students, setStudents] = useState<StudentWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeeStatus, setSelectedFeeStatus] = useState('');
  const [sortField, setSortField] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StudentFormData>();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      fetchStudents();
    }
  }, [classes]);

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getAll();
      let studentData = [];
      if (Array.isArray(response.data)) {
        studentData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        studentData = response.data.results;
      }
      
      const dashboardPromises = studentData.map(async (student) => {
        try {
          const dashboard = await studentService.getDashboardData(student.id);
          return { student, dashboard: dashboard.data };
        } catch (err) {
          return { student, dashboard: null };
        }
      });
      
      const results = await Promise.all(dashboardPromises);
      
      const studentsWithData = results.map(({ student, dashboard }) => {
        const classObj = classes.find(c => c.id === student.current_class);
        return {
          ...student,
          class_name: classObj?.name || 'Not Assigned',
          attendance_percentage: dashboard?.attendance_percentage || 0,
          fee_status: dashboard?.fee_status || 'pending',
          balance: dashboard?.balance || 0,
          priority: dashboard?.priority || 'normal',
          last_activity: dashboard?.last_activities?.[0]?.time || student.updated_at
        };
      });
      
      setStudents(studentsWithData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    if (!dateString) return 'Never';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴 High';
      case 'medium': return '🟡 Medium';
      default: return '🟢 Good';
    }
  };

  const getFeeStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'overdue':
        return <Badge variant="danger">Overdue</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRowHighlightClass = (student: StudentWithData) => {
    if (student.priority === 'high') return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500';
    if (student.priority === 'medium') return 'bg-yellow-50 hover:bg-yellow-100';
    return 'hover:bg-gray-50';
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRowClick = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this student? This action cannot be undone.')) {
      await studentService.delete(id);
      fetchStudents();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedStatus('');
    setSelectedFeeStatus('');
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !selectedClass || s.current_class === selectedClass;
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'active' && s.is_active) ||
      (selectedStatus === 'inactive' && !s.is_active);
    const matchesFeeStatus = !selectedFeeStatus || s.fee_status === selectedFeeStatus;
    
    return matchesSearch && matchesClass && matchesStatus && matchesFeeStatus;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let valA, valB;
    if (sortField === 'full_name') {
      valA = a.full_name || '';
      valB = b.full_name || '';
    } else if (sortField === 'attendance_percentage') {
      valA = a.attendance_percentage || 0;
      valB = b.attendance_percentage || 0;
    } else if (sortField === 'class_name') {
      valA = a.class_name || '';
      valB = b.class_name || '';
    } else {
      valA = a.student_id || '';
      valB = b.student_id || '';
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedStudents = sortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(s => s.is_active).length;
  const overdueFees = filteredStudents.filter(s => s.fee_status === 'overdue').length;
  const lowAttendance = filteredStudents.filter(s => (s.attendance_percentage || 0) < 75).length;
  const attentionNeeded = filteredStudents.filter(s => s.priority === 'high').length;

  useEffect(() => {
    setShowBulkBar(selectedStudents.length > 0);
  }, [selectedStudents]);

  const onSubmit = async (data: StudentFormData) => {
    try {
      const cleanData: any = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        student_id: data.student_id,
        father_name: data.father_name,
        mother_name: data.mother_name,
        guardian_phone: data.guardian_phone,
        current_class: data.current_class
      };
      
      if (editingStudent) {
        await api.patch(`/auth/students/${editingStudent.id}/`, cleanData);
        alert('Student updated successfully!');
        if (selectedStudentId === editingStudent.id) {
          // Refresh drawer
          setSelectedStudentId(null);
          setTimeout(() => setSelectedStudentId(editingStudent.id), 100);
        }
      } else {
        await api.post('/auth/students/', cleanData);
        alert('Student created successfully!');
      }
      setShowForm(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (error: any) {
      console.error('Error saving student:', error);
      alert(error.response?.data?.error || 'Failed to save student');
    }
  };

  useEffect(() => {
    if (editingStudent) {
      reset({
        full_name: editingStudent.full_name,
        email: editingStudent.email,
        phone: editingStudent.phone || '',
        student_id: editingStudent.student_id,
        father_name: editingStudent.father_name || '',
        mother_name: editingStudent.mother_name || '',
        guardian_phone: editingStudent.guardian_phone || '',
        current_class: editingStudent.current_class || ''
      });
    } else {
      reset({});
    }
  }, [editingStudent, reset]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Students</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all students in your school</p>
        </div>
        <Button onClick={() => { setEditingStudent(null); setShowForm(true); }} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      {/* Attention Banner */}
      {attentionNeeded > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-orange-700">
              ⚠ {attentionNeeded} student(s) need attention (Low attendance / Overdue fees)
            </span>
          </div>
          <button 
            onClick={() => { setSelectedFeeStatus('overdue'); setSelectedStatus('active'); }}
            className="text-sm text-orange-600 font-medium hover:underline"
          >
            View all →
          </button>
        </div>
      )}

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-600">Total</span></div>
          <p className="text-xl font-bold text-blue-700">{totalStudents}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-600">Active</span></div>
          <p className="text-xl font-bold text-green-700">{activeStudents}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-600">Overdue Fees</span></div>
          <p className="text-xl font-bold text-red-700">{overdueFees}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3">
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-yellow-600" /><span className="text-xs text-gray-600">Low Attendance</span></div>
          <p className="text-xl font-bold text-yellow-700">{lowAttendance}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedFeeStatus} onChange={(e) => setSelectedFeeStatus(e.target.value)}>
          <option value="">All Fee Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
      </div>

      {/* Bulk Action Bar */}
      {showBulkBar && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedStudents.length} selected</span>
          <div className="flex gap-2">
            <button disabled={bulkLoading} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">Send Message</button>
            <button onClick={() => setSelectedStudents([])} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="p-3 w-10">
                <input type="checkbox" checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="p-3 text-left cursor-pointer hover:text-blue-600" onClick={() => handleSort('full_name')}>
                <div className="flex items-center gap-1">Student <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-left cursor-pointer hover:text-blue-600" onClick={() => handleSort('class_name')}>
                <div className="flex items-center gap-1">Class <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-left cursor-pointer hover:text-blue-600" onClick={() => handleSort('attendance_percentage')}>
                <div className="flex items-center gap-1">Attendance <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-left">Fees</th>
              <th className="p-3 text-left">Priority</th>
              <th className="p-3 text-left">Last Activity</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((student) => (
              <tr key={student.id} className={`border-b cursor-pointer ${getRowHighlightClass(student)}`} onClick={() => handleRowClick(student.id)}>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleSelectStudent(student.id)} />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-semibold">
                      {student.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-xs text-gray-400">{student.student_id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">{student.class_name || '-'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getAttendanceColor(student.attendance_percentage || 0)}`}>
                      {student.attendance_percentage || 0}%
                    </span>
                    {(student.attendance_percentage || 0) < 75 && <span className="text-red-500 text-xs">⚠</span>}
                  </div>
                </td>
                <td className="p-3">{getFeeStatusBadge(student.fee_status || 'pending')}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(student.priority || 'normal')}`}>
                    {getPriorityLabel(student.priority || 'normal')}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{getRelativeTime(student.last_activity || '')}</span>
                  </div>
                </td>
                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditingStudent(student); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-100">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-green-100">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-yellow-100">
                    <DollarSign className="w-4 h-4 text-yellow-600" />
                  </button>
                  <button onClick={(e) => handleDelete(student.id, e)} className="p-1.5 rounded-lg hover:bg-red-100">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 text-sm bg-gray-100 rounded-lg">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Student Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={() => { setShowForm(false); setEditingStudent(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Full Name *</label><input {...register("full_name", { required: true })} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Email *</label><input {...register("email", { required: true })} type="email" className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input {...register("phone")} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Student ID</label><input {...register("student_id")} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Father's Name</label><input {...register("father_name")} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Mother's Name</label><input {...register("mother_name")} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Guardian Phone</label><input {...register("guardian_phone")} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Class</label>
                <select {...register("current_class")} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select Class</option>
                  {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Save</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingStudent(null); }} className="flex-1 border py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Drawer */}
      <StudentDrawer studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />
    </div>
  );
}
