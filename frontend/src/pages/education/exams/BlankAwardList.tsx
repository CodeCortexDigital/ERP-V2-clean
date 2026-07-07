import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Printer, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
}

interface ClassModel {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  class_id?: string;
}

export default function BlankAwardList() {
  const navigate = useNavigate();

  // Filters State
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Form selections
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const [examsRes, classesRes, subjectsRes, studentsRes] = await Promise.all([
        api.get('/auth/exams/').catch(() => ({ data: [] })),
        api.get('/auth/academics/classes/').catch(() => ({ data: [] })),
        api.get('/auth/academics/subjects/').catch(() => ({ data: [] })),
        api.get('/auth/students/').catch(() => ({ data: [] }))
      ]);

      const rawExams = Array.isArray(examsRes.data) ? examsRes.data : examsRes.data?.results || [];
      const mappedExams = rawExams.map((ex: any) => ({
        id: ex.id,
        name: ex.title || 'Exam'
      }));
      if (mappedExams.length === 0) {
        mappedExams.push({ id: 'exam-fallback-1', name: 'mids' });
      }
      setExams(mappedExams);
      setSelectedExamId(mappedExams[0].id);

      const rawClasses = Array.isArray(classesRes.data) ? classesRes.data : classesRes.data?.results || [];
      const mappedClasses = rawClasses.map((cls: any) => ({
        id: cls.id,
        name: cls.name || 'Class'
      }));
      if (mappedClasses.length === 0) {
        mappedClasses.push({ id: 'class-fallback-1', name: 'Grade 1-A' });
      }
      setClasses(mappedClasses);
      setSelectedClassId(mappedClasses[0].id);

      const rawSubjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : subjectsRes.data?.results || [];
      const mappedSubjects = rawSubjects.map((s: any) => ({
        id: s.id,
        name: s.name || 'Subject'
      }));
      if (mappedSubjects.length === 0) {
        mappedSubjects.push({ id: 'sub-fallback-1', name: 'English' });
      }
      setSubjects(mappedSubjects);
      setSelectedSubjectId(mappedSubjects[0].id);

      const parsedStudents = (Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data as any)?.results || []).map((s: any) => ({
        id: s.id,
        student_id: s.student_id || s.roll_number || '001',
        full_name: s.full_name || s.name || 'Student',
        class_name: s.class_name || 'Grade 1-A',
        class_id: s.class_ref || ''
      }));
      if (parsedStudents.length === 0) {
        parsedStudents.push({
          id: 's-fallback-1',
          student_id: '001',
          full_name: 'Sundas Azhar',
          class_name: 'Grade 8-B'
        });
      }
      setStudents(parsedStudents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const classStudentsFiltered = students.filter(s => {
    if (!selectedClassId) return true;
    const targetClass = classes.find(c => c.id === selectedClassId);
    return s.class_id === selectedClassId || s.class_name === targetClass?.name;
  });

  const selectedClassObj = classes.find(c => c.id === selectedClassId);
  const selectedExamObj = exams.find(e => e.id === selectedExamId);
  const selectedSubjectObj = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Exams</span>
          <span>Blank Award List</span>
        </div>
        {isGenerated && (
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 h-8.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-655 flex items-center gap-1.5 transition-colors text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Award List
            </button>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Filter Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-base font-black text-slate-800">Generate Blank Award List</h2>
            <p className="text-xs text-slate-400 mt-1">Select an exam, class, and subject to generate a manual marks entry award sheet</p>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Select Exam*</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                required
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Select Class*</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                required
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Select Subject*</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                required
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-[#f39c12] hover:bg-[#d6850f] text-white text-xs font-black h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Generate List
              </button>
            </div>
          </form>
        </div>

        {/* Blank Award List Output */}
        {isGenerated && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-8 space-y-6">
            {/* Report Header */}
            <div className="pb-6 border-b border-slate-100 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Blank Award List</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Manual Examination Grading sheet</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-500 pt-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400">Class:</span> <span className="text-slate-850 font-black">{selectedClassObj?.name || 'Class'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Subject:</span> <span className="text-slate-850 font-black">{selectedSubjectObj?.name || 'Subject'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Exam:</span> <span className="text-slate-850 font-black">{selectedExamObj?.name || 'mids'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Max Marks:</span> <span className="text-slate-850 font-black">100</span>
                </div>
              </div>
            </div>

            {/* List Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-655 font-bold">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">S.No</th>
                    <th className="px-4 py-3">Roll/Reg ID</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3 text-center w-48">Obtained Marks</th>
                    <th className="px-4 py-3 text-center w-48">Teacher Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {classStudentsFiltered.length > 0 ? (
                    classStudentsFiltered.map((student, index) => (
                      <tr key={student.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-4 py-4 text-center text-slate-400">{index + 1}</td>
                        <td className="px-4 py-4 text-slate-500">{student.student_id}</td>
                        <td className="px-4 py-4 font-bold text-slate-850">{student.full_name}</td>
                        <td className="px-4 py-4 text-center">
                          {/* Blank manual writing line */}
                          <span className="text-slate-300 font-normal">___________________________</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {/* Signature line */}
                          <span className="text-slate-300 font-normal">___________________________</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No students registered in this class
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Report Footer Signatures */}
            <div className="pt-12 flex justify-between text-xs font-bold text-slate-555">
              <div className="text-center w-48 border-t border-slate-300 pt-1">
                Examiner's Signature
              </div>
              <div className="text-center w-48 border-t border-slate-300 pt-1">
                Principal's Stamp & Sign
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
