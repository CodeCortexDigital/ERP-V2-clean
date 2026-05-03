import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Set auth header
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Fetch user info
    api.get('/auth/me/')
      .then(response => {
        setUser(response.data);
      })
      .catch(error => {
        console.error('Failed to fetch user:', error);
        localStorage.removeItem('access_token');
        navigate('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Students</h3>
          <p className="text-3xl font-bold text-blue-600">-</p>
          <p className="text-sm text-gray-500 mt-2">Total enrolled students</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Attendance</h3>
          <p className="text-3xl font-bold text-green-600">-</p>
          <p className="text-sm text-gray-500 mt-2">Today's attendance rate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Exams</h3>
          <p className="text-3xl font-bold text-purple-600">-</p>
          <p className="text-sm text-gray-500 mt-2">Upcoming exams</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Students
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Mark Attendance
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Manage Exams
          </button>
        </div>
      </div>
    </div>
  );
}
