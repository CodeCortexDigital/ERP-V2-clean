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
  // Executive Analytics Dashboard
  getExecutiveDashboard: () =>
    api.get('/auth/analytics/executive-dashboard/'),
  runBatchRiskAssessment: () =>
    api.post('/auth/analytics/batch-risk-assessment/'),

};

export default analyticsService;

