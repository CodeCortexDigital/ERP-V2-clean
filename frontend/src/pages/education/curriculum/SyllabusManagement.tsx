import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Plus, Trash2, Edit3, CheckCircle2, RefreshCw, Users, Layers, GraduationCap, X, Search, ArrowLeft, Minus
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import academicService from '@/services/academic.service';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';

interface SubjectRow {
  id: string;
  name: string;
  marks: string;
}

interface AssignedClassSubject {
  id: string;
  className: string;
  subjectsCount: number;
  totalMarks: number;
  subjectsList: { name: string; marks: number }[];
}

const classSubjectsData: Record<string, { subject: string; marks: number }[]> = {
  "Grade 1-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "General Knowledge", marks: 50 },
    { subject: "Islamiyat", marks: 50 },
    { subject: "Arts", marks: 50 },
  ],
  "Grade 2-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "General Knowledge", marks: 50 },
    { subject: "Islamiyat", marks: 50 },
    { subject: "Arts", marks: 50 },
  ],
  "Grade 3-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "General Science", marks: 100 },
    { subject: "Social Studies", marks: 100 },
    { subject: "Islamiyat", marks: 50 },
    { subject: "Computer", marks: 50 },
    { subject: "Arts", marks: 50 },
  ],
  "Grade 4-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "Science", marks: 100 },
    { subject: "Social Studies", marks: 100 },
    { subject: "Islamiyat", marks: 100 },
    { subject: "Computer", marks: 100 },
  ],
  "Grade 5-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "Science", marks: 100 },
    { subject: "Social Studies", marks: 100 },
    { subject: "Islamiyat", marks: 100 },
    { subject: "Computer", marks: 100 },
  ],
  "Grade 6-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "General Science", marks: 100 },
    { subject: "Computer Science", marks: 100 },
    { subject: "Pakistan Studies", marks: 100 },
    { subject: "Islamiyat", marks: 100 },
  ],
  "Grade 7-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "General Science", marks: 100 },
    { subject: "Computer Science", marks: 100 },
    { subject: "Pakistan Studies", marks: 100 },
    { subject: "Islamiyat", marks: 100 },
  ],
  "Grade 8-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "General Science", marks: 100 },
    { subject: "Computer Science", marks: 100 },
    { subject: "Pakistan Studies", marks: 100 },
    { subject: "Islamiyat", marks: 100 },
  ],
  "Grade 9-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "Physics", marks: 100 },
    { subject: "Chemistry", marks: 100 },
    { subject: "Biology", marks: 100 },
    { subject: "Computer Science", marks: 100 },
    { subject: "Pakistan Studies", marks: 75 },
    { subject: "Islamiyat", marks: 50 },
  ],
  "Grade 10-A": [
    { subject: "English", marks: 100 },
    { subject: "Urdu", marks: 100 },
    { subject: "Mathematics", marks: 100 },
    { subject: "Physics", marks: 100 },
    { subject: "Chemistry", marks: 100 },
    { subject: "Biology", marks: 100 },
    { subject: "Computer Science", marks: 100 },
    { subject: "Pakistan Studies", marks: 75 },
    { subject: "Islamiyat", marks: 50 },
  ]
};

const getPredefinedSubjectsForClass = (className: string) => {
  if (!className) return null;
  const normalized = className.trim().toLowerCase();
  
  // Try exact match first
  for (const key of Object.keys(classSubjectsData)) {
    if (key.toLowerCase() === normalized) {
      return classSubjectsData[key];
    }
  }

  // Try matching Grade X prefix (e.g. "Grade 1-B" -> "Grade 1")
  const matchClass = normalized.match(/grade\s+(\d+)/);
  if (matchClass) {
    const gradeNum = matchClass[1];
    for (const key of Object.keys(classSubjectsData)) {
      const matchKey = key.toLowerCase().match(/grade\s+(\d+)/);
      if (matchKey && matchKey[1] === gradeNum) {
        return classSubjectsData[key];
      }
    }
  }
  return null;
};

