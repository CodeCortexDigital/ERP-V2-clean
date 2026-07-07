import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Plus, Trash2, Edit3, X, RefreshCw, Layers, Users, BookOpen, CheckCircle2, AlertCircle, ArrowLeft, RotateCcw,
  LayoutGrid, List, ChevronDown, ChevronUp
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import academicService from '@/services/academic.service';
import sectionService from '@/services/section.service';
import studentService from '@/services/student.service';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';

interface SchoolClass {
  id: string;
  name: string;
  code: string;
  teacher_name?: string;
  tuition_fee?: number;
  students_count?: number;
  boys_count?: number;
  girls_count?: number;
  na_count?: number;
  subjects_count?: number;
  sections?: { id: string; name: string }[];
}

export default function AcademicsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isNewClassView = location.search.includes('action=new-class');
  const isEditClassView = location.search.includes('action=edit-class');
  
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('id');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [classForm, setClassForm] = useState({
    id: '',
    name: '',
    tuitionFee: '',
    teacherName: ''
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  useEffect(() => {
    fetchClassesAndSections();
  }, []);

  useEffect(() => {
    if (isEditClassView && editId && classes.length > 0) {
      const target = classes.find(c => c.id === editId || c.code === editId);
      if (target) {
        setClassForm({
          id: target.id,
          name: target.name,
          tuitionFee: target.tuition_fee !== undefined && target.tuition_fee !== null ? String(target.tuition_fee) : '',
          teacherName: target.teacher_name || ''
        });
      }
    }
  }, [isEditClassView, editId, classes]);

  const fetchClassesAndSections = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes, studentsRes] = await Promise.all([
        academicService.getClasses().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] })),
        studentService.getAll().catch(() => ({ data: [] }))
      ]);

      const rawClasses = extractListData<SchoolClass>(classesRes.data || []);
      const rawTeachers = extractListData<any>(teachersRes.data || []);
      const rawStudents = extractListData<any>(studentsRes.data || []);

      // Merge custom teachers and filter deleted ones to match Employees list
      const customTeachers = JSON.parse(localStorage.getItem('custom_teachers') || '[]');
      const mergedTeachers = [...rawTeachers];
      customTeachers.forEach((ct: any) => {
        if (!mergedTeachers.some(t => String(t.id) === String(ct.id))) {
          mergedTeachers.push(ct);
        }
      });
      const deletedTeacherIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const filteredTeachers = mergedTeachers.filter((t: any) => !deletedTeacherIds.includes(t.id));

      const defaultTeachers = [
        {
          id: 't-1',
          employee_id: '250622',
          full_name: 'Maryam Fatima',
          email: 'maryam.fatima@school.edu',
          phone: '+92 300 1234567',
          qualifications: ['Master of Education'],
          specializations: ['Teacher'],
          experience_years: 5,
          joining_date: '2026-06-29',
          is_active: true,
          profile_picture: null
        }
      ];

      setTeachers(filteredTeachers.length > 0 ? filteredTeachers : defaultTeachers);

      // Load custom students to get full list
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const deletedStudentIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      const allStudents = [...rawStudents, ...customStudents].filter(s => !deletedStudentIds.includes(s.id));

      // FIXED: No default classes with hardcoded 3500 fee
      const defaultClasses: SchoolClass[] = [];
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');

      // FIXED: Merge classes without overwriting tuition_fee
      const classMap = new Map<string, any>();
      
      [...rawClasses, ...customClasses].forEach(cls => {
        classMap.set(cls.id, {
          ...cls,
          tuition_fee: cls.tuition_fee !== undefined && cls.tuition_fee !== null ? Number(cls.tuition_fee) : 0
        });
      });

      const combinedRaw = Array.from(classMap.values());

      const mappedClasses = combinedRaw.map((cls) => {
        // Calculate counts dynamically from all students list
        const classStudents = allStudents.filter(s => {
          const sClass = s.class_name || s.current_class_name || s.current_class || '';
          return sClass.toLowerCase().trim() === cls.name.toLowerCase().trim();
        });

        const boys = classStudents.filter(s => {
          const g = (s.gender || '').toLowerCase().trim();
          return g === 'male' || g === 'boy';
        }).length;

        const girls = classStudents.filter(s => {
          const g = (s.gender || '').toLowerCase().trim();
          return g === 'female' || g === 'girl';
        }).length;

        const na = classStudents.length - boys - girls;

        return {
          ...cls,
          students_count: classStudents.length,
          boys_count: boys,
          girls_count: girls,
          na_count: na,
          tuition_fee: cls.tuition_fee !== undefined && cls.tuition_fee !== null ? Number(cls.tuition_fee) : 0
        };
      });

      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
      const finalClasses = mappedClasses.filter(c => !deletedIds.includes(c.id));
      const sortedClasses = finalClasses.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      // Remove duplicate class names (case‑insensitive)
      const uniqueByName = sortedClasses.filter((c, idx, self) =>
        self.findIndex(sc => sc.name.toLowerCase() === c.name.toLowerCase()) === idx
      );
      setClasses(uniqueByName);
    } catch (err) {
      toast.error('Failed to load academic classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClass = async () => {
    if (!classForm.name) {
      toast.error('Please enter Class Name');
      return;
    }

    if (isEditClassView) {
      try {
        await academicService.updateClass(classForm.id, {
          name: classForm.name,
          code: classForm.name.substring(0, 5).toUpperCase(),
          tuition_fee: Number(classForm.tuitionFee)
        });
      } catch (err) {
        console.log('Backend class update failed, updating locally:', err);
      }

      setClasses(prev => prev.map(c => c.id === classForm.id ? {
        ...c,
        name: classForm.name,
        tuition_fee: Number(classForm.tuitionFee),
        teacher_name: classForm.teacherName
      } : c));
      
      // Update custom_classes if present
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      let updatedCustom = customClasses.map((c: any) => c.id === classForm.id ? {
        ...c,
        name: classForm.name,
        tuition_fee: Number(classForm.tuitionFee),
        teacher_name: classForm.teacherName
      } : c);
      // If the class wasn't in custom_classes (i.e., it's a default class), add it
      if (!customClasses.some((c: any) => c.id === classForm.id)) {
        updatedCustom.push({
          id: classForm.id,
          name: classForm.name,
          tuition_fee: Number(classForm.tuitionFee),
          teacher_name: classForm.teacherName
        });
      }
      localStorage.setItem('custom_classes', JSON.stringify(updatedCustom));

      toast.success('Class information updated successfully!');
    } else {
      const newCls = {
        id: `cls-${Date.now()}`,
        name: classForm.name,
        code: classForm.name.substring(0, 5).toUpperCase(),
        teacher_name: classForm.teacherName,
        tuition_fee: Number(classForm.tuitionFee),
        students_count: 0,
        boys_count: 0,
        girls_count: 0,
        na_count: 0
      };

      try {
        await academicService.createClass(newCls);
      } catch (e) {
        console.log('Backend create class fallback');
      }

      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      customClasses.push(newCls);
      localStorage.setItem('custom_classes', JSON.stringify(customClasses));

      setClasses(prev => [...prev, newCls]);
      toast.success('Class created successfully!');
    }

    setClassForm({ id: '', name: '', tuitionFee: '', teacherName: '' });
    navigate('/education/academics');
  };

  const handleDeleteClass = async (cls: SchoolClass) => {
    if ((cls.students_count || 0) > 0) {
      toast.error(`⚠️ Cannot delete ${cls.name}: Active students are attached to this class.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${cls.name}?`)) return;

    try {
      await academicService.deleteClass(cls.id);
    } catch (err) {
      console.log('Backend delete class fallback');
    }

    // Persist deleted class ID in localStorage
    const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
    if (!deletedIds.includes(cls.id)) {
      deletedIds.push(cls.id);
      localStorage.setItem('deleted_class_ids', JSON.stringify(deletedIds));
    }

    // Remove from custom_classes if present
    const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
    const updatedCustom = customClasses.filter((c: any) => c.id !== cls.id);
    localStorage.setItem('custom_classes', JSON.stringify(updatedCustom));

    setClasses(prev => prev.filter(c => c.id !== cls.id));
    toast.success(`${cls.name} deleted permanently`);
  };

  // VIEW 1: NEW CLASS VIEW
  if (isNewClassView) {
    return (
      <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/academics')}>Classes</span>
            <span>&gt;</span>
            <span className="text-slate-500">Add New Class</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 mt-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-7 h-7 rounded-full bg-indigo-950 text-white flex items-center justify-center text-xs font-bold">1</div>
            <h2 className="font-bold text-slate-800 text-sm">New Class Details</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">CLASS NAME *</label>
              <Input placeholder="e.g. Grade 5 - A" value={classForm.name} onChange={(e) => setClassForm({...classForm, name: e.target.value})} className="text-xs h-11 rounded-xl border-slate-200" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">MONTHLY TUITION FEES *</label>
              <Input placeholder="Enter fee amount" value={classForm.tuitionFee} onChange={(e) => setClassForm({...classForm, tuitionFee: e.target.value})} className="text-xs h-11 rounded-xl border-slate-200" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">SELECT CLASS TEACHER *</label>
              <select value={classForm.teacherName} onChange={(e) => setClassForm({...classForm, teacherName: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">-- Choose a teacher --</option>
                {teachers.map((t) => <option key={t.id || t.full_name} value={t.full_name}>{t.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button onClick={() => navigate('/education/academics')} className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={handleSaveClass} className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"><Plus className="w-4 h-4" /> Create Class</button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: EDIT CLASS VIEW
  if (isEditClassView) {
    return (
      <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/academics')}>Classes</span>
            <span>&gt;</span>
            <span className="text-slate-500">Edit Class Information</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 mt-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-7 h-7 rounded-full bg-indigo-950 text-white flex items-center justify-center text-xs font-bold">1</div>
            <h2 className="font-bold text-slate-800 text-sm">Edit Class Information</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">CLASS NAME *</label>
              <Input value={classForm.name} onChange={(e) => setClassForm({...classForm, name: e.target.value})} className="text-xs h-11 rounded-xl border-slate-200" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">MONTHLY FEES *</label>
              <Input value={classForm.tuitionFee} onChange={(e) => setClassForm({...classForm, tuitionFee: e.target.value})} className="text-xs h-11 rounded-xl border-slate-200" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">SELECT CLASS TEACHER *</label>
              <select value={classForm.teacherName} onChange={(e) => setClassForm({...classForm, teacherName: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs">
                <option value="">-- Choose a teacher --</option>
                {teachers.map((t) => <option key={t.id || t.full_name} value={t.full_name}>{t.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button onClick={() => navigate('/education/academics')} className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={handleSaveClass} className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"><RotateCcw className="w-4 h-4" /> Update Class</button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 3: ALL CLASSES GRID
  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/dashboard')}>Classes</span>
          <span>&gt;</span>
          <span className="text-slate-500">All Classes</span>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-purple-650 shadow-3xs' : 'text-slate-450 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-white text-purple-650 shadow-3xs' : 'text-slate-450 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4.5 h-4.5" />
            </button>
          </div>

          <button
            onClick={() => {
              setClassForm({ id: '', name: '', tuitionFee: '', teacherName: '' });
              navigate('/education/academics?action=new-class');
            }}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 rounded-lg shadow-2xs px-3 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Class
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-3 pt-2">
          {classes.map((cls) => {
            const isExpanded = expandedClassId === cls.id;
            return (
              <div 
                key={cls.id} 
                className="bg-white rounded-xl border border-slate-100 shadow-3xs hover:border-purple-100 transition-all overflow-hidden"
              >
                {/* Compact Row Header */}
                <div 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">{cls.name}</h3>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Class Teacher: {cls.teacher_name || 'Not Assigned'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Students</span>
                      <span className="text-xs font-bold text-slate-800">{cls.students_count || 0} enrolled</span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Tuition Fees</span>
                      <span className="text-xs font-bold text-slate-800">PKR {cls.tuition_fee || 0} / month</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setClassForm({ id: cls.id, name: cls.name, tuitionFee: cls.tuition_fee !== undefined && cls.tuition_fee !== null ? String(cls.tuition_fee) : '', teacherName: cls.teacher_name || '' });
                          navigate(`/education/academics?action=edit-class&id=${cls.id}`);
                        }}
                        className="p-1.5 text-slate-455 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 rounded-lg border border-slate-100 transition-colors"
                        title="Edit Class"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(cls);
                        }}
                        className="p-1.5 text-slate-455 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-100 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="p-1 text-slate-455 hover:text-slate-700">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-50 pt-4 bg-slate-50/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Students Gender Breakdown */}
                      {(() => {
                        const total = cls.students_count || 0;
                        const boysPercent = total > 0 ? Math.round((cls.boys_count / total) * 100) : 0;
                        const girlsPercent = total > 0 ? Math.round((cls.girls_count / total) * 100) : 0;
                        const naPercent = total > 0 ? Math.round((cls.na_count / total) * 100) : 0;

                        return (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students Gender Breakdown</h4>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[8px] font-black ${boysPercent > 0 ? 'border-blue-500 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
                                  {boysPercent}%
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold">Boys</span>
                                  <span className="text-xs font-bold text-slate-800">{cls.boys_count || 0}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[8px] font-black ${girlsPercent > 0 ? 'border-rose-500 text-rose-600' : 'border-slate-100 text-slate-400'}`}>
                                  {girlsPercent}%
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold">Girls</span>
                                  <span className="text-xs font-bold text-slate-800">{cls.girls_count || 0}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[8px] font-black ${naPercent > 0 ? 'border-slate-400 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                                  {naPercent}%
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold">N/A</span>
                                  <span className="text-xs font-bold text-slate-800">{cls.na_count || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Right: Quick Action Links */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions & Navigation</h4>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate(`/education/curriculum?action=assign&class=${cls.name}`)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-black rounded-lg transition-colors border border-purple-100"
                          >
                            📚 Assign Subjects
                          </button>
                          <button
                            onClick={() => navigate(`/education/timetable/editor?class_id=${cls.name}`)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg transition-colors border border-blue-100"
                          >
                            📅 Edit Timetable
                          </button>
                          <button
                            onClick={() => navigate(`/education/timetable/view?class_id=${cls.name}`)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg transition-colors border border-emerald-100"
                          >
                            👁️ View Timetable
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Classes Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-6 relative overflow-hidden border-t-4 border-purple-600 hover:shadow-md transition-all">
            {/* Card Header */}
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-800">{cls.name}</h3>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    setClassForm({ id: cls.id, name: cls.name, tuitionFee: cls.tuition_fee !== undefined && cls.tuition_fee !== null ? String(cls.tuition_fee) : '', teacherName: cls.teacher_name || '' });
                    navigate(`/education/academics?action=edit-class&id=${cls.id}`);
                  }}
                  className="p-1.5 text-slate-400 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 rounded-lg border border-slate-200 transition-colors"
                  title="Edit Class"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDeleteClass(cls)} 
                  className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                  title="Delete Class"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card Body Top Student Count */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex flex-col items-center justify-center text-purple-600 shrink-0">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800 leading-tight">{cls.students_count || 0}</span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">STUDENTS</span>
              </div>
            </div>

            {/* Gender Circular Progress Row */}
            {(() => {
              const total = cls.students_count || 0;
              const boysPercent = total > 0 ? Math.round((cls.boys_count / total) * 100) : 0;
              const girlsPercent = total > 0 ? Math.round((cls.girls_count / total) * 100) : 0;
              const naPercent = total > 0 ? Math.round((cls.na_count / total) * 100) : 0;

              return (
                <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-slate-100/80">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-[10px] font-bold ${boysPercent > 0 ? 'border-blue-500 border-t-blue-300 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
                      {boysPercent}%
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5">Boys</span>
                    <span className="text-xs font-bold text-slate-700">{cls.boys_count || 0}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-[10px] font-bold ${girlsPercent > 0 ? 'border-rose-500 border-t-rose-300 text-rose-600' : 'border-slate-100 text-slate-400'}`}>
                      {girlsPercent}%
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5">Girls</span>
                    <span className="text-xs font-bold text-slate-700">{cls.girls_count || 0}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-[10px] font-bold ${naPercent > 0 ? 'border-slate-400 border-t-slate-300 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                      {naPercent}%
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5">N/A</span>
                    <span className="text-xs font-bold text-slate-700">{cls.na_count || 0}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}

        {/* Dashed Add New Class Card */}
        <div 
          onClick={() => {
            setClassForm({ id: '', name: '', tuitionFee: '', teacherName: '' });
            navigate('/education/academics?action=new-class');
          }} 
          className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-200 hover:border-purple-400 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] transition-all group shadow-2xs"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-600 group-hover:bg-purple-700 text-white flex items-center justify-center shadow-md mb-3 transition-colors">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Add New Class</h3>
          <p className="text-xs text-slate-400 mt-0.5">Create a new class with sections</p>
        </div>
      </div>
      )}
    </div>
  );
}