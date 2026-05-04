import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, UserPlus, BookOpen, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<StudentFormData>();

  const fetchStudents = async () => {
    try {
      const response = await studentService.getAll();
      let studentData = [];
      if (Array.isArray(response.data)) {
        studentData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        studentData = response.data.results;
      }
      setStudents(studentData);
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
    fetchStudents();
    fetchClasses();
  }, []);

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
      reset({
        full_name: '',
        email: '',
        phone: '',
        student_id: '',
        father_name: '',
        mother_name: '',
        guardian_phone: '',
        current_class: ''
      });
    }
  }, [editingStudent, reset]);

  const onSubmit = async (data: StudentFormData) => {
    console.log("FORM DATA:", data);
    
    try {
      const cleanData: any = {
        full_name: data.full_name,
        email: data.email,
      };
      
      if (data.phone && data.phone.trim()) cleanData.phone = data.phone;
      if (data.student_id && data.student_id.trim()) cleanData.student_id = data.student_id;
      if (data.father_name && data.father_name.trim()) cleanData.father_name = data.father_name;
      if (data.mother_name && data.mother_name.trim()) cleanData.mother_name = data.mother_name;
      if (data.guardian_phone && data.guardian_phone.trim()) cleanData.guardian_phone = data.guardian_phone;
      
      // Add class if selected
      if (data.current_class && data.current_class !== '') {
        cleanData.current_class = data.current_class;
        console.log('Adding class to payload:', data.current_class);
      }
      
      console.log('Final payload:', cleanData);
      
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
    } catch (error: any) {
      console.error('Error saving student:', error);
      alert(error.response?.data?.error || 'Failed to save student');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deactivate this student?')) {
      await studentService.delete(id);
      fetchStudents();
    }
  };

  const handleRowClick = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const filteredStudents = students.filter(s => {
    return s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-0 overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No students found</p>
                <Button variant="outline" className="mt-4" onClick={() => { setEditingStudent(null); setShowForm(true); }}>
                  Add your first student
                </Button>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(student.id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold flex items-center justify-center">
                              {student.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{student.full_name}</p>
                              <p className="text-xs text-gray-400">{student.student_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{formatPhone(student.phone)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingStudent(student); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 transition" title="Edit">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(student.id, e); }} className="p-1.5 rounded-lg hover:bg-red-100 transition" title="Delete">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
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
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

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
                <Controller
                  control={control}
                  name="current_class"
                  render={({ field }) => (
                    <select
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Save</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingStudent(null); }} className="flex-1 border border-gray-200 py-2 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StudentDrawer 
        studentId={selectedStudentId} 
        onClose={() => setSelectedStudentId(null)} 
        refreshTrigger={refreshTrigger}
      />
    </>
  );
}
