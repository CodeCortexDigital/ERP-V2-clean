import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import studentService from '@/services/student.service';
import classService from '@/services/class.service';
import api from '@/services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    attendanceRate: 0,
    feesCollected: 0,
    pendingFees: 0,
    lowAttendance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const studentsRes = await studentService.getAll();
      let students = [];
      if (Array.isArray(studentsRes.data)) {
        students = studentsRes.data;
      } else if (studentsRes.data?.results) {
        students = studentsRes.data.results;
      }
      
      setStats({
        totalStudents: students.length,
        attendanceRate: 85,
        feesCollected: 1250,
        pendingFees: 450,
        lowAttendance: 3
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Welcome to ERP System</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full"><Users className="w-5 h-5 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full"><Calendar className="w-5 h-5 text-green-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Fees Collected</p>
              <p className="text-2xl font-bold">₹{stats.feesCollected}K</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full"><DollarSign className="w-5 h-5 text-yellow-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Low Attendance</p>
              <p className="text-2xl font-bold">{stats.lowAttendance}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full"><AlertCircle className="w-5 h-5 text-red-600" /></div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => navigate('/education/students/add')} className="bg-blue-600">Add Student</Button>
            <Button onClick={() => navigate('/education/attendance')} className="bg-green-600">Mark Attendance</Button>
            <Button onClick={() => navigate('/education/exams')} className="bg-purple-600">View Exams</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
