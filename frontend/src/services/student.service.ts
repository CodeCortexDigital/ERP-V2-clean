import api from './api';

export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  admission_date?: string;
  gender?: string;
  guardian_name?: string;
  emergency_contact?: string;
  father_name?: string;
  mother_name?: string;
  guardian_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  current_class?: string;
  current_section?: string;
  current_class_name?: string;
  current_section_name?: string;
  class_code?: string;
  is_active: boolean;
  last_activity?: string;
  profile_picture?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Student360Data {
  student: Student;
  attendance: {
    total_days: number;
    present: number;
    absent: number;
    late: number;
    attendance_rate: number;
    recent_records?: Array<{ date: string; status: string; status_display: string }>;
  };
  exams: {
    total_exams: number;
    passed: number;
    failed: number;
    average_percentage: number;
    results: Array<{
      exam_title: string;
      marks: string;
      percentage: number;
      grade: string;
      status: string;
    }>;
  };
  finance: {
    total_invoices: number;
    total_amount: number;
    total_paid: number;
    balance_due: number;
    payment_percentage: number;
    fee_status?: string;
    pending_invoices?: Array<{
      invoice_number: string;
      amount: number;
      balance: number;
      due_date: string;
      status: string;
    }>;
  };
  performance_summary?: {
    attendance_grade: string;
    academic_grade: string;
    overall_status: string;
  };
}

const studentService = {
  // Get all students
  getAll: () => api.get<Student[] | { results: Student[] }>('/auth/students/'),
  
  // Get single student
  getById: (id: string) => api.get<Student>(`/auth/students/${id}/`),
  
  // Get student 360 data (use student-360, not student-dashboard)
  get360View: (studentId: string) => api.get<Student360Data>(`/education/students/student-360/${studentId}/`),
  
  // Get dashboard data (alias for get360View)
  getDashboardData: (studentId: string) => api.get<Student360Data>(`/education/students/student-360/${studentId}/`),
  
  // Create student
  create: (data: Partial<Student>) => api.post('/auth/students/', data),
  
  // Update student
  update: (id: string, data: Partial<Student>) => api.patch(`/auth/students/${id}/`, data),
  
  // Delete student
  delete: (id: string) => api.delete(`/auth/students/${id}/`),
  
  // Get student by ID number
  getByStudentId: (studentId: string) => api.get<Student>(`/auth/students/by-id/${studentId}/`),
};

export default studentService;

