import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, RefreshCw, CheckCircle2, XCircle, ToggleLeft, ToggleRight 
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import studentService, { Student } from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';

export default function ActiveInactivePage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    fetchStudentsAndClasses();
  }, []);

  const fetchStudentsAndClasses = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        studentService.getAll().catch(() => ({ data: [] })),
        academicService.getClasses().catch(() => ({ data: [] }))
      ]);

      const rawStudents = extractListData<Student>(studentsRes.data || []);
      const rawClasses = extractListData<any>(classesRes.data || []);

      // Load custom students and filter deleted ones
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const deletedStudentIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      
      const allStudents = [...rawStudents, ...customStudents].filter(s => !deletedStudentIds.includes(s.id));
      setStudents(allStudents);

      // Handle classes
      const defaultClasses = [
        { id: 'cls-1', name: 'Grade 1-A' },
        { id: 'cls-2', name: 'Grade 1-B' },
        { id: 'cls-3', name: 'Grade 2-A' }
      ];
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const combinedClasses = [...(rawClasses.length > 0 ? rawClasses : defaultClasses), ...customClasses];
      const deletedClassIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
      const finalClasses = combinedClasses.filter(c => !deletedClassIds.includes(c.id));
      const sortedClasses = finalClasses.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      const uniqueClasses = sortedClasses.filter((c, idx, self) =>
        self.findIndex(sc => sc.name.toLowerCase() === c.name.toLowerCase()) === idx
      );
      setClasses(uniqueClasses);
    } catch (err) {
      toast.error('Failed to load students list');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: boolean, name: string) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_active: newStatus } : s));
    
    try {
      await studentService.update(studentId, { is_active: newStatus });
      toast.success(`Status for "${name}" updated to ${newStatus ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      // Revert if failed
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_active: currentStatus } : s));
      toast.error('Failed to update student status');
    }
  };

  // Filter students based on search term & class selection
  const filteredStudents = students.filter((std) => {
    const matchesSearch = 
      std.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (std.student_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const stdClass = (std as any).class_name || std.current_class_name || std.current_class || '';
    const matchesClass = selectedClass === '' || stdClass.toLowerCase().trim() === selectedClass.toLowerCase().trim();

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/students')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500">Active / Inactive Status</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchStudentsAndClasses} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button 
            onClick={() => navigate('/education/students')} 
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SEARCH STUDENT</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <Input 
                placeholder="Search by student name or registration number..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="text-xs h-11 pl-9 rounded-xl border-slate-200 bg-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FILTER BY CLASS</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            >
              <option value="">-- All Classes --</option>
              {classes.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Students Status List Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading student status records...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400">No students found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredStudents.map((std) => {
            const isActive = std.is_active !== false;
            return (
              <div 
                key={std.id} 
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col items-center text-center space-y-4 relative hover:shadow-md transition-all"
              >
                {/* Circular Profile Pic */}
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-2xs">
                  <img 
                    src={std.profile_picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                    alt={std.full_name} 
                    className="w-full h-full object-cover" 
                  />
                </div>

                {/* Info */}
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{std.full_name}</h3>
                  <p className="text-[11px] font-bold text-purple-600/80 mt-0.5">{(std as any).class_name || std.current_class_name || 'No Class'}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">{std.student_id}</p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>

                {/* Toggle Action */}
                <div className="w-full pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Portal Status</span>
                  <button 
                    onClick={() => handleToggleStatus(std.id, isActive, std.full_name)}
                    className="text-slate-400 hover:text-purple-600 transition-colors focus:outline-none"
                    title={isActive ? 'Deactivate Student' : 'Activate Student'}
                  >
                    {isActive ? (
                      <ToggleRight className="w-10 h-6 text-purple-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-6 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
