// All endpoints are RELATIVE to the `api` instance baseURL (VITE_API_URL, e.g. http://host/api/v1).
// Do NOT prepend the host or `/api` here — that produces doubled paths like /api/v1//api/auth/students/.

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login/',
  ME: '/auth/me/',
  LOGOUT: '/auth/logout/',

  // Demo & Google
  DEMO_LOGIN: '/auth/demo/',
  GOOGLE_LOGIN: '/auth/google/',

  // Students
  STUDENTS: '/auth/students/',
  STUDENT_360: (id: string) => `/education/students/student-360/${id}/`,

  // Academics
  CLASSES_WITH_SECTIONS: '/academics/classes-with-sections/',
  SECTIONS_FOR_CLASS: (classId: string) => `/academics/sections-for-class/${classId}/`,

  // Attendance
  ATTENDANCE: '/auth/attendance/',

  // Exams
  EXAMS: '/auth/exams/',
  EXAM_RESULTS: '/auth/exams/results/',

  // Finance
  INVOICES: '/auth/invoices/',
  PAYMENTS: '/auth/payments/',

  // Communication
  MESSAGES: '/communication/messages/',
  TEMPLATES: '/communication/templates/',

  // Admissions
  APPLICANTS: '/auth/applicants/',
  APPLICATIONS: '/auth/applications/',

  // Settings & Tenant
  SETTINGS: '/tenants/settings/',

  // AI Assistant
  AI_CHAT: '/ai/chat/',
}
