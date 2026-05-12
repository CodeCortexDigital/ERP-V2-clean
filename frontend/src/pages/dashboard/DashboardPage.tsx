import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  BookOpen,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Star,
  Award,
  Target,
  Zap,
  Heart,
  Lightbulb,
  Trophy,
  BarChart3,
  Activity
} from 'lucide-react';
import api from '@/services/api';

interface DashboardData {
  revenue_trends: {
    monthly_data: Array<{
      month: string;
      revenue: number;
      month_name: string;
    }>;
    current_month: number;
    last_month: number;
    trend_percentage: number;
    trend_direction: string;
  };
  attendance_trends: {
    this_week_rate: number;
    last_week_rate: number;
    trend_percentage: number;
    trend_direction: string;
    this_week_total: number;
    last_week_total: number;
  };
  fee_recovery_trends: {
    class_recovery: Array<{
      class_name: string;
      total_invoices: number;
      total_amount: number;
      total_paid: number;
      recovery_rate: number;
    }>;
    worst_performing_class: any;
    best_performing_class: any;
  };
  student_growth: {
    monthly_growth: Array<{
      month: string;
      student_count: number;
      month_name: string;
    }>;
    current_total: number;
    growth_rate: number;
    growth_direction: string;
  };
  exam_performance_trends: {
    subject_performance: Array<{
      exam__subject__name: string;
      avg_percentage: number;
      total_students: number;
    }>;
    class_performance: Array<{
      student__current_class__name: string;
      avg_percentage: number;
      total_students: number;
    }>;
    top_performing_subject: any;
    lowest_performing_subject: any;
  };
  teacher_metrics: {
    total_teachers: number;
    active_teacher_assignments?: number;
    average_assignments_per_teacher?: number;
    top_teachers_by_assignments?: Array<{
      teacher__full_name: string;
      classes: number;
    }>;
    note?: string;
  };
  smart_insights: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
    category: string;
  }>;
  generated_at: string;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch comprehensive dashboard data
      const response = await api.get('/auth/analytics/executive-dashboard/');
      setDashboardData(response.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Using fallback data.');

      // Fallback data
      setDashboardData({
        revenue_trends: {
          monthly_data: [],
          current_month: 0,
          last_month: 0,
          trend_percentage: 0,
          trend_direction: 'stable'
        },
        attendance_trends: {
          this_week_rate: 85,
          last_week_rate: 82,
          trend_percentage: 3,
          trend_direction: 'up',
          this_week_total: 245,
          last_week_total: 240
        },
        fee_recovery_trends: {
          class_recovery: [],
          worst_performing_class: null,
          best_performing_class: null
        },
        student_growth: {
          monthly_growth: [],
          current_total: 49,
          growth_rate: 5.2,
          growth_direction: 'up'
        },
        exam_performance_trends: {
          subject_performance: [],
          class_performance: [],
          top_performing_subject: null,
          lowest_performing_subject: null
        },
        teacher_metrics: { total_teachers: 12 },
        smart_insights: [],
        generated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getInsightBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const data = dashboardData!;

  return (
    <div className="space-y-6">
      {/* Header with Motivational Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to Code Cortex ERP</h1>
          <p className="text-blue-100 mb-4">Empowering Education Through Innovation</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/20 text-white border-white/30">
              <Star className="w-3 h-3 mr-1" />
              Excellence in Education
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30">
              <Heart className="w-3 h-3 mr-1" />
              Student-Centric Approach
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30">
              <Zap className="w-3 h-3 mr-1" />
              Data-Driven Insights
            </Badge>
          </div>
        </div>
        <div className="absolute top-4 right-4 text-right">
          <div className="text-sm opacity-80">Today's Focus</div>
          <div className="text-lg font-semibold">Building Tomorrow's Leaders</div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-3xl"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{data.student_growth.current_total}</p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(data.student_growth.growth_direction)}
                  <span className={`text-sm ml-1 ${getTrendColor(data.student_growth.growth_direction)}`}>
                    {Math.abs(data.student_growth.growth_rate)}% from last month
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-3xl"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-3xl font-bold text-gray-900">{data.attendance_trends.this_week_rate}%</p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(data.attendance_trends.trend_direction)}
                  <span className={`text-sm ml-1 ${getTrendColor(data.attendance_trends.trend_direction)}`}>
                    {Math.abs(data.attendance_trends.trend_percentage)}% from last week
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-bl-3xl"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900">₹{data.revenue_trends.current_month.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(data.revenue_trends.trend_direction)}
                  <span className={`text-sm ml-1 ${getTrendColor(data.revenue_trends.trend_direction)}`}>
                    {Math.abs(data.revenue_trends.trend_percentage)}% from last month
                  </span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-3xl"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Teachers</p>
                <p className="text-3xl font-bold text-gray-900">{data.teacher_metrics.total_teachers}</p>
                <div className="flex flex-col gap-1 mt-2 text-sm text-purple-600">
                  <span className="inline-flex items-center">
                    <Award className="w-4 h-4 mr-1" />
                    Dedicated Educators
                  </span>
                  {data.teacher_metrics.active_teacher_assignments !== undefined && (
                    <span>{data.teacher_metrics.active_teacher_assignments} active assignments</span>
                  )}
                  {data.teacher_metrics.average_assignments_per_teacher !== undefined && (
                    <span>{data.teacher_metrics.average_assignments_per_teacher} avg assignments / teacher</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivational Slogans Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-900 mb-1">Excellence</h3>
            <p className="text-sm text-blue-700">"Strive for excellence, not perfection"</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <Lightbulb className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-green-900 mb-1">Innovation</h3>
            <p className="text-sm text-green-700">"Every child is a potential genius"</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-900 mb-1">Achievement</h3>
            <p className="text-sm text-purple-700">"Success is the sum of small efforts"</p>
          </CardContent>
        </Card>
      </div>

      {/* Smart Insights and Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              Smart Insights & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.smart_insights.length > 0 ? (
              <div className="space-y-3">
                {data.smart_insights.slice(0, 5).map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <Badge className={getInsightBadgeColor(insight.priority)}>
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">All systems running smoothly!</p>
                <p className="text-sm text-gray-500">No critical alerts at this time.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Attendance Performance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium">Attendance Rate</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-bold mr-2">{data.attendance_trends.this_week_rate}%</span>
                  {getTrendIcon(data.attendance_trends.trend_direction)}
                </div>
              </div>

              {/* Fee Recovery */}
              {data.fee_recovery_trends.best_performing_class && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium">Best Fee Recovery</span>
                  </div>
                  <span className="text-sm font-bold">
                    {data.fee_recovery_trends.best_performing_class.class_name}: {data.fee_recovery_trends.best_performing_class.recovery_rate}%
                  </span>
                </div>
              )}

              {/* Exam Performance */}
              {data.exam_performance_trends.top_performing_subject && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Award className="w-4 h-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium">Top Subject</span>
                  </div>
                  <span className="text-sm font-bold">
                    {data.exam_performance_trends.top_performing_subject.exam__subject__name}: {data.exam_performance_trends.top_performing_subject.avg_percentage}%
                  </span>
                </div>
              )}

              {/* Student Growth */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium">Student Growth</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-bold mr-2">{data.student_growth.growth_rate}%</span>
                  {getTrendIcon(data.student_growth.growth_direction)}
                </div>
              </div>
              {data.teacher_metrics.top_teachers_by_assignments?.length ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2" />
                    <span className="text-sm font-medium">Top Teacher</span>
                  </div>
                  <span className="text-sm font-bold">
                    {data.teacher_metrics.top_teachers_by_assignments[0].teacher__full_name} ({data.teacher_metrics.top_teachers_by_assignments[0].classes})
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <p className="text-sm text-gray-600">Navigate to key sections of your ERP system</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/education/students" className="group p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-all duration-200 hover:shadow-md">
              <Users className="w-8 h-8 mx-auto text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-blue-900">Students</p>
              <p className="text-sm text-blue-600">Manage student records</p>
            </a>
            <a href="/education/attendance" className="group p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-all duration-200 hover:shadow-md">
              <Calendar className="w-8 h-8 mx-auto text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-green-900">Attendance</p>
              <p className="text-sm text-green-600">Track daily attendance</p>
            </a>
            <a href="/education/exams" className="group p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-all duration-200 hover:shadow-md">
              <BookOpen className="w-8 h-8 mx-auto text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-purple-900">Exams</p>
              <p className="text-sm text-purple-600">Manage examinations</p>
            </a>
            <a href="/education/finance" className="group p-4 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition-all duration-200 hover:shadow-md">
              <DollarSign className="w-8 h-8 mx-auto text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-yellow-900">Finance</p>
              <p className="text-sm text-yellow-600">Financial management</p>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Footer Ribbon */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 text-white text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Heart className="w-5 h-5" />
          <span className="font-medium">Code Cortex ERP</span>
          <Heart className="w-5 h-5" />
        </div>
        <p className="text-sm opacity-90">"Transforming Education Through Technology"</p>
      </div>
    </div>
  );
}
