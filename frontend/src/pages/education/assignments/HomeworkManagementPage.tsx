import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, Calendar, GraduationCap, Users, 
  BookOpen, Edit3, Trash2, X, Clipboard, Paperclip, Eye, EyeOff, Home 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';
import teacherService from '@/services/teacher.service';
import { useAuth } from '@/contexts/AuthContext';

interface HomeworkEntry {
  id: string;
  homeworkDate: string;
  dueDate: string;
  className: string;
  subjectName: string;
  teacherName: string;
  title: string;
  description: string;
  attachmentName?: string;
  attachmentData?: string;
  status: 'assigned' | 'collected' | 'evaluated';
}

const parseDateSafe = (dateStr: string) => {
  if (!dateStr) return { day: '01', month: 'JAN' };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { day: '01', month: 'JAN' };
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthIndex = parseInt(parts[1]) - 1;
  const day = parts[2].padStart(2, '0');
  const month = months[monthIndex] || 'JAN';
  return { day, month };
};

const toEntry = (hw: any): HomeworkEntry => ({
  id: hw.id,
  homeworkDate: hw.homework_date,
  dueDate: hw.due_date || '',
  className: hw.class_name,
  subjectName: hw.subject_name,
  teacherName: hw.teacher_name,
  title: hw.title,
  description: hw.description || '',
  attachmentName: hw.attachment_name || undefined,
  attachmentData: hw.attachment_data || undefined,
  status: hw.status
});

const isUUID = (value?: string) => {
  if (!value) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
};

