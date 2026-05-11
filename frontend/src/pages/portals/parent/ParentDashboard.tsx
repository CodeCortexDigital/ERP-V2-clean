import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/auth/parent/dashboard/');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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
        <h1 className="text-2xl font-bold">Parent Portal</h1>
        <p className="text-gray-500">Welcome back, {dashboardData?.parent_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Children</p>
            <p className="text-2xl font-bold">{dashboardData?.children_count}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Children</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.students?.map((student) => (
            <div key={student.id} className="flex justify-between items-center p-3 border rounded-lg mb-2">
              <div>
                <p className="font-medium">{student.name}</p>
                <p className="text-sm text-gray-500">{student.class}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Attendance</Button>
                <Button size="sm" variant="outline">Fees</Button>
                <Button size="sm" variant="outline">Results</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
