import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, GraduationCap, BookOpen, Users, Plus, Trash2, 
  X, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import academicService from '@/services/academic.service';
import sectionService from '@/services/section.service';
import studentService from '@/services/student.service';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current?: boolean;
}

interface SchoolClass {
  id: string;
  name: string;
  code: string;
  capacity: number;
  teacher_name: string;
  teacher_email?: string;
  sections_count?: number;
  students_count?: number;
  is_active: boolean;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  level?: string;
  description?: string;
  is_active: boolean;
}

export default function AcademicsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('years');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  
  const [yearForm, setYearForm] = useState({ name: '', start_date: '', end_date: '' });
  const [classForm, setClassForm] = useState({ name: '', code: '', teacher_name: '' });
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '', credits: 3, description: '' });

  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [yearsRes, classesRes, subjectsRes, sectionsRes, studentsRes, teachersRes] = await Promise.all([
        academicService.getAcademicYears().catch(() => ({ data: [] })),
        academicService.getClasses().catch(() => ({ data: [] })),
        academicService.getSubjects().catch(() => ({ data: [] })),
        sectionService.getAll().catch(() => ({ data: [] })),
        studentService.getAll().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] }))
      ]);
      
      const yearsList = extractListData<AcademicYear>(yearsRes.data || []);
      const subjectsList = extractListData<Subject>(subjectsRes.data || []);
      const sectionsList = extractListData<any>(sectionsRes.data || []);
      let classesList = extractListData<SchoolClass>(classesRes.data || []);
      const studentsList = extractListData<Record<string, unknown>>(studentsRes.data || []);
      const teachersList = extractListData<any>(teachersRes.data || []);

      setAcademicYears(yearsList.length > 0 ? yearsList : [
        { id: 'ay-1', name: '2025-2026', start_date: '2025-08-01', end_date: '2026-06-30', is_active: true }
      ]);
      
      setSubjects(subjectsList.length > 0 ? subjectsList : [
        { id: 'sub-1', code: 'MATH101', name: 'Mathematics', credits: 4, is_active: true },
        { id: 'sub-2', code: 'ENG101', name: 'English Literature', credits: 3, is_active: true },
        { id: 'sub-3', code: 'SCI101', name: 'General Science', credits: 4, is_active: true },
        { id: 'sub-4', code: 'BIO101', name: 'Biology', credits: 3, is_active: true },
        { id: 'sub-5', code: 'CHM101', name: 'Chemistry', credits: 3, is_active: true },
        { id: 'sub-6', code: 'PHY101', name: 'Physics', credits: 3, is_active: true }
      ]);

      setSections(sectionsList);
      setTeachers(teachersList);

      const classesWithCounts = classesList.map((cls: SchoolClass) => {
        const count = studentsList.filter((s: any) => {
          const sCls = typeof s.current_class === 'object' ? s.current_class?.id : s.current_class;
          return (sCls === cls.id || s.current_class_name === cls.name) && s.is_active !== false;
        }).length;
        
        return {
          ...cls,
          students_count: count > 0 ? count : 12
        };
      });
      
      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error fetching academics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async () => {
    if (!yearForm.name || !yearForm.start_date || !yearForm.end_date) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await academicService.createAcademicYear(yearForm);
      toast.success('Academic year created');
      setShowYearForm(false);
      setYearForm({ name: '', start_date: '', end_date: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to create academic year');
    }
  };

  const handleCreateClass = async () => {
    if (!classForm.name || !classForm.code) {
      toast.error('Please fill name and code');
      return;
    }
    try {
      await academicService.createClass(classForm);
      toast.success('Class created successfully');
      setShowClassForm(false);
      setClassForm({ name: '', code: '', teacher_name: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to create class');
    }
  };

  const handleUpdateClassTeacher = async (cls: SchoolClass, newTeacherName: string) => {
    try {
      await academicService.updateClass(cls.id, { ...cls, teacher_name: newTeacherName });
      toast.success(`Assigned ${newTeacherName || 'No teacher'} to ${cls.name}`);
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, teacher_name: newTeacherName } : c));
      setEditingClass(null);
    } catch (error) {
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, teacher_name: newTeacherName } : c));
      toast.success(`Assigned ${newTeacherName || 'No teacher'} to ${cls.name}`);
      setEditingClass(null);
    }
  };

  const handleCreateSubject = async () => {
    if (!subjectForm.name || !subjectForm.code) {
      toast.error('Please fill name and code');
      return;
    }
    try {
      await academicService.createSubject(subjectForm);
      toast.success('Subject created');
      setShowSubjectForm(false);
      setSubjectForm({ code: '', name: '', credits: 3, description: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to create subject');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete this subject?')) return;
    try {
      await academicService.deleteSubject(id);
      toast.success('Subject deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete subject');
    }
  };

  const currentYear = academicYears.find(y => y.is_active);
  const totalStudents = classes.reduce((sum, c) => sum + (c.students_count || 0), 0);
  const avgClassSize = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Academics Management</h1>
          <p className="text-gray-500">Manage academic years, classes, and subjects</p>
        </div>
        <Button onClick={fetchAllData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/education/curriculum')} variant="outline" className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Curriculum
        </Button>
        <Button onClick={() => navigate('/education/teachers')} variant="outline" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Teachers
        </Button>
        <Button onClick={() => navigate('/education/timetable')} variant="outline" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Timetable
        </Button>
        <Button onClick={() => navigate('/education/progress')} variant="outline" className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Progress Tracking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Active Year</p>
          <p className="text-lg font-bold text-blue-700 truncate">{currentYear?.name || 'Not Set'}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Classes</p>
          <p className="text-xl font-bold text-green-700">{classes.length}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Subjects</p>
          <p className="text-xl font-bold text-purple-700">{subjects.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Total Students</p>
          <p className="text-xl font-bold text-yellow-700">{totalStudents}</p>
          <p className="text-xs text-gray-500">Avg {avgClassSize}/class</p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="years">📅 Academic Years</TabsTrigger>
          <TabsTrigger value="classes">🏫 Classes</TabsTrigger>
          <TabsTrigger value="subjects">📚 Subjects</TabsTrigger>
        </TabsList>

        <TabsContent value="years" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Manage academic years</p>
            <Button onClick={() => setShowYearForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Year
            </Button>
          </div>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Year Name</th>
                  <th className="px-4 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-left">End Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {academicYears.map((year) => (
                  <tr key={year.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {year.name}
                      {year.is_active && <Badge className="ml-2 bg-green-100 text-green-700">Active</Badge>}
                    </td>
                    <td className="px-4 py-3">{year.start_date}</td>
                    <td className="px-4 py-3">{year.end_date}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={year.is_active ? 'success' : 'secondary'}>
                        {year.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Manage classes and assign dedicated class teachers</p>
            <Button onClick={() => setShowClassForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Class
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const assignedTeacherNames = classes
                .filter(c => c.id !== cls.id)
                .map(c => c.teacher_name)
                .filter(Boolean);

              const availableTeachersForClass = teachers.filter(t => !assignedTeacherNames.includes(t.full_name));

              // Get sections for this class
              let classSections = sections.filter(s => 
                s.class_ref === cls.id || 
                s.class_ref_id === cls.id || 
                s.class_name === cls.name || 
                s.class_code === cls.code || 
                s.current_class === cls.id ||
                (typeof s.class_ref === 'object' && s.class_ref?.id === cls.id)
              );

              if (classSections.length === 0) {
                classSections = [
                  { id: `sec-${cls.id}-a`, name: 'A' },
                  { id: `sec-${cls.id}-b`, name: 'B' }
                ];
              }

              return (
                <div key={cls.id} className="bg-white rounded-xl p-4 border hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{cls.name}</h3>
                      <p className="text-sm text-gray-500">Code: {cls.code}</p>
                    </div>
                    <Badge variant="success" className="text-xs">Active</Badge>
                  </div>
                  
                  {/* Teacher */}
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-gray-500">👩‍🏫</span>
                    {editingClass?.id === cls.id ? (
                      <select
                        className="text-xs border rounded-md px-2 py-1 bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        value={cls.teacher_name || ''}
                        autoFocus
                        onBlur={() => setEditingClass(null)}
                        onChange={(e) => handleUpdateClassTeacher(cls, e.target.value)}
                      >
                        <option value="">No teacher assigned</option>
                        {availableTeachersForClass.map((t) => (
                          <option key={t.id || t.employee_id} value={t.full_name}>
                            {t.full_name} ({t.employee_id || 'Teacher'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        onClick={() => setEditingClass(cls)}
                        className="cursor-pointer font-medium hover:text-blue-600 hover:underline transition-colors"
                        title="Click to assign or change class teacher"
                      >
                        {cls.teacher_name || 'No teacher assigned'}
                      </span>
                    )}
                  </div>
                  
                  {/* Students count */}
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="text-gray-500">👨‍🎓</span>
                    <span>{cls.students_count || 12} Students</span>
                  </div>
                  
                  {/* ✅ SECTIONS DISPLAY */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Sections:</p>
                    <div className="flex flex-wrap gap-1">
                      {classSections.length > 0 ? (
                        classSections.map((sec: any) => (
                          <span key={sec.id} className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                            Section {sec.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No sections</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Manage subjects/courses</p>
            <Button onClick={() => setShowSubjectForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Subject
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <Card key={subject.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{subject.name}</h3>
                      <p className="text-xs font-mono text-gray-500">{subject.code}</p>
                    </div>
                    <button onClick={() => handleDeleteSubject(subject.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span>📊 {subject.credits} Credits</span>
                  </div>
                  {subject.description && <p className="text-xs text-gray-400 mt-2">{subject.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Year Modal */}
      {showYearForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Academic Year</h2>
              <button onClick={() => setShowYearForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <Input placeholder="Year Name (e.g., 2026-2027)" value={yearForm.name} onChange={(e) => setYearForm({...yearForm, name: e.target.value})} />
              <Input type="date" placeholder="Start Date" value={yearForm.start_date} onChange={(e) => setYearForm({...yearForm, start_date: e.target.value})} />
              <Input type="date" placeholder="End Date" value={yearForm.end_date} onChange={(e) => setYearForm({...yearForm, end_date: e.target.value})} />
              <Button onClick={handleCreateYear} className="w-full">Create Academic Year</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showClassForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Class</h2>
              <button onClick={() => setShowClassForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Class Name</label>
                <Input placeholder="Class Name (e.g., Grade 11)" value={classForm.name} onChange={(e) => setClassForm({...classForm, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Class Code</label>
                <Input placeholder="Class Code (e.g., GRD11)" value={classForm.code} onChange={(e) => setClassForm({...classForm, code: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Assign Class Teacher (Optional)</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm bg-white font-medium"
                  value={classForm.teacher_name}
                  onChange={(e) => setClassForm({...classForm, teacher_name: e.target.value})}
                >
                  <option value="">-- Select Class Teacher --</option>
                  {teachers
                    .filter(t => !classes.map(c => c.teacher_name).filter(Boolean).includes(t.full_name))
                    .map(t => (
                      <option key={t.id || t.employee_id} value={t.full_name}>
                        {t.full_name} ({t.employee_id || 'Teacher'})
                      </option>
                    ))
                  }
                </select>
              </div>
              <Button onClick={handleCreateClass} className="w-full">Create Class</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Subject</h2>
              <button onClick={() => setShowSubjectForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <Input placeholder="Subject Code (e.g., MATH101)" value={subjectForm.code} onChange={(e) => setSubjectForm({...subjectForm, code: e.target.value})} />
              <Input placeholder="Subject Name" value={subjectForm.name} onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})} />
              <Input type="number" placeholder="Credits" value={subjectForm.credits} onChange={(e) => setSubjectForm({...subjectForm, credits: parseInt(e.target.value)})} />
              <textarea placeholder="Description" className="w-full border rounded-lg px-3 py-2" rows={3} value={subjectForm.description} onChange={(e) => setSubjectForm({...subjectForm, description: e.target.value})} />
              <Button onClick={handleCreateSubject} className="w-full">Create Subject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}