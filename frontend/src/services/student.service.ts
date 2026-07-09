// frontend/src/services/student.service.ts
import api, { extractListData } from './api';

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

// Helper to normalize student data from backend
const normalizeStudent = (student: any): Student => ({
  ...student,
  id: String(student.id || student.student_id || ''),
  student_id: student.student_id || student.registration_no || '',
  full_name: student.full_name || student.name || 'Student',
  is_active: student.is_active ?? student.active ?? true,
  current_class_name: student.current_class_name || student.current_class?.name || student.class_name || '',
  current_section_name: student.current_section_name || student.current_section?.name || '',
  profile_picture: student.profile_picture || student.avatar || null,
});

// Helper to normalize array of students
const normalizeStudents = (students: any[]): Student[] => {
  if (!Array.isArray(students)) return [];
  return students.map(normalizeStudent);
};

const studentService = {
  // Get all students with optional filters
  getAll: async (params?: { 
    class_id?: string; 
    is_active?: boolean; 
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      // Try /students/ first (new API structure)
      let response = await api.get('/students/', { params }).catch(() => null);
      
      // If that fails, try /auth/students/ (legacy)
      if (!response) {
        response = await api.get('/auth/students/', { params });
      }
      
      console.log('📚 Student API Response:', response);
      
      // Extract students from response
      let backendStudents: any[] = [];
      
      if (response?.data) {
        // If data is an array
        if (Array.isArray(response.data)) {
          backendStudents = response.data;
        } 
        // If data has results property (paginated)
        else if (response.data.results && Array.isArray(response.data.results)) {
          backendStudents = response.data.results;
        }
        // If data has data property
        else if (response.data.data && Array.isArray(response.data.data)) {
          backendStudents = response.data.data;
        }
        // Try extractListData helper
        else {
          backendStudents = extractListData<any>(response.data);
        }
      }
      
      console.log('📚 Extracted students:', backendStudents);
      
      const normalized = normalizeStudents(backendStudents);
      console.log('📚 Normalized students:', normalized);
      
      return { ...response, data: normalized };
    } catch (error) {
      console.error('Error fetching students:', error);
      // Return empty array on error
      return { data: [] };
    }
  },

  // Get a single student by ID
  getById: async (id: string) => {
    try {
      let response = await api.get(`/students/${id}/`).catch(() => null);
      
      if (!response) {
        response = await api.get(`/auth/students/${id}/`);
      }
      
      if (response?.data) {
        response.data = normalizeStudent(response.data);
      }
      return response || { data: null };
    } catch (error) {
      console.error('Error fetching student:', error);
      return { data: null };
    }
  },

  // Get student by student_id (registration number)
  getByStudentId: async (studentId: string) => {
    try {
      let response = await api.get(`/students/by-id/${studentId}/`).catch(() => null);
      
      if (!response) {
        response = await api.get(`/auth/students/by-id/${studentId}/`);
      }
      
      if (response?.data) {
        response.data = normalizeStudent(response.data);
      }
      return response || { data: null };
    } catch (error) {
      console.error('Error fetching student by ID:', error);
      return { data: null };
    }
  },

  // Get students by class
  getByClass: async (classId: string) => {
    return studentService.getAll({ class_id: classId });
  },

  // Get students by class name
  getByClassName: async (className: string) => {
    return studentService.getAll({ search: className });
  },

  // Get active students only
  getActive: async () => {
    return studentService.getAll({ is_active: true });
  },

  // Get inactive students only
  getInactive: async () => {
    return studentService.getAll({ is_active: false });
  },

  // Get student 360 view (dashboard data)
  get360View: async (studentId: string) => {
    try {
      const response = await api.get(`/education/students/student-360/${studentId}/`);
      return response;
    } catch (error) {
      console.error('Error fetching 360 view:', error);
      return { data: null };
    }
  },

  // Get dashboard data (alias for get360View)
  getDashboardData: async (studentId: string) => {
    return studentService.get360View(studentId);
  },

  // Create a new student
  create: async (data: Partial<Student>) => {
    try {
      const response = await api.post('/students/', data);
      if (response?.data) {
        response.data = normalizeStudent(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error creating student:', error);
      throw error;
    }
  },

  // Create a new student with file upload (FormData)
  createWithFile: async (formData: FormData) => {
    try {
      const response = await api.post('/students/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response?.data) {
        response.data = normalizeStudent(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error creating student with file:', error);
      throw error;
    }
  },

  // Update a student
  update: async (id: string, data: Partial<Student>) => {
    try {
      let response = await api.patch(`/students/${id}/`, data).catch(() => null);
      
      if (!response) {
        response = await api.patch(`/auth/students/${id}/`, data);
      }
      
      if (response?.data) {
        response.data = normalizeStudent(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  // Update a student with file upload (FormData)
  updateWithFile: async (id: string, formData: FormData) => {
    try {
      let response = await api.patch(`/students/${id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }).catch(() => null);
      
      if (!response) {
        response = await api.patch(`/auth/students/${id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      if (response?.data) {
        response.data = normalizeStudent(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error updating student with file:', error);
      throw error;
    }
  },

  // Delete a student (soft delete)
  delete: async (id: string) => {
    try {
      let response = await api.delete(`/students/${id}/`).catch(() => null);
      
      if (!response) {
        response = await api.delete(`/auth/students/${id}/`);
      }
      
      return response;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // Toggle student active status
  toggleStatus: async (id: string, isActive: boolean) => {
    try {
      let response = await api.patch(`/students/${id}/`, { is_active: isActive }).catch(() => null);
      
      if (!response) {
        response = await api.patch(`/auth/students/${id}/`, { is_active: isActive });
      }
      
      if (response?.data) {
        response.data = normalizeStudent(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error toggling student status:', error);
      throw error;
    }
  },

  // Promote students (bulk update class)
  promoteStudents: async (studentIds: string[], newClassId: string) => {
    try {
      const response = await api.post('/students/promote/', {
        student_ids: studentIds,
        new_class_id: newClassId
      });
      return response;
    } catch (error) {
      console.error('Error promoting students:', error);
      throw error;
    }
  },

  // Search students
  search: async (query: string) => {
    return studentService.getAll({ search: query });
  },

  // Get students for ID cards (with additional data)
  getForIdCards: async () => {
    return studentService.getAll({ is_active: true });
  },

  // Get student with complete details (including class, section, etc.)
  getWithDetails: async (id: string) => {
    return studentService.getById(id);
  },

  // ============================================================
  // STUDENT HISTORY METHODS
  // ============================================================

  // Get student history with optional filters
  getHistory: async (studentId: string, params?: { 
    action_type?: string; 
    search?: string; 
    limit?: number; 
    offset?: number 
  }) => {
    try {
      const response = await api.get(`/students/${studentId}/history/`, { params });
      return response;
    } catch (error) {
      console.error('Error fetching student history:', error);
      return { data: [] };
    }
  },

  // Get student history summary statistics
  getHistorySummary: async (studentId: string) => {
    try {
      const response = await api.get(`/students/${studentId}/history/summary/`);
      return response;
    } catch (error) {
      console.error('Error fetching history summary:', error);
      return { data: {} };
    }
  },

  // Get student timeline (all events in chronological order)
  getTimeline: async (studentId: string) => {
    try {
      const response = await api.get(`/students/${studentId}/timeline/`);
      return response;
    } catch (error) {
      console.error('Error fetching timeline:', error);
      return { data: [] };
    }
  },

  // Log a custom action for a student
  logAction: async (studentId: string, data: {
    action_type: string;
    action: string;
    description?: string;
    previous_value?: any;
    new_value?: any;
    context?: any;
  }) => {
    try {
      const response = await api.post(`/students/${studentId}/log-action/`, data);
      return response;
    } catch (error) {
      console.error('Error logging action:', error);
      throw error;
    }
  }
};

export default studentService;