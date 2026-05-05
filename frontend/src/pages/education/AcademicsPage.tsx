import { useState, useEffect } from 'react';
import { 
  Calendar, GraduationCap, BookOpen, Users, Plus, Edit2, Trash2, 
  ChevronRight, ChevronDown, School, Layers, Clock, X, RefreshCw,
  CheckCircle, AlertCircle, Settings, FolderTree
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import academicsService, { AcademicYear, SchoolClass, Course } from '@/services/academics.service';

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState('years');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  
  const [yearForm, setYearForm] = useState({ name: '', start_date: '', end_date: '', is_current: false });
  const [classForm, setClassForm] = useState({ name: '', code: '', capacity: 30, teacher_name: '', teacher_email: '', academic_year_id: '' });
  const [courseForm, setCourseForm] = useState({ code: '', name: '', credits: 3, level: '', description: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [yearsRes, classesRes, coursesRes] = await Promise.all([
        academicsService.getAcademicYears(),
        academicsService.getClasses(),
        academicsService.getCourses()
      ]);
      setAcademicYears(yearsRes.data);
      setClasses(classesRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error fetching academics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentYear = async (yearId: string) => {
    try {
      await academicsService.updateAcademicYear(yearId, { is_current: true });
      fetchAllData();
      alert('Current academic year updated');
    } catch (error) {
      alert('Failed to set current year');
    }
  };

  const handleToggleYearStatus = async (yearId: string, isActive: boolean) => {
    try {
      await academicsService.updateAcademicYear(yearId, { is_active: !isActive });
      fetchAllData();
      alert(`Year ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleCreateYear = async () => {
    try {
      await academicsService.createAcademicYear(yearForm);
      setShowYearForm(false);
      setYearForm({ name: '', start_date: '', end_date: '', is_current: false });
      fetchAllData();
      alert('Academic year created successfully');
    } catch (error) {
      alert('Failed to create academic year');
    }
  };

  const handleCreateClass = async () => {
    try {
      await academicsService.createClass(classForm);
      setShowClassForm(false);
      setClassForm({ name: '', code: '', capacity: 30, teacher_name: '', teacher_email: '', academic_year_id: '' });
      fetchAllData();
      alert('Class created successfully');
    } catch (error) {
      alert('Failed to create class');
    }
  };

  const handleCreateCourse = async () => {
    try {
      await academicsService.createCourse(courseForm);
      setShowCourseForm(false);
      setCourseForm({ code: '', name: '', credits: 3, level: '', description: '' });
      fetchAllData();
      alert('Course created successfully');
    } catch (error) {
      alert('Failed to create course');
    }
  };

  const currentYear = academicYears.find(y => y.is_current);
  const totalSections = classes.reduce((sum, c) => sum + (c.sections_count || 0), 0);
  const totalStudents = classes.reduce((sum, c) => sum + c.students_count, 0);
  const avgClassSize = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;
  const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  const enrollmentRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Academics Management</h1>
          <p className="text-gray-500">System configuration engine for classes, sections, and courses</p>
        </div>
        <Button onClick={fetchAllData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Active Year</p>
          <p className="text-lg font-bold text-blue-700 truncate">{currentYear?.name || 'Not Set'}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Classes</p>
          <p className="text-xl font-bold text-green-700">{classes.length}</p>
          <p className="text-xs text-gray-500">{totalSections} sections</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Subjects</p>
          <p className="text-xl font-bold text-purple-700">{courses.length}</p>
          <p className="text-xs text-gray-500">Active courses</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Total Students</p>
          <p className="text-xl font-bold text-yellow-700">{totalStudents}</p>
          <p className="text-xs text-gray-500">Avg {avgClassSize}/class</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-3">
          <p className="text-xs text-gray-600">Enrollment Rate</p>
          <p className="text-xl font-bold text-indigo-700">{enrollmentRate}%</p>
          <p className="text-xs text-gray-500">Capacity utilized</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="years">📅 Academic Years</TabsTrigger>
          <TabsTrigger value="classes">🏫 Classes & Sections</TabsTrigger>
          <TabsTrigger value="courses">📚 Courses & Subjects</TabsTrigger>
        </TabsList>

        {/* Academic Years Tab */}
        <TabsContent value="years" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Manage academic years, set current active year</p>
            <Button onClick={() => setShowYearForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Year
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
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {academicYears.map((year) => (
                  <tr key={year.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {year.name}
                      {year.is_current && <Badge className="ml-2 bg-green-100 text-green-700">Current</Badge>}
                    </td>
                    <td className="px-4 py-3">{new Date(year.start_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{new Date(year.end_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={year.is_active ? 'success' : 'secondary'}>
                        {year.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {!year.is_current && year.is_active && (
                          <button onClick={() => handleSetCurrentYear(year.id)} className="p-1 hover:bg-blue-100 rounded" title="Set as Current">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        <button onClick={() => handleToggleYearStatus(year.id, year.is_active)} className="p-1 hover:bg-yellow-100 rounded" title={year.is_active ? 'Deactivate' : 'Activate'}>
                          <Settings className="w-4 h-4 text-yellow-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Manage classes and sections</p>
            <div className="flex gap-2">
              <Button onClick={() => setShowClassForm(true)} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{cls.name}</h3>
                      <p className="text-xs text-gray-500">Code: {cls.code}</p>
                    </div>
                    <Badge variant={cls.is_active ? 'success' : 'secondary'}>
                      {cls.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-gray-600">👨‍🏫 {cls.teacher_name || 'No teacher assigned'}</p>
                    <p className="text-gray-600">📚 {cls.sections_count || 0} Sections</p>
                    <p className="text-gray-600">👨‍🎓 {cls.students_count || 0} Students</p>
                    <p className="text-gray-600">🎯 Capacity: {cls.capacity}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Manage subjects/courses for the curriculum</p>
            <Button onClick={() => setShowCourseForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{course.name}</h3>
                      <p className="text-xs font-mono text-gray-500">{course.code}</p>
                    </div>
                    <Badge variant={course.is_active ? 'success' : 'secondary'}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-3 text-xs text-gray-500">
                    <span>📊 {course.credits} Credits</span>
                    <span>📚 {course.level || 'General'}</span>
                  </div>
                  {course.description && <p className="text-xs text-gray-400 mt-2">{course.description.substring(0, 100)}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Academic Year Modal */}
      {showYearForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Add Academic Year</h2><button onClick={() => setShowYearForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <Input placeholder="Year Name (e.g., 2025-2026)" value={yearForm.name} onChange={(e) => setYearForm({...yearForm, name: e.target.value})} />
              <Input type="date" placeholder="Start Date" value={yearForm.start_date} onChange={(e) => setYearForm({...yearForm, start_date: e.target.value})} />
              <Input type="date" placeholder="End Date" value={yearForm.end_date} onChange={(e) => setYearForm({...yearForm, end_date: e.target.value})} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={yearForm.is_current} onChange={(e) => setYearForm({...yearForm, is_current: e.target.checked})} /> Set as Current Year</label>
              <Button onClick={handleCreateYear} className="w-full">Create Academic Year</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showClassForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Add Class</h2><button onClick={() => setShowClassForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <Input placeholder="Class Name (e.g., Grade 5)" value={classForm.name} onChange={(e) => setClassForm({...classForm, name: e.target.value})} />
              <Input placeholder="Class Code (e.g., GRD5)" value={classForm.code} onChange={(e) => setClassForm({...classForm, code: e.target.value})} />
              <Input type="number" placeholder="Capacity" value={classForm.capacity} onChange={(e) => setClassForm({...classForm, capacity: parseInt(e.target.value)})} />
              <Input placeholder="Teacher Name" value={classForm.teacher_name} onChange={(e) => setClassForm({...classForm, teacher_name: e.target.value})} />
              <Input placeholder="Teacher Email" type="email" value={classForm.teacher_email} onChange={(e) => setClassForm({...classForm, teacher_email: e.target.value})} />
              <select className="w-full border rounded-lg px-3 py-2" value={classForm.academic_year_id} onChange={(e) => setClassForm({...classForm, academic_year_id: e.target.value})}>
                <option value="">Select Academic Year</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
              <Button onClick={handleCreateClass} className="w-full">Create Class</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Add Course</h2><button onClick={() => setShowCourseForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <Input placeholder="Course Code (e.g., MATH101)" value={courseForm.code} onChange={(e) => setCourseForm({...courseForm, code: e.target.value})} />
              <Input placeholder="Course Name" value={courseForm.name} onChange={(e) => setCourseForm({...courseForm, name: e.target.value})} />
              <Input type="number" placeholder="Credits" value={courseForm.credits} onChange={(e) => setCourseForm({...courseForm, credits: parseInt(e.target.value)})} />
              <Input placeholder="Level (e.g., Primary, Secondary)" value={courseForm.level} onChange={(e) => setCourseForm({...courseForm, level: e.target.value})} />
              <textarea placeholder="Description" className="w-full border rounded-lg px-3 py-2" rows={3} value={courseForm.description} onChange={(e) => setCourseForm({...courseForm, description: e.target.value})} />
              <Button onClick={handleCreateCourse} className="w-full">Create Course</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
