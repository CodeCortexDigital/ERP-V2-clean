import api from './api';

export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  father_name?: string;
  mother_name?: string;
  guardian_phone?: string;
  program?: string;
  current_class?: string;
  current_section?: string;
  is_active: boolean;
  enrollment_date?: string;
}

export interface Student360Data {
  student: Student;
  attendance: {
    total_days: number;
    present: number;
    absent: number;
    attendance_rate: number;
    last_30_days_rate: number;
    recent_records: Array<{ date: string; status: string }>;
  };
  exams: {
    total_exams: number;
    passed: number;
    average_percentage: number;
    recent_results: Array<{
      exam_title: string;
      marks: string;
      percentage: number;
      grade: string;
      status: string;
    }>;
  };
  finance: {
    total_fees: number;
    paid: number;
    balance: number;
    payment_percentage: number;
    last_payment?: { amount: number; date: string };
    pending_invoices: Array<{
      invoice_number: string;
      amount: number;
      due_date: string;
      balance: number;
    }>;
  };
  class_info: {
    class_name: string;
    section_name: string;
    academic_year: string;
  };
}

const studentService = {
  getAll: () => api.get<Student[]>('/auth/students/'),
  getById: (id: string) => api.get<Student>(`/auth/students/${id}/`),
  get360View: (studentId: string) => api.get<Student360Data>(`/education/students/student-360/${studentId}/`),
  create: (data: Partial<Student>) => api.post('/auth/students/', data),
  update: (id: string, data: Partial<Student>) => api.patch(`/auth/students/${id}/`, data),
  delete: (id: string) => api.delete(`/auth/students/${id}/`),
};

export default studentService;


