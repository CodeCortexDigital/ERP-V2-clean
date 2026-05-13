import teacherService from '@/services/teacher.service';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherProfile();
    fetchDashboard();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const response = await teacherService.getMyProfile();
      localStorage.setItem('teacher_profile_id', response.data.id);
      console.log('Teacher profile ID stored:', response.data.id);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Teacher Portal</h1>
          <p className="text-gray-500">Welcome back, {dashboardData?.teacher_name}</p>
        </div>
        <Button 
          onClick={goToMyProfile}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          👤 My Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">My Classes</p>
            <p className="text-2xl font-bold">{dashboardData?.classes_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-2xl font-bold">{dashboardData?.total_students}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData?.classes?.map((cls) => (
              <div key={cls.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">{cls.name}</h3>
                <p className="text-sm text-gray-500">Students: {cls.student_count}</p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/education/students?class=${cls.id}`)}
                  >
                    View Students
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}