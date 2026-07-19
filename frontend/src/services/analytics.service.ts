import api from './api';

export interface RevenueTrend {
  month: string;
  revenue: number;
  collected: number;
  pending: number;
}

export interface AttendanceTrend {
  month: string;
  present: number;
  total: number;
  percentage: number;
  present_count?: number;
}

export interface FeeRecoveryTrend {
  class_name: string;
  total_amount: number;
  total_paid: number;
  recovery_rate: number;
  total_invoices: number;
}

export interface StudentGrowthItem {
  month: string;
  count: number;
  growth?: number;
}

export interface SubjectPerformance {
  exam__subject__name?: string;
  avg_percentage?: number;
  name?: string;
  average_score?: number;
}

export interface TeacherMetric {
  total_teachers: number;
  average_assignments_per_teacher: number;
  top_teachers_by_assignments?: { teacher__full_name: string; classes: number }[];
}

export interface SmartInsight {
  type: string;
  title: string;
  description?: string;
  message?: string;
  priority: string;
  category?: string;
  action?: string;
  icon?: string;
}

export interface ExecutiveDashboardResponse {
  revenue_trends: {
    monthly_data: RevenueTrend[];
    current_month?: number;
    last_month?: number;
    trend_percentage?: number;
    trend_direction?: string;
  };
  attendance_trends: {
    monthly_data: AttendanceTrend[];
    this_week_rate?: number;
    last_week_rate?: number;
    this_week_total?: number;
    last_week_total?: number;
    weekly_change?: number;
  };
  fee_recovery_trends: {
    class_recovery: FeeRecoveryTrend[];
    best_performing_class?: FeeRecoveryTrend | null;
    worst_performing_class?: FeeRecoveryTrend | null;
    total_collected?: number;
    total_pending?: number;
  };
  student_growth: {
    monthly_growth: StudentGrowthItem[];
    current_total?: number;
    growth_rate?: number;
    growth_direction?: string;
  };
  exam_performance_trends: {
    subject_performance: SubjectPerformance[];
    class_performance?: any[];
    top_performing_subject?: SubjectPerformance | null;
    lowest_performing_subject?: SubjectPerformance | null;
  };
  teacher_metrics: TeacherMetric;
  smart_insights: SmartInsight[];
  generated_at?: string;
}

const analyticsService = {
  getExecutiveDashboard: (): Promise<{ data: ExecutiveDashboardResponse }> =>
    api.get('/auth/analytics/executive-dashboard/'),

  runBatchRiskAssessment: () =>
    api.post('/auth/analytics/batch-risk-assessment/'),
};

export default analyticsService;
