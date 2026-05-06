import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Eye, Calendar, BookOpen, 
  Users, TrendingUp, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, Search, Filter, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from 'sonner';
import examService, { Exam, ExamResult } from '@/services/exam.service';
import classService from '@/services/class.service';
import academicService from '@/services/academic.service';

export default function ExamsListPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams');
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    exam_type: 'midterm',
    class_ref: '',
    subject: '',
    total_marks: 100,
    passing_marks: 40,
    exam_date: '',
    term: 'first',
    description: ''
  });
  
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllData();
    fetchClassesAndSubjects();
  }, []);

    const fetchAllData = async () => {
    setLoading(true);
    try {
      const [examsRes, resultsRes] = await Promise.all([
        examService.getExams(),
        examService.getResults().catch(() => ({ data: [] }))
      ]);
      setExams(examsRes.data || []);
      setResults(resultsRes.data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesAndSubjects = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        classService.getAll(),
        academicService.getSubjects()
      ]);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error('Error fetching classes/subjects:', error);
    }
  };

  const handleCreateExam = async () => {
    if (!formData.title || !formData.class_ref || !formData.subject || !formData.exam_date) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingExam) {
        await examService.updateExam(editingExam.id, formData);
        toast.success('Exam updated');
      } else {
        await examService.createExam(formData);
        toast.success('Exam created');
      }
      setShowForm(false);
      setEditingExam(null);
      setFormData({
        title: '', exam_type: 'midterm', class_ref: '', subject: '',
        total_marks: 100, passing_marks: 40, exam_date: '', term: 'first', description: ''
      });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save exam');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Delete this exam? This will also delete all results.')) return;
    try {
      await examService.deleteExam(id);
      toast.success('Exam deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete exam');
    }
  };

  const getExamTypeBadge = (type: string) => {
    const types = {
      midterm: <Badge variant="info">📝 Mid Term</Badge>,
      final: <Badge variant="danger">🎓 Final Term</Badge>,
      quiz: <Badge variant="warning">📋 Quiz</Badge>,
      test: <Badge variant="secondary">📊 Test</Badge>,
      assignment: <Badge variant="outline">📚 Assignment</Badge>
    };
    return types[type] || <Badge>{type}</Badge>;
  };

  const filteredExams = exams.filter(exam =>
    exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.exam_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Examination Management</h1>
          <p className="text-gray-500">Manage exams, schedules, and results</p>
        </div>
        <Button onClick={() => { setEditingExam(null); setShowForm(true); }} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" /> Create Exam
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search exams by title or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>📋 All Examinations</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No exams created yet. Click "Create Exam" to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Exam Code</th>
                    <th className="p-3 text-left">Title</th>
                    <th className="p-3 text-left">Class</th>
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Marks</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam) => (
                    <tr key={exam.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs font-medium">{exam.exam_code}</td>
                      <td className="p-3 font-medium">{exam.title}</td>
                      <td className="p-3">{exam.class_name || exam.class_ref}</td>
                      <td className="p-3">{exam.subject_name || exam.subject}</td>
                      <td className="p-3">{exam.exam_date}</td>
                      <td className="p-3">{getExamTypeBadge(exam.exam_type)}</td>
                      <td className="p-3">{exam.total_marks} / {exam.passing_marks}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => navigate(`/education/exams/${exam.id}/results`)} className="p-1.5 rounded-lg hover:bg-blue-100" title="View Results">
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 rounded-lg hover:bg-red-100" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Exam Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingExam ? 'Edit Exam' : 'Create New Exam'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <Input placeholder="Exam Title *" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              <select className="w-full border rounded-lg px-3 py-2" value={formData.exam_type} onChange={(e) => setFormData({...formData, exam_type: e.target.value})}>
                <option value="midterm">Mid Term Examination</option>
                <option value="final">Final Term Examination</option>
                <option value="quiz">Quiz</option>
                <option value="test">Unit Test</option>
                <option value="assignment">Assignment</option>
              </select>
              <select className="w-full border rounded-lg px-3 py-2" value={formData.class_ref} onChange={(e) => setFormData({...formData, class_ref: e.target.value})}>
                <option value="">Select Class *</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="w-full border rounded-lg px-3 py-2" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})}>
                <option value="">Select Subject *</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
              <Input type="number" placeholder="Total Marks *" value={formData.total_marks} onChange={(e) => setFormData({...formData, total_marks: parseInt(e.target.value)})} />
              <Input type="number" placeholder="Passing Marks *" value={formData.passing_marks} onChange={(e) => setFormData({...formData, passing_marks: parseInt(e.target.value)})} />
              <Input type="date" placeholder="Exam Date *" value={formData.exam_date} onChange={(e) => setFormData({...formData, exam_date: e.target.value})} />
              <select className="w-full border rounded-lg px-3 py-2" value={formData.term} onChange={(e) => setFormData({...formData, term: e.target.value})}>
                <option value="first">First Term</option>
                <option value="second">Second Term</option>
              </select>
              <textarea placeholder="Description (optional)" className="w-full border rounded-lg px-3 py-2" rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              <Button onClick={handleCreateExam} className="w-full">{editingExam ? 'Update Exam' : 'Create Exam'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


