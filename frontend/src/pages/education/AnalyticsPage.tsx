import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, TrendingUp, DollarSign, Calendar, Users, Award } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import analyticsService from '@/services/analytics.service';

const COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [feeTrends, setFeeTrends] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [studentGrowth, setStudentGrowth] = useState([]);
  const [teacherPerformance, setTeacherPerformance] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attendanceRes, feeRes, riskRes, insightsRes, growthRes, teacherRes] = await Promise.all([
        analyticsService.getAttendanceTrends(),
        analyticsService.getFeeTrends(),
        analyticsService.getAtRiskStudents(),
        analyticsService.getAIInsights(),
        analyticsService.getStudentGrowth(),
        analyticsService.getTeacherPerformance()
      ]);
      setAttendanceTrends(attendanceRes.data || []);
      setFeeTrends(feeRes.data || []);
      setAtRiskStudents(riskRes.data || []);
      setAiInsights(insightsRes.data || []);
      setStudentGrowth(growthRes.data || []);
      setTeacherPerformance(teacherRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = studentGrowth[studentGrowth.length - 1]?.count || 48;
  const totalCollected = feeTrends.reduce((sum, t) => sum + (t.collected || 0), 0);
  const totalPending = feeTrends.reduce((sum, t) => sum + (t.pending || 0), 0);
  const attendanceRate = attendanceTrends[attendanceTrends.length - 1]?.percentage || 0;

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
        <h1 className="text-2xl font-bold">Analytics & Insights</h1>
        <p className="text-gray-500">Data-driven insights for better decision making</p>
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">AI-Powered Insights</h3>
          </div>
          <div className="space-y-2">
            {aiInsights.map((insight, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs text-gray-600">{insight.message}</p>
                </div>
                <Badge variant={insight.priority === 'high' ? 'destructive' : 'default'}>
                  {insight.priority}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /></div>
          <p className="text-2xl font-bold text-blue-700">{attendanceRate}%</p>
          <p className="text-xs text-gray-600">Attendance Rate</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /></div>
          <p className="text-2xl font-bold text-green-700">₹{totalCollected.toLocaleString()}</p>
          <p className="text-xs text-gray-600">Fee Collected</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <p className="text-2xl font-bold text-red-700">{atRiskStudents.length}</p>
          <p className="text-xs text-gray-600">At-Risk Students</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-yellow-600" /></div>
          <p className="text-2xl font-bold text-yellow-700">₹{totalPending.toLocaleString()}</p>
          <p className="text-xs text-gray-600">Pending Fees</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" /></div>
          <p className="text-2xl font-bold text-purple-700">{totalStudents}</p>
          <p className="text-xs text-gray-600">Total Students</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="growth">📈 Student Growth</TabsTrigger>
          <TabsTrigger value="teachers">👨‍🏫 Teacher Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Attendance Trend (Last 6 Months)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="percentage" stroke="#3b82f6" name="Attendance %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Fee Collection Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={feeTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="collected" fill="#22c55e" name="Collected" />
                    <Bar dataKey="pending" fill="#ef4444" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Student Growth Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={studentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" name="Total Students" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Teacher Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">Teacher</th>
                      <th className="p-3 text-left">Subjects</th>
                      <th className="p-3 text-left">Classes</th>
                      <th className="p-3 text-left">Avg Score</th>
                      <th className="p-3 text-left">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPerformance.map((teacher) => (
                      <tr key={teacher.id} className="border-t">
                        <td className="p-3 font-medium">{teacher.name}</td>
                        <td className="p-3">{teacher.subject_count}</td>
                        <td className="p-3">{teacher.class_count}</td>
                        <td className="p-3">
                          <Badge variant={teacher.avg_student_score >= 70 ? 'success' : teacher.avg_student_score >= 50 ? 'warning' : 'destructive'}>
                            {teacher.avg_student_score}%
                          </Badge>
                        </td>
                        <td className="p-3">{teacher.attendance_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* At-Risk Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            At-Risk Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atRiskStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No at-risk students found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Student</th>
                    <th className="p-2 text-left">Class</th>
                    <th className="p-2 text-left">Risk Level</th>
                    <th className="p-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {atRiskStudents.slice(0, 10).map((student) => (
                    <tr key={student.id} className="border-t">
                      <td className="p-2"><div><p className="font-medium">{student.name}</p><p className="text-xs text-gray-500">{student.student_id}</p></div></td>
                      <td className="p-2">{student.class}</td>
                      <td className="p-2"><Badge variant={student.risk_level === 'high' ? 'destructive' : 'default'}>{student.risk_level}</Badge></td>
                      <td className="p-2 text-xs">{student.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
