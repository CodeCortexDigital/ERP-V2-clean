import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Edit2, Trash2, Eye, 
  MessageCircle, DollarSign, Calendar, Filter,
  ChevronLeft, ChevronRight, UserPlus, BookOpen,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import studentService, { Student } from '@/services/student.service';

// Format phone number
const formatPhone = (phone: string) => {
  if (!phone) return '-';
  // Format: 0300 123 4567
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
  }
  return phone;
};

// Quick Filter Chips
const filterChips = [
  { label: 'All', value: 'all', icon: null },
  { label: 'Active', value: 'active', icon: <CheckCircle className="w-3 h-3" /> },
  { label: 'Not Assigned', value: 'not_assigned', icon: <AlertCircle className="w-3 h-3" /> },
  { label: 'Fees Due', value: 'fees_due', icon: <DollarSign className="w-3 h-3" /> },
];

export default function StudentsListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this student?')) {
      await studentService.delete(id);
      fetchStudents();
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(paginatedStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAssignClass = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Open assign class modal
    alert(`Assign class for student ${studentId}`);
  };

  const handleBulkAction = (action: string) => {
    if (selectedStudents.length === 0) return;
    alert(`Bulk ${action} for ${selectedStudents.length} students`);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === 'active') matchesFilter = s.is_active === true;
    if (activeFilter === 'not_assigned') matchesFilter = !s.current_class;
    
    return matchesSearch && matchesFilter;
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Students</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all students in your school</p>
        </div>
        <Button onClick={() => navigate('/education/students/add')} className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
          <UserPlus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setActiveFilter(chip.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5
              ${activeFilter === chip.value 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {chip.icon}
            {chip.label}
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedStudents.length > 0 && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-blue-50 rounded-xl p-3 flex items-center justify-between border border-blue-200"
        >
          <span className="text-sm text-blue-700 font-medium">
            {selectedStudents.length} student(s) selected
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => handleBulkAction('Send WhatsApp')}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
            >
              💬 Send WhatsApp
            </button>
            <button 
              onClick={() => handleBulkAction('Mark Attendance')}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              📅 Mark Attendance
            </button>
            <button 
              onClick={() => setSelectedStudents([])}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              <option>Grade 5-A</option>
              <option>Grade 5-B</option>
              <option>Grade 6-A</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Student Table */}
      <Card>
        <CardContent className="pt-0 overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No students found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/education/students/add')}>
                Add your first student
              </Button>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-[35%]">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-[15%]">Class</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-[20%]">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-[15%]">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr 
                      key={student.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer transition-all duration-200 group"
                      onClick={() => navigate(`/education/students/${student.id}`)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectStudent(student.id, e as any);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold flex items-center justify-center flex-shrink-0">
                            {student.full_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{student.full_name}</p>
                            <p className="text-xs text-gray-400">{student.student_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {student.current_class ? (
                          <span className="text-gray-700">{student.current_class}</span>
                        ) : (
                          <button
                            onClick={(e) => handleAssignClass(student.id, e)}
                            className="text-blue-600 text-sm font-medium hover:underline transition"
                          >
                            + Assign Class
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {formatPhone(student.phone)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/education/students/${student.id}`); }}
                            className="p-1.5 rounded-lg hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-green-100 transition-all duration-200 hover:scale-105"
                            title="Send WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-yellow-100 transition-all duration-200 hover:scale-105"
                            title="Record Payment"
                          >
                            <DollarSign className="w-4 h-4 text-yellow-600" />
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-purple-100 transition-all duration-200 hover:scale-105"
                            title="Mark Attendance"
                          >
                            <Calendar className="w-4 h-4 text-purple-600" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(student.id, e)}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-all duration-200 hover:scale-105"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="transition-all duration-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-3 py-1 text-sm bg-gray-100 rounded-lg">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="transition-all duration-200"
                    >
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
  );
}
