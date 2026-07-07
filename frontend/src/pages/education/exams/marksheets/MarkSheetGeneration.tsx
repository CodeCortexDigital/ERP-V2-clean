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

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  class_id?: string;
}

interface ExamResult {
  id: string;
  exam: string;
  student: string;
  obtained_marks: number;
  percentage: number;
  grade: string;
  is_pass: boolean;
}

export default function MarkSheetGeneration() {
  const navigate = useNavigate();

  // Selections
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [resultsList, setResultsList] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form selections
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  // Stats
  const [classAverage, setClassAverage] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setIsLoading(true);
    try {
      const [examsRes, classesRes, studentsRes, resultsRes] = await Promise.all([
        api.get('/auth/exams/').catch(() => ({ data: [] })),
        api.get('/auth/academics/classes/').catch(() => ({ data: [] })),
        api.get('/auth/students/').catch(() => ({ data: [] })),
        api.get('/exams-results/').catch(() => ({ data: [] }))
      ]);

      // Parse Exams
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

      // Parse Classes
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

      // Parse Students
      const parsedStudents: Student[] = (Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data as any)?.results || []).map((s: any) => ({
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

      // Parse Results
      const rawResults = Array.isArray(resultsRes.data) ? resultsRes.data : (resultsRes.data as any)?.results || [];
      setResultsList(rawResults);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();

    // Fetch local results if any
    const localResults = JSON.parse(localStorage.getItem('local_results') || '[]');
    const combinedResults = [...resultsList, ...localResults];

    // Filter students belonging to this class
    const classStudents = students.filter(s => {
      if (!selectedClassId) return true;
      const targetClass = classes.find(c => c.id === selectedClassId);
      return s.class_id === selectedClassId || s.class_name === targetClass?.name;
    });

    // Compute stats
    let totalPct = 0;
    let passes = 0;
    let fails = 0;
    let count = 0;

    classStudents.forEach(s => {
      const sResults = combinedResults.filter(r => r.student === s.id && (selectedExamId === '-- LAST 2 EXAMS --' || r.exam === selectedExamId));
      if (sResults.length > 0) {
        const studentAvg = sResults.reduce((acc, cur) => acc + cur.percentage, 0) / sResults.length;
        totalPct += studentAvg;
        count++;

        const isPass = sResults.every(r => r.is_pass);
        if (isPass) passes++;
        else fails++;
      }
    });

    setClassAverage(count > 0 ? Math.round(totalPct / count) : 0);
    setPassCount(passes);
    setFailCount(fails);
    setIsGenerated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.success('Preparing Result Sheet PDF export...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const localResults = JSON.parse(localStorage.getItem('local_results') || '[]');
  const combinedResults = [...resultsList, ...localResults];

  const classStudentsFiltered = students.filter(s => {
    if (!selectedClassId) return true;
    const targetClass = classes.find(c => c.id === selectedClassId);
    return s.class_id === selectedClassId || s.class_name === targetClass?.name;
  });

  const selectedClassObj = classes.find(c => c.id === selectedClassId);
  const selectedExamObj = exams.find(e => e.id === selectedExamId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Exams</span>
          <span>Result Sheet</span>
        </div>
        {isGenerated && (
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 h-8.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Search Filter Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-base font-black text-slate-800">Generate Class Result Sheet</h2>
            <p className="text-xs text-slate-400 mt-1">Select an exam and class to view the compiled subject mark sheets</p>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Select Exam*</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 focus:outline-none"
                required
              >
                <option value="-- LAST 2 EXAMS --">-- LAST 2 EXAMS --</option>
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
              <button
                type="submit"
                className="w-full bg-[#f39c12] hover:bg-[#d6850f] text-white text-xs font-black h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Sheet
              </button>
            </div>
          </form>
        </div>

        {/* Result Sheet Table Output */}
        {isGenerated && (
          <div className="space-y-6">
            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Class Average</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{classAverage}%</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Students Passed</p>
                <p className="text-2xl font-black text-green-600 mt-1">{passCount}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Students Failed</p>
                <p className="text-2xl font-black text-red-600 mt-1">{failCount}</p>
              </div>
            </div>

            {/* Compiled Mark Sheet Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
              <div className="text-center pb-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800">
                  {selectedClassObj?.name || 'Class'} Compiled Result Sheet
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Exam Term: {selectedExamId === '-- LAST 2 EXAMS --' ? 'All Exams' : (selectedExamObj?.name || 'Selected Term')}
                </p>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-655 font-bold">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Roll/Reg ID</th>
                      <th className="px-4 py-3 text-center">GK Score</th>
                      <th className="px-4 py-3 text-center">Total Marks</th>
                      <th className="px-4 py-3 text-center">Percentage</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {classStudentsFiltered.length > 0 ? (
                      classStudentsFiltered.map((student) => {
                        const sResults = combinedResults.filter(r => r.student === student.id && (selectedExamId === '-- LAST 2 EXAMS --' || r.exam === selectedExamId));
                        const obtainedMarks = sResults.reduce((acc, cur) => acc + cur.obtained_marks, 0);
                        const totalMarks = sResults.length * 100;
                        const pct = sResults.length > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
                        const isPass = sResults.length > 0 ? sResults.every(r => r.is_pass) : false;

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/55 transition-colors">
                            <td className="px-4 py-3.5 font-bold">{student.full_name}</td>
                            <td className="px-4 py-3.5 text-slate-500">{student.student_id}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                              {sResults.length > 0 ? sResults[0].obtained_marks : '-'}
                            </td>
                            <td className="px-4 py-3.5 text-center text-slate-500">
                              {sResults.length > 0 ? `${obtainedMarks} / ${totalMarks}` : '-'}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-850">
                              {sResults.length > 0 ? `${pct}%` : '-'}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {sResults.length > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold">
                                  {pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'F'}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {sResults.length > 0 ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {isPass ? 'Pass' : 'Fail'}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No students registered in this class
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-center text-[10px] text-slate-400 font-semibold pt-4 border-t border-slate-100">
                This is a computer-generated school result transcript.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
