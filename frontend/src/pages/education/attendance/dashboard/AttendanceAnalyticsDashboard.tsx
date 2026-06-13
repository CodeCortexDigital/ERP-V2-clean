import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter
} from 'recharts';
import { AlertCircle, TrendingDown, TrendingUp, Users, Activity } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

interface StudentAnalytics {
  student_id: string;
  student_name: string;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number;
  trend_direction: 'up' | 'down' | 'stable';
}

interface AttendancePattern {
  id: string;
  student_id: string;
  student_name: string;
  pattern_type: 'declining' | 'consecutive' | 'weekday';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence_score: number;
  affected_days: number;
}

interface AttendanceAlert {
  id: string;
  student_id: string;
  student_name: string;
  alert_type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

interface TrendData {
  period: string;
  date: string;
  present: number;
  absent: number;
  total: number;
  attendance_rate: number;
}

export default function AttendanceAnalyticsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [analyticsData, setAnalyticsData] = useState<{
    summary: any;
    students: StudentAnalytics[];
  } | null>(null);
  const [patterns, setPatterns] = useState<AttendancePattern[]>([]);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, patternsRes, alertsRes, trendsRes, atRiskRes] = await Promise.all([
        api.get('/auth/attendance/analytics/'),
        api.get('/auth/attendance/patterns/'),
        api.get('/auth/attendance/alerts/'),
        api.get('/auth/attendance/trends/'),
        api.get('/auth/attendance/at-risk/'),
      ]);

      setAnalyticsData(analyticsRes.data);
      setPatterns(patternsRes.data);
      setAlerts(alertsRes.data);
      setTrends(trendsRes.data);
      setAtRiskStudents(atRiskRes.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'destructive',
      high: 'destructive',
      medium: 'warning',
      low: 'secondary',
    } as const;
    return variants[priority as keyof typeof variants] || 'secondary';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
                <p className="text-red-800 mt-1">{error}</p>
                <Button onClick={fetchAllData} className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance Analytics</h1>
        <p className="text-gray-600 mt-1">AI-powered pattern detection and student insights</p>
      </div>

      {/* Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.total_students}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.average_attendance}%</div>
              <Badge variant="secondary" className="mt-2">
                {analyticsData.summary.average_attendance >= 75 ? '✓ Good' : '⚠ Low'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">At Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{analyticsData.summary.at_risk_count}</div>
              <div className="text-xs text-gray-600 mt-2">{analyticsData.summary.at_risk_percentage}% of total</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{alerts.length}</div>
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setActiveTab('alerts')}>
                View Alerts
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns ({patterns.length})</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* At Risk Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                At-Risk Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atRiskStudents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No students at risk</p>
              ) : (
                <div className="space-y-3">
                  {atRiskStudents.slice(0, 10).map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.class} • ID: {student.student_id}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{student.attendance_rate}%</div>
                        <Badge variant={student.risk_level === 'high' ? 'destructive' : 'warning'}>
                          {student.risk_level.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          {analyticsData && analyticsData.students.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        level: 'Low',
                        count: analyticsData.students.filter(s => s.risk_level === 'low').length,
                      },
                      {
                        level: 'Medium',
                        count: analyticsData.students.filter(s => s.risk_level === 'medium').length,
                      },
                      {
                        level: 'High',
                        count: analyticsData.students.filter(s => s.risk_level === 'high').length,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detected Attendance Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No patterns detected</p>
              ) : (
                <div className="space-y-3">
                  {patterns.map((pattern) => (
                    <div key={pattern.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{pattern.student_name}</p>
                          <p className="text-sm text-gray-600">
                            {pattern.pattern_type === 'declining' && '📉 Declining Trend'}
                            {pattern.pattern_type === 'consecutive' && '🔴 Consecutive Absences'}
                            {pattern.pattern_type === 'weekday' && '📅 Weekday Pattern'}
                          </p>
                        </div>
                        <Badge variant={pattern.severity === 'high' ? 'destructive' : 'warning'}>
                          {pattern.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{pattern.description}</p>
                      <div className="flex gap-2 text-xs text-gray-600">
                        <span>Confidence: {(pattern.confidence_score * 100).toFixed(0)}%</span>
                        <span>•</span>
                        <span>Affected: {pattern.affected_days} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends (Last 12 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No trend data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" angle={-45} textAnchor="end" height={100} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="attendance_rate"
                      stroke="#3b82f6"
                      dot={{ fill: '#3b82f6', r: 4 }}
                      name="Attendance Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No active alerts</p>
                  <p className="text-sm text-gray-500 mt-2">All students are doing well! ✓</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 border rounded-lg border-l-4" style={{ borderLeftColor: getRiskColor(alert.priority) }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{alert.title}</p>
                          <p className="text-sm text-gray-600">{alert.student_name}</p>
                        </div>
                        <Badge variant={getPriorityBadge(alert.priority)}>
                          {alert.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
