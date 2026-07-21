import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  GraduationCap, Users, User, RefreshCw, Plus, Search, MapPin, Armchair, CircleCheck,
  Grid3X3, List, Edit2, Trash2, User as UserIcon
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';

interface ClassStats {
  id: string;
  name: string;
  code: string;
  room_number: string;
  teacher_name: string;
  max_limit: number;
  totalStudents: number;
  available_seats: number;
  boys: number;
  girls: number;
  boysPercentage: number;
  girlsPercentage: number;
  students: any[];
  academic_year?: string;
}

type ViewMode = 'grid' | 'list';

export default function AllClassesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditClass, setSelectedEditClass] = useState('');

  useEffect(() => {
    fetchData();
  }, [location.pathname]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all students with their class data
      const studentsRes = await studentService.getAll().catch(() => ({ data: [] }));
      const allStudents = extractListData<any>(studentsRes.data || []);
      console.log('📚 All Students:', allStudents);
      
      // Fetch all classes
      const response = await academicService.classes.getAll();
      console.log('📚 Full API Response:', response);

      // Fetch classrooms to resolve room IDs to readable names
      const classroomsRes = await academicService.classrooms.getAll().catch(() => []);
      const classrooms = Array.isArray(classroomsRes) ? classroomsRes : ((classroomsRes as any)?.results || (classroomsRes as any)?.data || []);
      const classroomMap = new Map<string, string>();
      const classroomCapacityMap = new Map<string, number>();
      classrooms.forEach((c: any) => {
        classroomMap.set(c.id, c.name || c.code || c.id);
        const cap = Number(c.capacity);
        if (c.id) classroomCapacityMap.set(c.id, isNaN(cap) ? 0 : cap);
      });
      
      // Get the results array directly
      let rawClasses = [];
      const resp = response as any;
      if (resp && typeof resp === 'object') {
        if (resp.results && Array.isArray(resp.results)) {
          rawClasses = resp.results;
        } else if (Array.isArray(resp)) {
          rawClasses = resp;
        } else if (resp.data && Array.isArray(resp.data)) {
          rawClasses = resp.data;
        } else if (resp.data && resp.data.results && Array.isArray(resp.data.results)) {
          rawClasses = resp.data.results;
        } else {
          for (const key of ['items', 'list', 'classes']) {
            if (resp[key] && Array.isArray(resp[key])) {
              rawClasses = resp[key];
              break;
            }
          }
        }
      }
      
      console.log('📚 Raw Classes (extracted):', rawClasses);
      console.log('📚 Number of classes found:', rawClasses.length);

      // Build a map of class IDs to class names for quick lookup
      const classMap = new Map();
      rawClasses.forEach((cls: any) => {
        classMap.set(cls.id, cls.name);
      });
      console.log('📚 Class Map:', classMap);

      // Map classes with student counts
      const mappedClasses = rawClasses.map((cls: any) => {
        const classId = cls.id;
        const className = cls.name || 'Unnamed Class';
        
        // Match students by class ID, not name
        const classStudents = allStudents.filter((s: any) => {
          const studentClassId = s.current_class || s.class_id || s.class_ref || '';
          const studentClassName = s.class_name || s.current_class_name || '';
          
          const matchesById = studentClassId === classId;
          const matchesByName = studentClassName === className;
          
          return matchesById || matchesByName;
        });

        const total = classStudents.length;
        const boys = classStudents.filter((s: any) => {
          const gender = (s.gender || '').toLowerCase();
          return gender === 'male' || gender === 'm' || gender === 'boy';
        }).length;
        const girls = classStudents.filter((s: any) => {
          const gender = (s.gender || '').toLowerCase();
          return gender === 'female' || gender === 'f' || gender === 'girl';
        }).length;

        const boysPct = total > 0 ? Math.round((boys / total) * 100) : 0;
        const girlsPct = total > 0 ? Math.round((girls / total) * 100) : 0;

        return {
          id: classId || `class-${Date.now()}-${Math.random()}`,
          name: className,
          code: cls.code || '',
          room_number: classroomMap.get(cls.room_number || cls.classroom || cls.room) ||
            cls.room_number || cls.classroom || cls.room || '--',
          teacher_name: cls.teacher_name || 'Not Assigned',
          max_limit: Number(cls.max_students || cls.capacity || classroomCapacityMap.get(cls.room_number || cls.classroom || cls.room) || 0),
          totalStudents: total,
          boys,
          girls,
          boysPercentage: boysPct,
          girlsPercentage: girlsPct,
          available_seats: Math.max(0, (Number(cls.max_students || cls.capacity || classroomCapacityMap.get(cls.room_number || cls.classroom || cls.room) || 0)) - total),
          students: classStudents,
          academic_year: cls.academic_year || cls.academic_year_name || '--'
        };
      });

      // Sort by name
      const sortedClasses = mappedClasses.sort((a, b) => a.name.localeCompare(b.name));

      console.log('📊 Final Classes to display:', sortedClasses);
      console.log('📊 Total classes to display:', sortedClasses.length);
      
      setClasses(sortedClasses);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load class statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    
    try {
      await academicService.classes.delete(id);
      toast.success(`Class "${name}" deleted successfully`);
      fetchData();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class');
    }
  };

  const filteredClasses = classes.filter(cls => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return cls.name.toLowerCase().includes(term) ||
           (cls.code && cls.code.toLowerCase().includes(term)) ||
           (cls.teacher_name && cls.teacher_name.toLowerCase().includes(term));
  });

  const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0);
  const totalBoys = classes.reduce((sum, cls) => sum + cls.boys, 0);
  const totalGirls = classes.reduce((sum, cls) => sum + cls.girls, 0);
  const totalSeats = classes.reduce((sum, cls) => sum + (cls.max_limit || 0), 0);
  const totalAvailableSeats = classes.reduce((sum, cls) => sum + (cls.available_seats || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-500">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-screen overflow-hidden bg-slate-50 text-slate-800">
      <div className="flex-shrink-0 space-y-4 top-section">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/academics')}>Academics</span>
          <span>&gt;</span>
          <span className="text-slate-500">All Classes</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={() => navigate('/education/academic-setup/classes/add')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Class
          </button>
          <button
            onClick={() => { setSelectedEditClass(''); setEditModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{classes.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Classes</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{totalStudents}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{totalBoys}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Boys</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-pink-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{totalGirls}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Girls</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{totalSeats}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Seats</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
              <CircleCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{totalAvailableSeats}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Available Seats</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, code or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-10 rounded-lg border-slate-200"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Class Display */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      {filteredClasses.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClasses.map((cls) => (
              <div 
                key={cls.id} 
                      onClick={() => navigate(`/education/academics/classes/view/${cls.id}`, { state: { from: location.pathname } })}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-800 truncate">{cls.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-0.5">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {cls.totalStudents} Students
                        </p>
                        {cls.code && (
                          <p className="text-[10px] text-slate-400">Code: {cls.code}</p>
                        )}
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Room: {cls.room_number}
                        </p>
                      </div>
                      {/* ✅ Teacher Name in Grid View */}
                      <div className="flex items-center gap-1 mt-1">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-600 truncate">
                          Teacher: <span className="font-medium">{cls.teacher_name || 'Not Assigned'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Boys */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Boys</p>
                        <p className="text-xs text-slate-500">{cls.boys} Students</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-600">{cls.boysPercentage}%</p>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${cls.boysPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Girls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Girls</p>
                        <p className="text-xs text-slate-500">{cls.girls} Students</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-pink-600">{cls.girlsPercentage}%</p>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${cls.girlsPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Total: {cls.totalStudents} Students</span>
                    <span className={cls.available_seats > 0 ? 'text-teal-600 font-semibold' : 'text-rose-500 font-semibold'}>
                      {cls.available_seats} seats free / {cls.max_limit || '--'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/education/academics/classes/view/${cls.id}`, { state: { from: location.pathname } }); }}
                      className="text-purple-600 hover:text-purple-700 font-semibold text-xs"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Room</th>
                    {/* ✅ Added Teacher Column */}
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4 text-center">Total</th>
                    <th className="py-3 px-4 text-center">Boys</th>
                    <th className="py-3 px-4 text-center">Girls</th>
                    <th className="py-3 px-4 text-center">Max Limit</th>
                    <th className="py-3 px-4 text-center">Available</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((cls) => (
                    <tr
                      key={cls.id}
                onClick={() => navigate(`/education/academics/classes/view/${cls.id}`, { state: { from: location.pathname } })}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-slate-800">{cls.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{cls.code || '--'}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{cls.room_number}</td>
                      {/* ✅ Teacher Name in List View */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          <span>{cls.teacher_name || 'Not Assigned'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{cls.totalStudents}</td>
                      <td className="py-3 px-4 text-center text-blue-600 font-semibold">
                        {cls.boys} ({cls.boysPercentage}%)
                      </td>
                      <td className="py-3 px-4 text-center text-pink-600 font-semibold">
                        {cls.girls} ({cls.girlsPercentage}%)
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {cls.max_limit || '--'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${cls.available_seats > 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-600'}`}>
                          {cls.available_seats}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id, cls.name); }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-bold text-slate-700">No Classes Found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {searchTerm ? 'No classes match your search.' : 'Click "Add Class" to create your first class.'}
          </p>
        </div>
      )}
      </div>

      {/* Edit Class Selector Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Edit Class</h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Close">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-3">Select a class to edit:</p>
            <select
              value={selectedEditClass}
              onChange={(e) => setSelectedEditClass(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={!selectedEditClass}
                onClick={() => {
                  setEditModalOpen(false);
                  navigate(`/education/academic-setup/classes/edit/${selectedEditClass}`);
                }}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
              >
                Edit Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}