export default function SyllabusManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const classParam = queryParams.get('class') || '';
  const isAssignAction = location.search.includes('action=assign');

  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Form State for Assign Subjects to Class
  const [selectedClass, setSelectedClass] = useState('');
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([
    { id: '1', name: '', marks: '' }
  ]);

  // Overview Classes With Subjects
  const [classSubjects, setClassSubjects] = useState<AssignedClassSubject[]>([]);

  // Automatically load existing subjects when classParam is provided
  useEffect(() => {
    if (isAssignAction && classParam && classSubjects.length > 0) {
      setSelectedClass(classParam);
    }
  }, [isAssignAction, classParam, classSubjects]);

  // Load existing subjects when class selection changes
  useEffect(() => {
    if (selectedClass) {
      const found = classSubjects.find(cs => cs.className === selectedClass);
      if (found && found.subjectsList.length > 0) {
        setSubjectRows(
          found.subjectsList.map((sub, idx) => ({
            id: String(idx + 1),
            name: sub.name,
            marks: String(sub.marks)
          }))
        );
      } else {
        const predefined = getPredefinedSubjectsForClass(selectedClass);
        if (predefined) {
          setSubjectRows(
            predefined.map((sub, idx) => ({
              id: String(idx + 1),
              name: sub.subject,
              marks: String(sub.marks)
            }))
          );
          toast.info(`Auto-loaded subjects configuration for ${selectedClass}`);
        } else {
          setSubjectRows([{ id: '1', name: '', marks: '' }]);
        }
      }
    }
  }, [selectedClass, classSubjects]);

  useEffect(() => {
    fetchCurriculumData();
  }, []);

  const fetchCurriculumData = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes] = await Promise.all([
        academicService.getClasses().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] }))
      ]);

      const rawClasses = extractListData<any>(classesRes.data || []);
      const rawTeachers = extractListData<any>(teachersRes.data || []);

      const defaultClasses = [
        { id: 'cls-1', name: 'Grade 1-A' },
        { id: 'cls-2', name: 'Grade 1-B' }
      ];
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const combinedClassesRaw = [...(rawClasses.length > 0 ? rawClasses : defaultClasses), ...customClasses];
      const deletedClassIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
      const finalClasses = combinedClassesRaw.filter(c => !deletedClassIds.includes(c.id));

      // Unique by name to avoid duplicate dropdown entries
      const uniqueClasses: any[] = [];
      const seenNames = new Set<string>();
      for (const c of finalClasses) {
        if (!c.name) continue;
        const normalized = c.name.trim().toLowerCase();
        if (!seenNames.has(normalized)) {
          seenNames.add(normalized);
          uniqueClasses.push(c);
        }
      }

      const sortedClassesList = uniqueClasses.sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      setClasses(sortedClassesList);
      setTeachers(rawTeachers);

      // Load assigned class subjects from localStorage or set defaults
      const savedClassSubjects = localStorage.getItem('assigned_class_subjects');
      const isSeededV2 = localStorage.getItem('subjects_seeded_v2');
      let loadedClassSubjects: AssignedClassSubject[] = [];

      if (savedClassSubjects && isSeededV2 === 'true') {
        loadedClassSubjects = JSON.parse(savedClassSubjects);
      } else {
        // Pre-seed subjects for ALL existing classes based on class name matching
        loadedClassSubjects = finalClasses.map((cls: any, index: number) => {
          const predefined = getPredefinedSubjectsForClass(cls.name) || [
            { subject: 'English', marks: 100 },
            { subject: 'Mathematics', marks: 100 }
          ];
          
          return {
            id: `cs-${index + 1}`,
            className: cls.name,
            subjectsCount: predefined.length,
            totalMarks: predefined.reduce((sum: number, s: any) => sum + (s.marks || 0), 0),
            subjectsList: predefined.map((s: any) => ({ name: s.subject, marks: s.marks }))
          };
        });
        localStorage.setItem('assigned_class_subjects', JSON.stringify(loadedClassSubjects));
        localStorage.setItem('subjects_seeded_v2', 'true');
      }

      // Filter classSubjects so we only show subjects for classes that currently exist and are not deleted
      const finalClassSubjects = loadedClassSubjects.filter(cs => 
        finalClasses.some(c => c.name === cs.className)
      );

      // Deduplicate by class name (case-insensitive)
      const uniqueClassSubjects = finalClassSubjects.filter((cs, idx, self) =>
        self.findIndex(s => s.className.toLowerCase().trim() === cs.className.toLowerCase().trim()) === idx
      );

      // Natural sort ascending
      const sortedClassSubjects = uniqueClassSubjects.sort((a, b) => 
        a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' })
      );

      setClassSubjects(sortedClassSubjects);
    } catch (err) {
      toast.error('Failed to load curriculum data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubjectRow = () => {
    setSubjectRows(prev => [...prev, { id: String(Date.now()), name: '', marks: '' }]);
  };

  const handleRemoveLastRow = () => {
    if (subjectRows.length <= 1) {
      toast.info('At least one subject row is required.');
      return;
    }
    setSubjectRows(prev => prev.slice(0, -1));
  };

  const handleAssignSubjectsSubmit = () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }

    const validRows = subjectRows.filter(r => r.name.trim() !== '');
    if (validRows.length === 0) {
      toast.error('Please enter at least one subject name');
      return;
    }

    // Update class subjects list in local storage & state
    const savedClassSubjects = localStorage.getItem('assigned_class_subjects');
    let loadedClassSubjects: AssignedClassSubject[] = [];
    if (savedClassSubjects) {
      try {
        loadedClassSubjects = JSON.parse(savedClassSubjects);
      } catch (e) {}
    }

    const existingIndex = loadedClassSubjects.findIndex(c => c.className === selectedClass);
    const newSubjects = validRows.map(r => ({ name: r.name, marks: Number(r.marks) || 100 }));
    let updatedSubjectsList: AssignedClassSubject[] = [];

    if (existingIndex >= 0) {
      const updated = [...loadedClassSubjects];
      const total = newSubjects.reduce((sum, s) => sum + s.marks, 0);
      updated[existingIndex] = {
        ...updated[existingIndex],
        subjectsCount: newSubjects.length,
        totalMarks: total,
        subjectsList: newSubjects
      };
      updatedSubjectsList = updated;
    } else {
      const total = newSubjects.reduce((sum, s) => sum + s.marks, 0);
      updatedSubjectsList = [
        ...loadedClassSubjects,
        { id: `cs-${Date.now()}`, className: selectedClass, subjectsCount: newSubjects.length, totalMarks: total, subjectsList: newSubjects }
      ];
    }

    localStorage.setItem('assigned_class_subjects', JSON.stringify(updatedSubjectsList));
    
    // Filter classSubjects so we only show subjects for classes that currently exist and are not deleted
    const filteredClassSubjects = updatedSubjectsList.filter(cs => 
      classes.some(c => c.name === cs.className)
    );
    setClassSubjects(filteredClassSubjects);

    toast.success('Subjects assigned to class successfully!');
    setSelectedClass('');
    setSubjectRows([{ id: '1', name: '', marks: '' }]);
    navigate('/education/curriculum');
  };

  // RENDER VIEW 1: ASSIGN SUBJECTS TO CLASS FORM
  if (isAssignAction) {
    return (
      <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <BookOpen className="w-4 h-4 text-purple-700" />
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/curriculum')}>Subjects</span>
            <span>&gt;</span>
            <span className="text-slate-500">Assign Subjects</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 mt-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-7 h-7 rounded-full bg-indigo-950 text-white flex items-center justify-center text-xs font-bold">1</div>
            <h2 className="font-bold text-slate-800 text-sm">Assign Subjects to Class</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">SELECT CLASS *</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              >
                <option value="">-- Choose a class --</option>
                {classes.map((c) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
              {subjectRows.map((row, idx) => (
                <div key={row.id} className="flex items-end gap-4 w-full">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SUBJECT NAME *</label>
                    <Input placeholder="e.g. Mathematics" value={row.name} onChange={(e) => { const u = [...subjectRows]; u[idx].name = e.target.value; setSubjectRows(u); }} className="text-xs h-11 rounded-xl border-slate-200 bg-white" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">MARKS *</label>
                    <Input placeholder="Total marks" value={row.marks} onChange={(e) => { const u = [...subjectRows]; u[idx].marks = e.target.value; setSubjectRows(u); }} className="text-xs h-11 rounded-xl border-slate-200 bg-white" />
                  </div>
                  <div className="pb-0.5">
                    <button 
                      type="button" 
                      onClick={() => {
                        if (subjectRows.length <= 1) {
                          toast.info('At least one subject is required.');
                          return;
                        }
                        setSubjectRows(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="p-3 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 transition-colors"
                      title="Remove Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleAddSubjectRow} className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold text-xs rounded-xl transition-colors"><Plus className="w-4 h-4" /> Add Subject</button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button onClick={() => navigate('/education/curriculum')} className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={handleAssignSubjectsSubmit} className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"><Plus className="w-4 h-4" /> Assign Subjects</button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER VIEW 2: CLASSES WITH SUBJECTS (Matching Uploaded Screenshot 100%)
  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <BookOpen className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/dashboard')}>Subjects</span>
          <span>&gt;</span>
          <span className="text-slate-500">Classes With Subjects</span>
        </div>
      </div>

      {/* Overview Grid matching uploaded screenshot 100% */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {classSubjects.map((cs) => (
          <div key={cs.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5 relative hover:shadow-md transition-all">
            {/* Header: Class name & Edit Icon */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800">{cs.className}</h3>
              <button 
                onClick={() => navigate(`/education/curriculum?action=assign&class=${encodeURIComponent(cs.className)}`)}
                className="w-8 h-8 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors"
                title="Edit Class Subjects"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Summary Row: SUBJECTS and TOTAL MARKS */}
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-800 leading-tight">{cs.subjectsCount}</span>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">SUBJECTS</span>
              </div>

              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-800 leading-tight">{cs.totalMarks}</span>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">TOTAL MARKS</span>
              </div>
            </div>

            {/* Circular Marks Indicators Row */}
            <div className="flex items-center gap-4 pt-2 flex-wrap">
              {cs.subjectsList.map((sub, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-600 flex flex-col items-center justify-center text-slate-800 leading-none shadow-2xs">
                    <span className="text-[11px] font-black">{sub.marks}</span>
                    <span className="text-[8px] font-bold text-slate-400">Marks</span>
                  </div>
                  <span className="text-xs font-bold text-purple-700 mt-1.5">{sub.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Rightmost Dashed Assign Subjects Card matching uploaded screenshot 100% */}
        <div 
          onClick={() => navigate('/education/curriculum?action=assign')} 
          className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-200 hover:border-purple-400 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] transition-all group shadow-2xs"
        >
          <div className="w-14 h-14 rounded-full bg-purple-600 group-hover:bg-purple-700 text-white flex items-center justify-center shadow-md mb-3 transition-colors">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Assign Subjects</h3>
          <p className="text-xs text-slate-400 mt-0.5">Add subjects to a new or existing class</p>
        </div>
      </div>
    </div>
  );
}
