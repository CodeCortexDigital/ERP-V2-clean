import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ArrowUpDown, Edit2, MessageCircle,
  Users, TrendingUp, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import studentService, { Student } from '@/services/student.service';
import StudentDrawer from '@/components/students/StudentDrawer';
import classService, { SchoolClass, Section } from '@/services/class.service';

interface StudentWithData extends Student {
  attendance_percentage?: number;
  fee_status?: string;
  balance?: number;
  priority?: string;
  class_name?: string;
  section_name?: string;
  class_code?: string;
}

export default function StudentsListPage() {
  const [students, setStudents] = useState<StudentWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeeStatus, setSelectedFeeStatus] = useState('');
  const [lowAttendanceOnly, setLowAttendanceOnly] = useState(false);
  const [sortField, setSortField] = useState('student_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkLoading, _setBulkLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classMap, setClassMap] = useState<Map<string, string>>(new Map());
  const [sectionMap, setSectionMap] = useState<Map<string, string>>(new Map());
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  // First, load classes and sections
  useEffect(() => {
    loadClassesAndSections();
  }, []);

  // Then load students after classes/sections are loaded
  useEffect(() => {
    if (isDataLoaded) {
      fetchStudents();
    }
  }, [isDataLoaded, selectedClass, selectedSection]);

  const loadClassesAndSections = async () => {
    try {
      const response = await classService.getAll();
      const classesData = response.data || [];
      setClasses(classesData);
      
      // Build class map
      const newClassMap = new Map<string, string>();
      classesData.forEach((cls: SchoolClass) => {
        newClassMap.set(cls.id, cls.name);
      });
      setClassMap(newClassMap);
      
      // Also create a map for class names by code for fallback
      classesData.forEach((cls: SchoolClass) => {
        if (cls.code) {
          newClassMap.set(cls.code, cls.name);
        }
      });
      
      console.log('Classes loaded:', classesData);
      console.log('Class Map:', Array.from(newClassMap.entries()));
      
      // Build section map
      const newSectionMap = new Map<string, string>();
      const allSections: Section[] = [];
      for (const cls of classesData) {
        try {
          const sectionsRes = await classService.getSections(cls.id);
          const sectionsData: Section[] = sectionsRes.data || [];
          allSections.push(...sectionsData);
          sectionsData.forEach((sec: Section) => {
            newSectionMap.set(sec.id, sec.name);
          });
        } catch (e) {
          console.error('Error loading sections for class:', cls.id);
        }
      }
      setSectionMap(newSectionMap);
      setSections(allSections);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error loading classes:', error);
      setIsDataLoaded(true); // Still proceed to load students
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getAll();
      const responseData = Array.isArray(response.data)
        ? response.data
        : ((response.data as any)?.results || []);
      const studentData: Student[] = responseData || [];
      
      // Process students to add class and section names using the loaded maps
      const studentsWithNames = studentData.map((student: Student) => {
        // Try multiple ways to get class name
        let className = 'Not Assigned';
        
        // Method 1: Use classMap by ID
        if (student.current_class && classMap.has(student.current_class)) {
          className = classMap.get(student.current_class) || 'Not Assigned';
        }
        // Method 2: Direct from API
        else if (student.current_class_name) {
          className = student.current_class_name;
        }
        // Method 3: Look up by class code
        else if (student.class_code && classMap.has(student.class_code)) {
          className = classMap.get(student.class_code) || 'Not Assigned';
        }
        
        // Get section name
        let sectionName = '';
        if (student.current_section && sectionMap.has(student.current_section)) {
          sectionName = sectionMap.get(student.current_section) || '';
        }
        if (student.current_section_name) {
          sectionName = student.current_section_name;
        }
        
        console.log(`Student ${student.full_name}: class_id=${student.current_class}, resolved_class=${className}, section=${sectionName}`);
        
        return {
          ...student,
          class_name: className,
          section_name: sectionName,
          attendance_percentage: 0,
          fee_status: 'pending',
          balance: 0,
          priority: 'normal'
        };
      });
      
      setStudents(studentsWithNames);
      
      // Get 360 data for attendance and fees
      const enhancedPromises = studentsWithNames.map(async (student) => {
        try {
          const dashboard = await studentService.get360View(student.id);
          return {
            id: student.id,
            attendance_percentage: dashboard.data?.attendance?.attendance_rate || 0,
            balance: dashboard.data?.finance?.balance_due || 0,
            fee_status: (dashboard.data?.finance?.balance_due || 0) > 0 ? 'pending' : 'paid',
            priority: (dashboard.data?.attendance?.attendance_rate || 0) < 75 || (dashboard.data?.finance?.balance_due || 0) > 0 ? 'high' : 'normal'
          };
        } catch (err) {
          return { id: student.id, attendance_percentage: 0, balance: 0, fee_status: 'pending', priority: 'normal' };
        }
      });
      
      const results = await Promise.all(enhancedPromises);
      
      setStudents(prevStudents => 
        prevStudents.map(s => {
          const result = results.find(r => r.id === s.id);
          if (result) {
            return { 
              ...s, 
              attendance_percentage: result.attendance_percentage,
              balance: result.balance,
              fee_status: result.fee_status,
              priority: result.priority
            };
          }
          return s;
        })
      );
      
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
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
        return <Badge variant="destructive">Overdue</Badge>;
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedSection('');
    setSelectedStatus('');
    setSelectedFeeStatus('');
    setLowAttendanceOnly(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !selectedClass || s.current_class === selectedClass;
    const matchesSection = !selectedSection || s.current_section === selectedSection;
    
    let matchesStatus = true;
    if (selectedStatus === 'active') {
      matchesStatus = s.is_active === true;
    } else if (selectedStatus === 'inactive') {
      matchesStatus = s.is_active === false;
    }
    
    const matchesFeeStatus = !selectedFeeStatus || s.fee_status === selectedFeeStatus;
    
    let matchesLowAttendance = true;
    if (lowAttendanceOnly) {
      matchesLowAttendance = (s.attendance_percentage || 0) < 75;
    }
    
    return matchesSearch && matchesClass && matchesSection && matchesStatus && matchesFeeStatus && matchesLowAttendance;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const idA = a.student_id || '';
    const idB = b.student_id || '';
    return sortOrder === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
  });

  const paginatedStudents = sortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(s => s.is_active === true).length;
  const inactiveStudents = filteredStudents.filter(s => s.is_active === false).length;
  const overdueFees = filteredStudents.filter(s => s.fee_status === 'overdue' || s.fee_status === 'pending').length;
  const lowAttendance = filteredStudents.filter(s => (s.attendance_percentage || 0) < 75).length;
  const attentionNeeded = filteredStudents.filter(s => s.priority === 'high').length;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Students</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all students in your school</p>
        </div>
      </div>

      {attentionNeeded > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <span className="text-sm font-semibold text-red-800">
                ⚠️ {attentionNeeded} Student(s) Need Attention
              </span>
              <p className="text-xs text-red-600 mt-0.5">Low attendance (&lt;75%) or pending fees</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { 
                setLowAttendanceOnly(true); 
                setSelectedStatus('active'); 
                setSelectedFeeStatus(''); 
                setSelectedClass(''); 
                setSelectedSection('');
                setSearchTerm(''); 
              }} 
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              View All → ({attentionNeeded})
            </button>
            {lowAttendanceOnly && (
              <button 
                onClick={() => { 
                  setLowAttendanceOnly(false); 
                  clearFilters(); 
                }} 
                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-blue-50 rounded-xl p-3"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-600">Total</span></div><p className="text-xl font-bold text-blue-700">{totalStudents}</p></div>
        <div className="bg-green-50 rounded-xl p-3"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-600">Active</span></div><p className="text-xl font-bold text-green-700">{activeStudents}</p></div>
        <div className="bg-gray-50 rounded-xl p-3"><div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-gray-600" /><span className="text-xs text-gray-600">Inactive</span></div><p className="text-xl font-bold text-gray-700">{inactiveStudents}</p></div>
        <div className="bg-red-50 rounded-xl p-3"><div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-600">Pending Fees</span></div><p className="text-xl font-bold text-red-700">{overdueFees}</p></div>
        <div className="bg-yellow-50 rounded-xl p-3"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-yellow-600" /><span className="text-xs text-gray-600">Low Attendance</span></div><p className="text-xl font-bold text-yellow-700">{lowAttendance}</p></div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div></div>
        
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
        </select>
        
        <select 
          className="border rounded-lg px-3 py-2 text-sm"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          disabled={!selectedClass}
        >
          <option value="">All Sections</option>
          {sections.filter(sec => sec.class_ref === selectedClass).map(sec => (
            <option key={sec.id} value={sec.id}>Section {sec.name}</option>
          ))}
        </select>
        
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedFeeStatus} onChange={(e) => setSelectedFeeStatus(e.target.value)}>
          <option value="">All Fees</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        
        <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
        
        {lowAttendanceOnly && (
          <Button onClick={() => { setLowAttendanceOnly(false); clearFilters(); }} variant="outline" size="sm" className="bg-red-50 text-red-600 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Clear Low Attendance Filter
          </Button>
        )}
      </div>

      {showBulkBar && (<div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between"><span className="text-sm font-medium">{selectedStudents.length} selected</span><div className="flex gap-2"><button disabled={bulkLoading} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">Send Message</button><button onClick={() => setSelectedStudents([])} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg">Cancel</button></div></div>)}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="p-3 w-10"><input type="checkbox" checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onChange={toggleSelectAll} /></th>
              <th className="p-3 text-left cursor-pointer hover:text-blue-600" onClick={() => handleSort('student_id')}>Student ID <ArrowUpDown className="w-3 h-3 inline ml-1" /></th>
              <th className="p-3 text-left cursor-pointer hover:text-blue-600" onClick={() => handleSort('full_name')}>Student Name <ArrowUpDown className="w-3 h-3 inline ml-1" /></th>
              <th className="p-3 text-left cursor-pointer hover:text-blue-600" onClick={() => handleSort('class_name')}>Class <ArrowUpDown className="w-3 h-3 inline ml-1" /></th>
              <th className="p-3 text-left cursor-pointer hover:text-blue-600" onClick={() => handleSort('attendance_percentage')}>Attendance <ArrowUpDown className="w-3 h-3 inline ml-1" /></th>
              <th className="p-3 text-left">Fees</th>
              <th className="p-3 text-left">Priority</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((student) => (
              <tr key={student.id} className={`border-b cursor-pointer ${getRowHighlightClass(student)}`} onClick={() => handleRowClick(student.id)}>
                <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleSelectStudent(student.id)} /></td>
                <td className="p-3 font-mono text-xs font-medium">{student.student_id}</td>
                <td className="p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-semibold">{student.full_name?.charAt(0)}</div><div><p className="font-medium">{student.full_name}</p></div></div></td>
                <td className="p-3">{student.class_name || '-'}{student.section_name ? ` (${student.section_name})` : ''}</td>
                <td className="p-3"><div className="flex items-center gap-2"><span className={`text-sm font-medium ${getAttendanceColor(student.attendance_percentage || 0)}`}>{student.attendance_percentage || 0}%</span>{(student.attendance_percentage || 0) < 75 && <span className="text-red-500 text-xs">⚠</span>}</div></td>
                <td className="p-3">{getFeeStatusBadge(student.fee_status || 'pending')}</td>
                <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(student.priority || 'normal')}`}>{getPriorityLabel(student.priority || 'normal')}</span></td>
                <td className="p-3"><Badge variant={student.is_active ? 'success' : 'secondary'}>{student.is_active ? 'Active' : 'Inactive'}</Badge></td>
                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => navigate(`/education/students/${student.id}/edit`)} className="p-1.5 rounded-lg hover:bg-blue-100" title="Edit"><Edit2 className="w-4 h-4 text-blue-600" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-green-100" title="Send Message"><MessageCircle className="w-4 h-4 text-green-600" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* Student Drawer */}
      <StudentDrawer studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />
    </div>
  );
}
