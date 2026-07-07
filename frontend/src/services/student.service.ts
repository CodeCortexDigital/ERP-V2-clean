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
  attendance_rate?: number;
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
  getById: (id: string) => {
    if (id && id.startsWith('std-')) {
      const custom = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const matched = custom.find((s: any) => String(s.id) === String(id));
      const fallback = {
        id,
        student_id: id.replace('std-', '').substring(0, 6),
        full_name: 'Custom Student',
        email: 'custom@school.edu',
        phone: '',
        is_active: true,
      };
      return Promise.resolve({ data: matched || fallback, status: 200, statusText: 'OK', headers: {}, config: {} } as any);
    }
    return api.get<Student>(`/auth/students/${id}/`);
  },
  
  // Get student 360 data (use student-360, not student-dashboard)
  get360View: (studentId: string) => {
    if (studentId && studentId.startsWith('std-')) {
      const custom = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const matched = custom.find((s: any) => String(s.id) === String(studentId));
      const studentObj = matched || { id: studentId, full_name: 'Custom Student', is_active: true };
      const mock360: Student360Data = {
        student: studentObj,
        attendance: { total_days: 0, present: 0, absent: 0, late: 0, attendance_rate: 100 },
        exams: { total_exams: 0, passed: 0, failed: 0, average_percentage: 0, results: [] },
        finance: { total_invoices: 0, total_amount: 0, total_paid: 0, balance_due: 0, payment_percentage: 100, pending_invoices: [] },
      };
      return Promise.resolve({ data: mock360, status: 200, statusText: 'OK', headers: {}, config: {} } as any);
    }
    return api.get<Student360Data>(`/education/students/student-360/${studentId}/`);
  },
  
  // Get dashboard data (alias for get360View)
  getDashboardData: (studentId: string) => studentService.get360View(studentId),
  
  // Create student
  create: (data: Partial<Student>) => api.post('/auth/students/', data),
  
  // Update student
  update: (id: string, data: Partial<Student>) => {
    if (id && id.startsWith('std-')) {
      const custom = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const idx = custom.findIndex((s: any) => String(s.id) === String(id));
      let updatedData = {};
      if (idx !== -1) {
        custom[idx] = { ...custom[idx], ...data };
        localStorage.setItem('custom_students', JSON.stringify(custom));
        updatedData = custom[idx];
      }
      return Promise.resolve({ data: updatedData, status: 200, statusText: 'OK', headers: {}, config: {} } as any);
    }
    return api.patch(`/auth/students/${id}/`, data);
  },
  
  // Delete student
  delete: (id: string) => {
    if (id && id.startsWith('std-')) {
      const custom = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const filtered = custom.filter((s: any) => String(s.id) !== String(id));
      localStorage.setItem('custom_students', JSON.stringify(filtered));
      const deletedIds = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('deleted_student_ids', JSON.stringify(deletedIds));
      }
      return Promise.resolve({ data: { success: true }, status: 200, statusText: 'OK', headers: {}, config: {} } as any);
    }
    return api.delete(`/auth/students/${id}/`);
  },
  
  // Get student by ID number
  getByStudentId: (studentId: string) => {
    if (studentId && studentId.startsWith('std-')) {
      const custom = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const matched = custom.find((s: any) => String(s.id) === String(studentId) || String(s.student_id) === String(studentId));
      if (matched) {
        return Promise.resolve({ data: matched, status: 200, statusText: 'OK', headers: {}, config: {} } as any);
      }
    }
    return api.get<Student>(`/auth/students/by-id/${studentId}/`);
  },
};

export default studentService;

