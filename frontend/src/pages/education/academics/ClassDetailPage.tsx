import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  GraduationCap, Users, MapPin, Armchair,
  CircleCheck, Pencil, Eye, User as UserIcon, Loader2, Search
} from 'lucide-react';
import academicService from '@/services/academic.service';
import studentService from '@/services/student.service';
import { extractListData } from '@/services/api';
import ModuleTabsLayout from '@/components/layout/ModuleTabsLayout';
import { academicSetupTabs } from '@/components/layout/moduleTabs';

export default function ClassDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const origin: string =
    (location.state as any)?.from ||
    (window.location.pathname.includes('academic-setup')
      ? '/education/academic-setup/classes'
      : '/education/academics/classes');
  const goBack = () => navigate(origin);
  const [loading, setLoading] = useState(true);
  const [cls, setCls] = useState<any>(null);
  const [roomName, setRoomName] = useState('--');
  const [capacity, setCapacity] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const classData = await academicService.classes.getById(id || '');
      setCls(classData);

      const [classroomsRes, studentsRes] = await Promise.all([
        academicService.classrooms.getAll().catch(() => [] as any[]),
        studentService.getAll().catch(() => ({ data: [] }))
      ]);

      const classrooms: any[] = Array.isArray(classroomsRes)
        ? classroomsRes
        : ((classroomsRes as any)?.results || (classroomsRes as any)?.data || []);
      const roomId = classData?.classroom || classData?.room_number || classData?.room;
      const matchedRoom = classrooms.find((c: any) => c.id === roomId);
      if (matchedRoom) {
        setRoomName(matchedRoom.name || matchedRoom.code || roomId);
      }
      if (classData?.max_students != null && classData.max_students !== '') {
        const cap = Number(classData.max_students);
        setCapacity(isNaN(cap) ? null : cap);
      } else if (matchedRoom) {
        const cap = Number(matchedRoom.capacity);
        setCapacity(isNaN(cap) ? null : cap);
      } else {
        setCapacity(null);
      }

      const allStudents = extractListData<any>(studentsRes.data || []);
      const className = (classData?.name || '').toString().trim().toLowerCase();
      const classStudents = allStudents.filter((s: any) => {
        const sn = (s.class_name || s.current_class_name || s.current_class || s.class || '').toString().trim().toLowerCase();
        const sid = s.current_class || s.class_id || s.class_ref || '';
        return sn === className || sid === classData?.id;
      });
      setStudents(classStudents);
      setStudentCount(classStudents.length);
    } catch (error) {
      console.error('Error loading class detail:', error);
      toast.error('Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <p className="text-slate-500">Class not found.</p>
        <button
          onClick={goBack}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold"
        >
          Back to Classes
        </button>
      </div>
    );
  }

  const available = capacity != null ? Math.max(0, capacity - studentCount) : null;

  return (
    <ModuleTabsLayout tabs={academicSetupTabs} scopeClass="academic-setup-scope">
      <div className="flex flex-col gap-4 p-4 h-[calc(100vh-170px)] overflow-hidden bg-slate-50 text-slate-800">
        <div className="flex-shrink-0 space-y-4 top-section">
        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <GraduationCap className="w-4 h-4" />
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/academics')}>Academics</span>
            <span>&gt;</span>
            <span className="cursor-pointer hover:underline" onClick={goBack}>All Classes</span>
            <span>&gt;</span>
            <span className="text-slate-500">{cls.name}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/education/academics/classes/edit/${cls.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => navigate(`/education/students?class=${encodeURIComponent(cls.name)}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> View Students
            </button>
          </div>
        </div>

        {/* Header card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">{cls.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Code: {cls.code || '--'} • Academic Year: {cls.academic_year_name || cls.academic_year || '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{studentCount}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Students</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{capacity ?? '--'}</p>
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
                <p className="text-2xl font-black text-slate-800">{available ?? '--'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Available Seats</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">{roomName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Room</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 truncate">{cls.teacher_name || 'Not Assigned'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Teacher</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body - description / extra info */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Class Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Description</p>
              <p className="text-slate-700 mt-1">{cls.description || 'No description provided.'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
              <p className="text-slate-700 mt-1">{cls.is_active ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tuition Fee</p>
              <p className="text-slate-700 mt-1">{cls.tuition_fee != null ? cls.tuition_fee : '--'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Max Students</p>
              <p className="text-slate-700 mt-1">{cls.max_students != null ? cls.max_students : (capacity ?? '--')}</p>
            </div>
          </div>
        </div>

        {/* Students list for this class */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Students ({students.length})
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student..."
                className="w-full pl-9 text-xs h-9 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 520px)' }}>
            {students.filter((s: any) => {
              const term = studentSearch.trim().toLowerCase();
              if (!term) return true;
              const name = (s.full_name || s.name || '').toLowerCase();
              const reg = (s.student_id || s.registration_no || '').toLowerCase();
              return name.includes(term) || reg.includes(term);
            }).length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No students found for this class.</div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Registration No</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((s: any) => {
                      const term = studentSearch.trim().toLowerCase();
                      if (!term) return true;
                      const name = (s.full_name || s.name || '').toLowerCase();
                      const reg = (s.student_id || s.registration_no || '').toLowerCase();
                      return name.includes(term) || reg.includes(term);
                    })
                    .map((s: any) => (
                      <tr key={s.id || s.student_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                              {s.profile_picture && s.profile_picture.startsWith('http') ? (
                                <img src={s.profile_picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <span
                              className="font-bold text-slate-800 text-sm cursor-pointer hover:text-purple-600"
                              onClick={() => navigate(`/education/students/${s.id}`)}
                            >
                              {s.full_name || s.name || 'Student'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">{s.student_id || s.registration_no || '--'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => navigate(`/education/students/${s.id}`)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => navigate(`/education/students/${s.id}/edit`)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      </div>
    </ModuleTabsLayout>
  );
}
