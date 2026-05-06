import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, TrendingUp, Users, Award, 
  CheckCircle, XCircle, AlertCircle, Download,
  Eye, Edit2, Trash2, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import examService from '@/services/exam.service';
import studentService from '@/services/student.service';

export default function ExamResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [showMarksForm, setShowMarksForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [marks, setMarks] = useState('');

  useEffect(() => {
    if (id) {
      fetchExamData();
      fetchResults();
      fetchStudents();
      fetchSummary();
    }
  }, [id]);

  const fetchExamData = async () => {
    try {
      const res = await examService.getExam(id!);
      setExam(res.data);
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('Failed to load exam details');
    }
  };

  const fetchResults = async () => {
    try {
      const res = await examService.getResults();
      const examResults = res.data.filter((r: any) => r.exam === id);
      setResults(examResults);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await studentService.getAll();
      let studentsData = [];
      if (Array.isArray(res.data)) {
        studentsData = res.data;
      } else if (res.data?.results) {
        studentsData = res.data.results;
      }
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await examService.getExamSummary(id!);
      setSummary(res.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMarks = async () => {
    if (!selectedStudent || !marks) {
      toast.error('Please select student and enter marks');
      return;
    }

    const obtainedMarks = parseFloat(marks);
    if (obtainedMarks > exam?.total_marks) {
      toast.error(`Marks cannot exceed ${exam.total_marks}`);
      return;
    }

    try {
      await examService.createResult({
        exam: id!,
        student: selectedStudent.id,
        obtained_marks: obtainedMarks
      });
      toast.success('Marks added successfully');
      setShowMarksForm(false);
      setSelectedStudent(null);
      setMarks('');
      fetchResults();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to add marks');
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Delete this result?')) return;
    try {
      await examService.deleteResult(resultId);
      toast.success('Result deleted');
      fetchResults();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete result');
    }
  };

  const getGradeColor = (grade: string) => {
    const colors: any = {
      'A+': 'text-green-700 bg-green-100',
      'A': 'text-green-600 bg-green-50',
      'B+': 'text-blue-600 bg-blue-50',
      'B': 'text-blue-600 bg-blue-50',
      'C+': 'text-yellow-600 bg-yellow-50',
      'C': 'text-yellow-600 bg-yellow-50',
      'D': 'text-orange-600 bg-orange-50',
      'F': 'text-red-600 bg-red-100'
    };
    return colors[grade] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const studentsWithoutResults = students.filter(
    student => !results.some(r => r.student === student.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button onClick={() => navigate('/education/exams')} className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Exams
          </button>
          <h1 className="text-2xl font-bold">{exam?.title}</h1>
          <p className="text-gray-500">
            {exam?.class_name} | {exam?.subject_name} | {exam?.exam_date}
          </p>
        </div>
        <Button onClick={() => setShowMarksForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Add Marks
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-600">Total Students</span></div>
            <p className="text-xl font-bold text-blue-700">{summary.total_students}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-600">Passed</span></div>
            <p className="text-xl font-bold text-green-700">{summary.passed}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-600">Failed</span></div>
            <p className="text-xl font-bold text-red-700">{summary.failed}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-600" /><span className="text-xs text-gray-600">Pass Rate</span></div>
            <p className="text-xl font-bold text-purple-700">{summary.pass_percentage}%</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No results recorded yet. Click "Add Marks" to enter results.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Student ID</th>
                    <th className="p-3 text-left">Student Name</th>
                    <th className="p-3 text-left">Obtained Marks</th>
                    <th className="p-3 text-left">Total Marks</th>
                    <th className="p-3 text-left">Percentage</th>
                    <th className="p-3 text-left">Grade</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{result.student_id}</td>
                      <td className="p-3 font-medium">{result.student_name}</td>
                      <td className="p-3 font-semibold">{result.obtained_marks}</td>
                      <td className="p-3">{exam?.total_marks}</td>
                      <td className="p-3">{result.percentage}%</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getGradeColor(result.grade)}`}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="p-3">
                        {result.is_pass ? (
                          <Badge variant="success">✅ Pass</Badge>
                        ) : (
                          <Badge variant="danger">❌ Fail</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleDeleteResult(result.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Marks Modal */}
      {showMarksForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Student Marks</h2>
              <button onClick={() => setShowMarksForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              <select 
                className="w-full border rounded-lg px-3 py-2"
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const student = studentsWithoutResults.find(s => s.id === e.target.value);
                  setSelectedStudent(student);
                }}
              >
                <option value="">Select Student</option>
                {studentsWithoutResults.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.student_id} - {student.full_name}
                  </option>
                ))}
              </select>
              <Input 
                type="number" 
                placeholder={`Marks (Max: ${exam?.total_marks})`}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
              <div className="text-sm text-gray-500">
                Passing Marks: {exam?.passing_marks}
              </div>
              <Button onClick={handleAddMarks} className="w-full">Save Marks</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