export default function HomeworkManagementPage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isStudent = role === 'student';
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser;

  // Real Database Lists
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterDate, setFilterDate] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');

  // Search Results State
  const [searchedHomeworks, setSearchedHomeworks] = useState<HomeworkEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Form Modal States
  const [showForm, setShowForm] = useState(false);
  const [editingHomework, setEditingHomework] = useState<HomeworkEntry | null>(null);

  // Form Fields State
  const [formClass, setFormClass] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('2026-07-04');
  const [formDueDate, setFormDueDate] = useState('2026-07-05');
  const [formAttachment, setFormAttachment] = useState('');
  const [formAttachmentData, setFormAttachmentData] = useState('');

  // Selected Class's Subjects mapping (for form dropdown)
  const [classSubjects, setClassSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchResources();
  }, []);

  const loadHomeworks = async (allEntries: HomeworkEntry[]) => {
    if (role === 'student') {
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const matched = customStudents.find((s: any) =>
        String(s.id) === String(user?.id) ||
        String(s.student_id) === String(user?.id) ||
        s.full_name?.toLowerCase() === user?.full_name?.toLowerCase()
      );
      const studentClass = matched?.class_name || (user as any)?.class_name || 'Grade 1-A';
      setSearchedHomeworks(allEntries.filter((h) => h.className === studentClass));
    } else {
      setSearchedHomeworks(allEntries);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes, subjectsRes] = await Promise.all([
        academicService.getClasses().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] })),
        academicService.getClassSubjects().catch(() => ({ data: [] }))
      ]);

      const classesData = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any)?.results || [];
      const teachersData = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data as any)?.results || [];
      const subjectsData = Array.isArray(subjectsRes.data) ? subjectsRes.data : (subjectsRes.data as any)?.results || [];

      const finalClasses = classesData.length > 0 ? classesData : [
        { id: 'cls-1', name: 'Grade 1-A' }, { id: 'cls-2', name: 'Grade 1-B' },
        { id: 'cls-3', name: 'Grade 2-A' }, { id: 'cls-4', name: 'Grade 2-B' },
        { id: 'cls-5', name: 'Grade 3-A' }, { id: 'cls-6', name: 'Grade 3-B' }
      ];

      const finalTeachers = teachersData.length > 0 ? teachersData : [
        { id: 't-1', full_name: 'Maryam Fatima' }, { id: 't-2', full_name: 'Zainab Ahmed' },
        { id: 't-3', full_name: 'Ali Khan' }
      ];

      setClasses(finalClasses);
      setTeachers(finalTeachers);
      setSubjectsList(subjectsData);

      // Load homework from backend
      const backendHomeworks = await academicService.homework.getAll().catch(() => [] as any[]);
      const mapped = backendHomeworks.map(toEntry);
      setHomeworkList(mapped);
      await loadHomeworks(mapped);
    } catch (err) {
      console.error('Error fetching homework resources:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update subjects list dynamically when creating form class changes
  useEffect(() => {
    if (!formClass) {
      setClassSubjects([]);
      return;
    }
    // Find class-wise predefined subjects map
    const defaultSubjectsMap: Record<string, string[]> = {
      'Grade 1-A': ['English', 'Urdu', 'Mathematics', 'General Knowledge', 'Islamiyat', 'Arts'],
      'Grade 1-B': ['English', 'Urdu', 'Mathematics', 'General Knowledge', 'Islamiyat', 'Arts'],
      'Grade 2-A': ['English', 'Urdu', 'Mathematics', 'General Knowledge', 'Islamiyat', 'Arts'],
      'Grade 2-B': ['English', 'Urdu', 'Mathematics', 'General Knowledge', 'Islamiyat', 'Arts'],
      'Grade 3-A': ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat', 'Computer', 'Arts'],
      'Grade 3-B': ['English', 'Urdu', 'Mathematics', 'General Science', 'Social Studies', 'Islamiyat', 'Computer', 'Arts']
    };

    const subs = defaultSubjectsMap[formClass] || ['English', 'Mathematics', 'Science'];
    setClassSubjects(subs);
    if (!subs.includes(formSubject)) {
      setFormSubject(subs[0] || '');
    }
  }, [formClass]);

  // Handle Search Filtering
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    const filtered = homeworkList.filter(hw => {
      // Matches date filter if empty, or if it matches the assigned date, or if it matches the due date
      const matchDate = !filterDate || hw.homeworkDate === filterDate || hw.dueDate === filterDate;
      const matchClass = role === 'student'
        ? (() => {
            const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
            const matched = customStudents.find((s: any) => 
              String(s.id) === String(user?.id) || 
              String(s.student_id) === String(user?.id) ||
              s.full_name?.toLowerCase() === user?.full_name?.toLowerCase()
            );
            return matched?.class_name || (user as any)?.class_name || 'Grade 1-A';
          })() === hw.className
        : (filterClass === 'all' || hw.className === filterClass);
      const matchTeacher = filterTeacher === 'all' || hw.teacherName === filterTeacher;
      return matchDate && matchClass && matchTeacher;
    });
    setSearchedHomeworks(filtered);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormAttachment(file.name);
      setFormAttachmentData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (hw: HomeworkEntry) => {
    setEditingHomework(hw);
    setFormClass(hw.className);
    setFormSubject(hw.subjectName);
    setFormTeacher(hw.teacherName);
    setFormTitle(hw.title);
    setFormDesc(hw.description);
    setFormDate(hw.homeworkDate);
    setFormDueDate(hw.dueDate);
    setFormAttachment(hw.attachmentName || '');
    setFormAttachmentData(hw.attachmentData || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this homework entry?')) return;
    try {
      await academicService.homework.delete(id);
      toast.success('Homework assignment deleted successfully');
    } catch (err) {
      console.error('Failed to delete homework:', err);
      toast.error('Failed to delete homework');
      return;
    }
    const updated = homeworkList.filter(h => h.id !== id);
    setHomeworkList(updated);
    // Refresh filter results
    setTimeout(() => {
      const filtered = updated.filter(hw => {
        const matchDate = !filterDate || hw.homeworkDate === filterDate;
        const matchClass = filterClass === 'all' || hw.className === filterClass;
        const matchTeacher = filterTeacher === 'all' || hw.teacherName === filterTeacher;
        return matchDate && matchClass && matchTeacher;
      });
      setSearchedHomeworks(filtered);
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClass || !formSubject || !formTeacher || !formTitle.trim()) {
      toast.error('Class, Subject, Teacher, and Title are required');
      return;
    }

    const classObj = classes.find(c => c.name === formClass);
    const teacherObj = teachers.find(t => (t.full_name || t.name) === formTeacher);

    const payload: any = {
      class_name: formClass,
      teacher_name: formTeacher,
      subject_name: formSubject,
      title: formTitle.trim(),
      description: formDesc.trim(),
      homework_date: formDate,
      due_date: formDueDate,
      attachment_name: formAttachment || '',
      attachment_data: formAttachmentData || '',
      status: editingHomework ? editingHomework.status : 'assigned'
    };

    if (isUUID(classObj?.id)) payload.class_ref = classObj!.id;
    if (isUUID(teacherObj?.id)) payload.teacher = teacherObj!.id;

    try {
      if (editingHomework) {
        await academicService.homework.update(editingHomework.id, payload);
        toast.success('Homework updated successfully');
      } else {
        await academicService.homework.create(payload);
        toast.success('New Homework assigned successfully');
      }
    } catch (err) {
      console.error('Failed to save homework:', err);
      toast.error('Failed to save homework');
      return;
    }

    setShowForm(false);
    resetForm();
    await fetchResources();
  };

  const resetForm = () => {
    setEditingHomework(null);
    setFormClass('');
    setFormSubject('');
    setFormTeacher('');
    setFormTitle('');
    setFormDesc('');
    setFormDate('2026-07-04');
    setFormDueDate('2026-07-05');
    setFormAttachment('');
    setFormAttachmentData('');
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-855 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate(isStudent ? '/student' : '/dashboard')}>Homework</span>
          <Home className="w-4 h-4 text-slate-400" />
          <span>Home - Homeworks</span>
        </div>

        {role !== 'student' && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9.5 rounded-lg shadow-2xs px-4 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Homework
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Search & Filter Card */}
        <Card className="border border-slate-150 shadow-3xs bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 items-end">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">HOMEWORK DATE</label>
                  {filterDate && (
                    <button
                      type="button"
                      onClick={() => setFilterDate('')}
                      className="text-[9px] font-black text-[#6f42c1] hover:underline cursor-pointer"
                    >
                      CLEAR (ALL)
                    </button>
                  )}
                </div>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="text-xs h-10 rounded-xl border-slate-200"
                />
              </div>

              {!isStudent && (
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">CLASS</label>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="all">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">TEACHER</label>
                <select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Teachers</option>
                  {teachers.map(t => <option key={t.id} value={t.full_name || t.name}>{t.full_name || t.name}</option>)}
                </select>
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#6f42c1] hover:bg-[#5a32a3] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Content Area - eSkooly Card List Layout */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : searchedHomeworks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-150 shadow-3xs flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-350 mb-3 shadow-2xs">
              <Clipboard className="w-8 h-8" />
            </div>
            <h3 className="text-xs font-bold text-slate-700">No homework found for the selected filters</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Try changing date, class or employee filters, or create a new assignment above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {searchedHomeworks.map((hw) => {
              const { day, month } = parseDateSafe(hw.homeworkDate);
              return (
                <Card key={hw.id} className="border border-slate-100 hover:border-purple-100 rounded-xl shadow-3xs hover:shadow-xs bg-white transition-all overflow-hidden">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Date block & Details Badges Row */}
                    <div className="flex items-center gap-6">
                      {/* Date Block */}
                      <div className="text-center shrink-0 border-r border-slate-100 pr-5 select-none min-w-[50px]">
                        <span className="text-2xl font-black text-slate-800 block leading-none">{day}</span>
                        <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase block mt-1">{month}</span>
                      </div>

                      {/* Badges, Title and Description */}
                      <div className="space-y-2">
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[8.5px] font-black uppercase tracking-wider">
                            <Users className="w-3.5 h-3.5 text-purple-500" />
                            {hw.teacherName}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8.5px] font-black uppercase tracking-wider">
                            <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                            {hw.className}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[8.5px] font-black uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5 text-teal-500" />
                            {hw.subjectName}
                          </span>
                        </div>

                        {/* Title and Description details */}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                            <Clipboard className="w-4 h-4 text-purple-650" />
                            {hw.title}
                          </h3>
                          <p className="text-[10px] text-slate-450 leading-relaxed font-semibold max-w-2xl">
                            {hw.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Submission date, File Attachment and Action Buttons */}
                    <div className="flex flex-wrap items-center gap-4 shrink-0 justify-end md:justify-start">
                      {/* Submission Due Date */}
                      <div className="text-right select-none pr-2 border-r border-slate-100 hidden sm:block">
                        <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider">Submission Due</span>
                        <span className="text-[10px] font-bold text-rose-600 font-mono">{hw.dueDate}</span>
                      </div>

                       {/* File Attachment Pill */}
                       {hw.attachmentName && (
                         <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-[9px] font-bold text-slate-600 max-w-[180px]">
                           <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                           <span className="truncate max-w-[100px]">{hw.attachmentName}</span>
                           {hw.attachmentData && (
                             <a
                               href={hw.attachmentData}
                               download={hw.attachmentName}
                               className="text-[8px] font-black uppercase text-purple-600 hover:underline shrink-0 ml-1.5"
                             >
                               Download
                             </a>
                           )}
                         </div>
                       )}

                      {/* Edit / Delete Buttons */}
                      {!isStudent && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEdit(hw)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-100"
                            title="Edit Homework"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(hw.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg transition-colors border border-rose-100"
                            title="Delete Homework"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 📝 NEW / EDIT HOMEWORK MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-800">
                {editingHomework ? 'Edit Homework Assignment' : 'Assign New Homework'}
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-655 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Select Class *</label>
                    <select
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      required
                      className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="">-- Class --</option>
                      {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Select Subject *</label>
                    <select
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      required
                      disabled={!formClass}
                      className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">-- Subject --</option>
                      {classSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Select Teacher *</label>
                  <select
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                    required
                    className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="">-- Choose Instructor --</option>
                    {teachers.map(t => <option key={t.id} value={t.full_name || t.name}>{t.full_name || t.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Homework Date *</label>
                    <Input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="text-xs h-10 rounded-xl border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Due Submission Date *</label>
                    <Input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="text-xs h-10 rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Homework Title / Topic *</label>
                  <Input
                    placeholder="e.g. Chapter 4 Multiplication Exercises"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="text-xs h-10 rounded-xl border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Instructions / Description</label>
                  <textarea
                    rows={4}
                    placeholder="Provide detailed questions, page numbers, or submission guidelines..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Upload File Attachment (Optional)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="hw-file-upload"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="hw-file-upload"
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-350 hover:border-purple-500 rounded-xl text-xs font-bold text-slate-655 cursor-pointer bg-slate-50 hover:bg-purple-50/10 transition-colors"
                    >
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      {formAttachment ? 'Change File' : 'Choose File'}
                    </label>
                    {formAttachment && (
                      <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600">
                        <span className="truncate max-w-[150px]">{formAttachment}</span>
                        <button
                          type="button"
                          onClick={() => { setFormAttachment(''); setFormAttachmentData(''); }}
                          className="text-slate-400 hover:text-rose-500 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="text-xs h-9.5 rounded-xl px-4">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9.5 rounded-xl px-6 shadow-sm">
                    {editingHomework ? 'Save Changes' : 'Assign Homework'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
