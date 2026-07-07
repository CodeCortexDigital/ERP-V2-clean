const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login/`,
  ME: `${API_BASE_URL}/api/auth/me/`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout/`,
  
  // Demo & Google
  DEMO_LOGIN: `${API_BASE_URL}/api/auth/demo/`,
  GOOGLE_LOGIN: `${API_BASE_URL}/api/auth/google/`,
  
  // Students
  STUDENTS: `${API_BASE_URL}/api/auth/students/`,
  STUDENT_360: (id: string) => `${API_BASE_URL}/api/education/students/student-360/${id}/`,
  
  // Academics
  CLASSES_WITH_SECTIONS: `${API_BASE_URL}/api/academics/classes-with-sections/`,
  SECTIONS_FOR_CLASS: (classId: string) => `${API_BASE_URL}/api/academics/sections-for-class/${classId}/`,
  
  // Attendance
  ATTENDANCE: `${API_BASE_URL}/api/auth/attendance/`,
  
  // Exams
  EXAMS: `${API_BASE_URL}/api/auth/exams/`,
  EXAM_RESULTS: `${API_BASE_URL}/api/auth/exams/results/`,
  
  // Finance
  INVOICES: `${API_BASE_URL}/api/auth/invoices/`,
  PAYMENTS: `${API_BASE_URL}/api/auth/payments/`,
  
  // Communication
  MESSAGES: `${API_BASE_URL}/api/communication/messages/`,
  TEMPLATES: `${API_BASE_URL}/api/communication/templates/`,
  
  // Admissions
  APPLICANTS: `${API_BASE_URL}/api/auth/applicants/`,
  APPLICATIONS: `${API_BASE_URL}/api/auth/applications/`,

  // Settings & Tenant
  SETTINGS: `${API_BASE_URL}/api/tenants/settings/`,
}
