import api from './api';

export interface AttendanceTrend {
  month: string;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export interface FeeTrend {
  month: string;
  collected: number;
  pending: number;
  total: number;
}

export interface StudentRisk {
  id: string;
  name: string;
  student_id: string;
  class: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_type: string;
  reason: string;
  attendance_percentage: number;
  exam_percentage: number;
}

export interface AIInsight {
  type: string;
  title: string;
  message: string;
  priority: string;
  action: string;
}

const analyticsService = {
  // Attendance Trends
  getAttendanceTrends: (year?: number) => 
    api.get<AttendanceTrend[]>('/auth/analytics/attendance-trends/', { params: { year } }),

  // Fee Collection Trends
  getFeeTrends: (year?: number) => 
    api.get<FeeTrend[]>('/auth/analytics/fee-trends/', { params: { year } }),

  // At-Risk Students
  getAtRiskStudents: (riskType?: string) => 
    api.get<StudentRisk[]>('/auth/analytics/at-risk-students/', { params: { risk_type: riskType } }),

  // AI Insights
  getStudentGrowth: () => api.get('/auth/analytics/student-growth/'),
  getTeacherPerformance: () => api.get('/auth/analytics/teacher-performance/'),
  getAIInsights: () => 
    api.get<AIInsight[]>('/auth/analytics/ai-insights/'),

  // Dashboard Summary
  getDashboardSummary: () => 
    api.get('/auth/analytics/dashboard-summary/'),
};

export default analyticsService;

