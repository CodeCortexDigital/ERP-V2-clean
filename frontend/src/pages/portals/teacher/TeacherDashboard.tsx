import teacherService from '@/services/teacher.service';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import QuizGeneratorModal from '@/components/exams/QuizGeneratorModal';
import api from '@/services/api';
import { Sparkles, BookOpen, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQuizModal, setShowQuizModal] = useState(false);

  useEffect(() => {
    fetchTeacherProfile();
    fetchDashboard();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const response = await teacherService.getMyProfile();
      localStorage.setItem('teacher_profile_id', response.data.id);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/auth/teacher/dashboard/');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToMyProfile = () => {
    const teacherId = localStorage.getItem('teacher_profile_id');
    if (teacherId) {
      navigate(`/education/teachers/${teacherId}`);
    } else {
      alert('Profile not found. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-700 to-indigo-800 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-2">Faculty Portal</span>
          <h1 className="text-2xl font-bold">Welcome back, {dashboardData?.teacher_name || user?.full_name || 'Teacher'}</h1>
          <p className="text-purple-100 text-sm">Manage class schedules, student performance, and create AI assessments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowQuizModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> AI Quiz Generator
          </Button>
          <Button 
            onClick={goToMyProfile}
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20 flex items-center gap-2"
          >
            <User className="w-4 h-4" /> My Profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-100">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 font-medium">Assigned Classes</p>
            <p className="text-3xl font-bold text-purple-700">{dashboardData?.classes_count || 4}</p>
          </CardContent>
        </Card>
        <Card className="border-indigo-100">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 font-medium">Enrolled Students</p>
            <p className="text-3xl font-bold text-indigo-700">{dashboardData?.total_students || 142}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 font-medium">Published Quizzes</p>
            <p className="text-3xl font-bold text-amber-600">6</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" /> My Assigned Classes & Actions
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate('/education/exams')}>
            Manage All Assessments
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(dashboardData?.classes || [
              { id: 'c1', name: 'Grade 10 - Mathematics', student_count: 38 },
              { id: 'c2', name: 'Grade 9 - Computer Science', student_count: 35 },
              { id: 'c3', name: 'Grade 8 - General Science', student_count: 34 }
            ]).map((cls: any) => (
              <div key={cls.id} className="p-5 border rounded-xl bg-slate-50/50 hover:bg-white transition shadow-sm">
                <h3 className="font-bold text-lg text-slate-800">{cls.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Total Students Enrolled: {cls.student_count}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/education/students?class=${cls.id}`)}
                  >
                    View Roster
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                    onClick={() => setShowQuizModal(true)}
                  >
                    <Sparkles className="w-3 h-3" /> Create Quiz
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <QuizGeneratorModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onSuccess={() => {
          setShowQuizModal(false);
          toast.success('AI Quiz generated and published to student portals!');
        }}
      />
    </div>
  );
}