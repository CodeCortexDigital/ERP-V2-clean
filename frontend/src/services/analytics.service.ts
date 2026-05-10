import api from './api';

export const analyticsService = {
  // Executive Dashboard
  getExecutiveDashboard: () => api.get('/auth/analytics/executive-dashboard/'),
  
  // Revenue Insights
  getRevenueInsights: () => api.get('/auth/analytics/executive-dashboard/'),
  
  // Attendance Insights
  getAttendanceInsights: () => api.get('/auth/analytics/executive-dashboard/'),
  
  // Fee Recovery Insights
  getFeeRecoveryInsights: () => api.get('/auth/analytics/executive-dashboard/'),
  
  // Student Growth
  getStudentGrowth: () => api.get('/auth/analytics/executive-dashboard/'),
  
  // Exam Performance
  getExamPerformance: () => api.get('/auth/analytics/executive-dashboard/'),
  
  // Teacher Performance
  getTeacherPerformance: () => api.get('/auth/analytics/executive-dashboard/'),
  
  // Smart Insights
  getSmartInsights: () => api.get('/auth/analytics/executive-dashboard/'),
};

export default analyticsService;
