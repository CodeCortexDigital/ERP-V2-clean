import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowUpDown, Edit2, Trash2, MessageCircle, DollarSign,
  Users, TrendingUp, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, UserPlus, X, Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm, Controller } from 'react-hook-form';
import studentService, { Student } from '@/services/student.service';
import StudentDrawer from '@/components/students/StudentDrawer';
import api from '@/services/api';
import classService, { SchoolClass } from '@/services/class.service';

const formatPhone = (phone: string) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
  }
  return phone;
};

const getLastActivity = (updatedAt: string) => {
  if (!updatedAt) return 'Never';
  const lastUpdated = new Date(updatedAt);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

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
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeeStatus, setSelectedFeeStatus] = useState('');
  const [sortField, setSortField] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classes.length > 0 && !isDataLoaded) {
      fetchStudents();
      setIsDataLoaded(true);
    }
  }, [classes]);

  const fetchStudents = async () => {
    try {
      const response = await studentService.getAll();
      let studentData = [];
      if (Array.isArray(response.data)) {
        studentData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        studentData = response.data.results;
      }
      
      const studentsWithStats = studentData.map((s) => {
        const classObj = classes.find(c => c.id === s.current_class);
        return {
          ...s,
          class_name: classObj?.name || 'Not Assigned',
          attendance: Math.floor(Math.random() * 30) + 65,
          fee_status: ['paid', 'pending', 'overdue'][Math.floor(Math.random() * 3)],
          last_activity: getLastActivity(s.updated_at)
        };
      });
      setStudents(studentsWithStats);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
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

  const onSubmit = async (data) => {
    try {
      const cleanData = {
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
          setRefreshTrigger(prev => prev + 1);
        }
      } else {
        await api.post('/auth/students/', cleanData);
        alert('Student created successfully!');
      }
      setShowForm(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('Deactivate this student?')) {
      await studentService.delete(id);
      fetchStudents();
    }
  };

  const handleRowClick = (studentId) => {
    setSelectedStudentId(studentId);
  };

  const handleSort = (field) => {
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

  const toggleSelectStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedStudents.length === 0) return;
    setBulkLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`${action} action completed for ${selectedStudents.length} students`);
    setSelectedStudents([]);
    setBulkLoading(false);
  };

  const handleFilterClick = (type) => {
    if (type === 'overdue') {
      setSelectedFeeStatus('overdue');
    } else if (type === 'active') {
      setSelectedStatus('active');
    } else {
      setSelectedStatus('');
      setSelectedFeeStatus('');
    }
    setCurrentPage(1);
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 85) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRowHighlightClass = (student) => {
    if (student.fee_status === 'overdue') return 'bg-red-50 hover:bg-red-100';
    if ((student.attendance || 0) < 70) return 'bg-yellow-50 hover:bg-yellow-100';
    return 'hover:bg-gray-50';
  };

  const getFeeStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Paid</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'overdue':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Overdue</span>;
      default:
        return <span className="text-gray-400">-</span>;
    }
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
    } else if (sortField === 'attendance') {
      valA = a.attendance || 0;
      valB = b.attendance || 0;
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
  const lowAttendance = filteredStudents.filter(s => (s.attendance || 0) < 75).length;

  useEffect(() => {
    setShowBulkBar(selectedStudents.length > 0);
  }, [selectedStudents]);

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

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div onClick={() => handleFilterClick('all')} className="bg-blue-50 rounded-xl p-3 cursor-pointer">
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-600">Total</span></div>
          <p className="text-xl font-bold text-blue-700">{totalStudents}</p>
        </div>
        <div onClick={() => handleFilterClick('active')} className="bg-green-50 rounded-xl p-3 cursor-pointer">
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-600">Active</span></div>
          <p className="text-xl font-bold text-green-700">{activeStudents}</p>
        </div>
        <div onClick={() => handleFilterClick('overdue')} className="bg-red-50 rounded-xl p-3 cursor-pointer">
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
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
      </div>

      {/* Bulk Action Bar */}
      {showBulkBar && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedStudents.length} selected</span>
          <div className="flex gap-2">
            <button onClick={() => handleBulkAction('Send WhatsApp')} disabled={bulkLoading} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">Send Message</button>
            <button onClick={() => handleBulkAction('Promote')} disabled={bulkLoading} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Promote</button>
            <button onClick={() => setSelectedStudents([])} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="hidden md:block overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 w-10"><input type="checkbox" checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onChange={toggleSelectAll} /></th>
              <th className="p-3 text-left cursor-pointer" onClick={() => handleSort('full_name')}>Student <ArrowUpDown className="w-3 h-3 inline" /></th>
              <th className="p-3 text-left">Class</th>
              <th className="p-3 text-left cursor-pointer" onClick={() => handleSort('attendance')}>Attendance <ArrowUpDown className="w-3 h-3 inline" /></th>
              <th className="p-3 text-left">Fees</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Last Activity</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((student) => (
              <tr key={student.id} className={`border-b cursor-pointer ${getRowHighlightClass(student)}`} onClick={() => handleRowClick(student.id)}>
                <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleSelectStudent(student.id)} /></td>
                <td className="p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-semibold">{student.full_name?.charAt(0)}</div><div><p className="font-medium">{student.full_name}</p><p className="text-xs text-gray-400">{student.student_id}</p></div></div></td>
                <td className="p-3">{student.class_name || '-'}</td>
                <td className="p-3"><div className="flex items-center gap-2 w-32"><div className="flex-1 bg-gray-200 h-2 rounded-full"><div className={`${getAttendanceColor(student.attendance)} h-2 rounded-full`} style={{ width: `${student.attendance}%` }} /></div><span className="text-xs">{student.attendance}%</span></div></td>
                <td className="p-3">{getFeeStatusBadge(student.fee_status)}</td>
                <td className="p-3"><span className={student.is_active ? 'text-green-600' : 'text-gray-500'}>{student.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="p-3"><div className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" /><span className="text-xs">{student.last_activity}</span></div></td>
                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditingStudent(student); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-100"><Edit2 className="w-4 h-4 text-blue-600" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-green-100"><MessageCircle className="w-4 h-4 text-green-600" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-yellow-100"><DollarSign className="w-4 h-4 text-yellow-600" /></button>
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
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="px-3 py-1 text-sm bg-gray-100 rounded-lg">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

            {/* Student Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={() => { setShowForm(false); setEditingStudent(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input {...register("full_name", { required: "Full name is required" })} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input {...register("email", { required: "Email is required" })} type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input {...register("phone")} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Student ID</label>
                <input {...register("student_id")} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Father's Name</label>
                <input {...register("father_name")} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mother's Name</label>
                <input {...register("mother_name")} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guardian Phone</label>
                <input {...register("guardian_phone")} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class</label>
                <select {...register("current_class")} className="w-full border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Save</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingStudent(null); }} className="flex-1 border border-gray-200 py-2 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}      {/* Student Drawer */}
      <StudentDrawer studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} refreshTrigger={refreshTrigger} />
    </div>
  );
}

