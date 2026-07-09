import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  GraduationCap, Plus, Trash2, Edit3, RefreshCw, X, Check, 
  Building2, Users, Clock, BookOpen, Calendar 
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import academicService, { AcademicYear } from '@/services/academic.service';
import teacherService from '@/services/teacher.service';
import studentService from '@/services/student.service';
import { extractListData } from '@/services/api';

interface SchoolClass {
  id: string;
  name: string;
  code: string;
  description: string;
  academic_year: string;
  academic_year_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Classroom {
  id: string;
  name: string;
  code: string;
  capacity: number;
  floor: number;
  building: string;
  is_active: boolean;
}

interface Period {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_active: boolean;
}

export default function AcademicsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classes' | 'classrooms' | 'periods'>('classes');
  
  // Class state
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classForm, setClassForm] = useState({ name: '', code: '', description: '', academic_year: '' });
  const [showClassModal, setShowClassModal] = useState(false);
  
  // Classroom state
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classroomForm, setClassroomForm] = useState({ 
    name: '', code: '', capacity: 30, floor: 1, building: 'Main' 
  });
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  
  // Period state
  const [periods, setPeriods] = useState<Period[]>([]);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [periodForm, setPeriodForm] = useState({ 
    name: '', start_time: '08:00', end_time: '08:45', day_of_week: 1 
  });
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // Academic Years state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAllData();
  }, []);

  // When academicYears changes, update the classes to include academic year names
  useEffect(() => {
    if (academicYears.length > 0 && classes.length > 0) {
      setClasses(prev => 
        prev.map(cls => ({
          ...cls,
          academic_year_name: academicYears.find(y => y.id === cls.academic_year)?.name || cls.academic_year || '--'
        }))
      );
    }
  }, [academicYears]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch academic years first
      await fetchAcademicYears();
      // Then fetch classes, classrooms, periods
      await Promise.all([
        fetchClasses(),
        fetchClassrooms(),
        fetchPeriods()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load academic data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await academicService.classes.getAll();
      const data = Array.isArray(response) ? response : [];
      // Add academic_year_name to each class
      const mappedData = data.map((cls: any) => ({
        ...cls,
        academic_year_name: academicYears.find(y => y.id === cls.academic_year)?.name || cls.academic_year || '--'
      }));
      setClasses(mappedData);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching classes:', error);
      try {
        const localClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
        if (Array.isArray(localClasses) && localClasses.length > 0) {
          setClasses(localClasses);
          toast.warning('Using cached data from localStorage');
        } else {
          setClasses([]);
        }
      } catch (e) {
        setClasses([]);
      }
    }
  };

  const fetchClassrooms = async () => {
    try {
      const data = await academicService.classrooms.getAll();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      try {
        const localRooms = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
        if (Array.isArray(localRooms) && localRooms.length > 0) {
          setClassrooms(localRooms);
        } else {
          setClassrooms([]);
        }
      } catch (e) {
        setClassrooms([]);
      }
    }
  };

  const fetchPeriods = async () => {
    try {
      const data = await academicService.periods.getAll();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching periods:', error);
      try {
        const localPeriods = JSON.parse(localStorage.getItem('custom_periods') || '[]');
        if (Array.isArray(localPeriods) && localPeriods.length > 0) {
          setPeriods(localPeriods);
        } else {
          setPeriods([]);
        }
      } catch (e) {
        setPeriods([]);
      }
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const data = await academicService.academicYears.getAll();
      console.log('📚 Academic Years fetched:', data);
      const years = Array.isArray(data) ? data : data?.results || [];
      setAcademicYears(years);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching academic years:', error);
      setAcademicYears([]);
    }
  };

  // ----- CLASS CRUD -----
  const handleSaveClass = async () => {
    if (!classForm.name.trim()) {
      toast.error('Class name is required');
      return;
    }

    if (!classForm.code.trim()) {
      toast.error('Class code is required');
      return;
    }

    try {
      const payload: any = {
        name: classForm.name.trim(),
        code: classForm.code.trim().toUpperCase(),
        description: classForm.description || '',
        is_active: true
      };

      if (classForm.academic_year && classForm.academic_year !== '' && classForm.academic_year !== 'null') {
        payload.academic_year = classForm.academic_year;
      } else {
        payload.academic_year = null;
      }

      console.log('📤 Sending class payload:', payload);

      if (editingClass) {
        const updated = await academicService.classes.update(editingClass.id, payload);
        if (updated && updated.id) {
          await fetchClasses();
          toast.success('Class updated successfully');
        }
      } else {
        const created = await academicService.classes.create(payload);
        if (created && created.id) {
          await fetchClasses();
          toast.success('Class created successfully');
        }
      }
      setShowClassModal(false);
      setEditingClass(null);
      setClassForm({ name: '', code: '', description: '', academic_year: '' });
    } catch (error: any) {
      console.error('Error saving class:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        console.error('Backend error details:', errorData);
        if (typeof errorData === 'object') {
          Object.keys(errorData).forEach(field => {
            const message = Array.isArray(errorData[field]) 
              ? errorData[field].join(', ') 
              : errorData[field];
            toast.error(`${field}: ${message}`);
          });
        } else {
          toast.error(errorData.message || 'Failed to save class');
        }
      } else {
        toast.error('Failed to save class');
      }
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    
    try {
      await academicService.classes.delete(id);
      setClasses(classes.filter(c => c.id !== id));
      toast.success('Class deleted successfully');
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class');
    }
  };

  // ----- CLASSROOM CRUD -----
  const handleSaveClassroom = async () => {
    if (!classroomForm.name.trim()) {
      toast.error('Classroom name is required');
      return;
    }

    try {
      if (editingClassroom) {
        const updated = await academicService.classrooms.update(editingClassroom.id, classroomForm);
        if (updated && updated.id) {
          setClassrooms(classrooms.map(c => c.id === updated.id ? updated : c));
          toast.success('Classroom updated successfully');
        }
      } else {
        const created = await academicService.classrooms.create(classroomForm);
        if (created && created.id) {
          setClassrooms([created, ...classrooms]);
          toast.success('Classroom created successfully');
        }
      }
      setShowClassroomModal(false);
      setEditingClassroom(null);
      setClassroomForm({ name: '', code: '', capacity: 30, floor: 1, building: 'Main' });
    } catch (error) {
      console.error('Error saving classroom:', error);
      toast.error('Failed to save classroom');
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    
    try {
      await academicService.classrooms.delete(id);
      setClassrooms(classrooms.filter(c => c.id !== id));
      toast.success('Classroom deleted successfully');
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error('Failed to delete classroom');
    }
  };

  // ----- PERIOD CRUD -----
  const handleSavePeriod = async () => {
    if (!periodForm.name.trim()) {
      toast.error('Period name is required');
      return;
    }

    try {
      if (editingPeriod) {
        const updated = await academicService.periods.update(editingPeriod.id, periodForm);
        if (updated && updated.id) {
          setPeriods(periods.map(p => p.id === updated.id ? updated : p));
          toast.success('Period updated successfully');
        }
      } else {
        const created = await academicService.periods.create(periodForm);
        if (created && created.id) {
          setPeriods([created, ...periods]);
          toast.success('Period created successfully');
        }
      }
      setShowPeriodModal(false);
      setEditingPeriod(null);
      setPeriodForm({ name: '', start_time: '08:00', end_time: '08:45', day_of_week: 1 });
    } catch (error) {
      console.error('Error saving period:', error);
      toast.error('Failed to save period');
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm('Are you sure you want to delete this period?')) return;
    
    try {
      await academicService.periods.delete(id);
      setPeriods(periods.filter(p => p.id !== id));
      toast.success('Period deleted successfully');
    } catch (error) {
      console.error('Error deleting period:', error);
      toast.error('Failed to delete period');
    }
  };

  // Filter data based on search
  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();
    
    if (activeTab === 'classes') {
      const classesArray = Array.isArray(classes) ? classes : [];
      return classesArray.filter(c => 
        c && c.name && c.name.toLowerCase().includes(term) || 
        (c && c.code && c.code.toLowerCase().includes(term))
      );
    } else if (activeTab === 'classrooms') {
      const classroomsArray = Array.isArray(classrooms) ? classrooms : [];
      return classroomsArray.filter(c => 
        c && c.name && c.name.toLowerCase().includes(term) || 
        (c && c.building && c.building.toLowerCase().includes(term))
      );
    } else {
      const periodsArray = Array.isArray(periods) ? periods : [];
      return periodsArray.filter(p => 
        p && p.name && p.name.toLowerCase().includes(term)
      );
    }
  };

  const filteredData = getFilteredData();
  const safeFilteredData = Array.isArray(filteredData) ? filteredData : [];
  const totalEntries = safeFilteredData.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeFilteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;

  const classCount = Array.isArray(classes) ? classes.length : 0;
  const classroomCount = Array.isArray(classrooms) ? classrooms.length : 0;
  const periodCount = Array.isArray(periods) ? periods.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-500">Loading academic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4" />
          <span>Academics</span>
          <span>&gt;</span>
          <span className="text-slate-500">
            {activeTab === 'classes' ? 'Classes' : activeTab === 'classrooms' ? 'Classrooms' : 'Periods'}
          </span>
        </div>
        <button 
          onClick={fetchAllData} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-xs flex gap-1">
        <button
          onClick={() => { setActiveTab('classes'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'classes' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Classes ({classCount})
        </button>
        <button
          onClick={() => { setActiveTab('classrooms'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'classrooms' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" /> Classrooms ({classroomCount})
        </button>
        <button
          onClick={() => { setActiveTab('periods'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'periods' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" /> Periods ({periodCount})
        </button>
      </div>

      {/* Search and Add */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-10 rounded-lg border-slate-200"
            />
          </div>
          <button
            onClick={() => {
              if (activeTab === 'classes') {
                // Navigate to Add Class page instead of opening modal
                navigate('/education/academics/classes/add');
              } else if (activeTab === 'classrooms') {
                setEditingClassroom(null);
                setClassroomForm({ name: '', code: '', capacity: 30, floor: 1, building: 'Main' });
                setShowClassroomModal(true);
              } else {
                setEditingPeriod(null);
                setPeriodForm({ name: '', start_time: '08:00', end_time: '08:45', day_of_week: 1 });
                setShowPeriodModal(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add {activeTab === 'classes' ? 'Class' : activeTab === 'classrooms' ? 'Classroom' : 'Period'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {activeTab === 'classes' && (
                  <>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Academic Year</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </>
                )}
                {activeTab === 'classrooms' && (
                  <>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">Building</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </>
                )}
                {activeTab === 'periods' && (
                  <>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Start</th>
                    <th className="py-3 px-4">End</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody key={refreshKey}>
              {currentItems.length > 0 ? (
                currentItems.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {activeTab === 'classes' && (
                      <>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.name || '--'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{item.code || '--'}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.academic_year_name || item.academic_year || '--'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.is_active !== false 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/education/academics/classes/edit/${item.id}`)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                              title="Edit Class"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClass(item.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"
                              title="Delete Class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'classrooms' && (
                      <>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.name || '--'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{item.code || '--'}</td>
                        <td className="py-3 px-4 text-slate-600">{item.capacity || 0}</td>
                        <td className="py-3 px-4 text-slate-600">{item.building || 'Main'}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingClassroom(item);
                                setClassroomForm({
                                  name: item.name || '',
                                  code: item.code || '',
                                  capacity: item.capacity || 30,
                                  floor: item.floor || 1,
                                  building: item.building || 'Main'
                                });
                                setShowClassroomModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClassroom(item.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'periods' && (
                      <>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.name || '--'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{item.start_time || '--'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{item.end_time || '--'}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][(item.day_of_week || 1) - 1] || '--'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPeriod(item);
                                setPeriodForm({
                                  name: item.name || '',
                                  start_time: item.start_time || '08:00',
                                  end_time: item.end_time || '08:45',
                                  day_of_week: item.day_of_week || 1
                                });
                                setShowPeriodModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePeriod(item.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                    No {activeTab} found. Click "Add {activeTab === 'classes' ? 'Class' : activeTab === 'classrooms' ? 'Classroom' : 'Period'}" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalEntries > 0 && (
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 px-4 py-3 border-t border-slate-100">
            <div>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold">
                {currentPage}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Classroom */}
      {showClassroomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name *</label>
                <Input
                  value={classroomForm.name}
                  onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                  placeholder="e.g., Room 101"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Code</label>
                <Input
                  value={classroomForm.code}
                  onChange={(e) => setClassroomForm({ ...classroomForm, code: e.target.value })}
                  placeholder="e.g., R101"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Capacity</label>
                  <Input
                    type="number"
                    value={classroomForm.capacity}
                    onChange={(e) => setClassroomForm({ ...classroomForm, capacity: parseInt(e.target.value) || 0 })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Floor</label>
                  <Input
                    type="number"
                    value={classroomForm.floor}
                    onChange={(e) => setClassroomForm({ ...classroomForm, floor: parseInt(e.target.value) || 1 })}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Building</label>
                <Input
                  value={classroomForm.building}
                  onChange={(e) => setClassroomForm({ ...classroomForm, building: e.target.value })}
                  placeholder="e.g., Main, East, West"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowClassroomModal(false); setEditingClassroom(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClassroom}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                {editingClassroom ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Period */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingPeriod ? 'Edit Period' : 'Add New Period'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name *</label>
                <Input
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  placeholder="e.g., Period 1, Math Period"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={periodForm.start_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Time</label>
                  <Input
                    type="time"
                    value={periodForm.end_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Day</label>
                <select
                  value={periodForm.day_of_week}
                  onChange={(e) => setPeriodForm({ ...periodForm, day_of_week: parseInt(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={7}>Sunday</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowPeriodModal(false); setEditingPeriod(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePeriod}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                {editingPeriod ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}