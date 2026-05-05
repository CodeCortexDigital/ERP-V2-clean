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
  guardian_email?: string;
  program?: string;
  current_class?: string;
  current_class_name?: string;
  current_section?: string;
  current_section_name?: string;
  is_active: boolean;
  enrollment_date?: string;
}

export interface StudentDashboard {
  attendance_percentage: number;
  fee_status: string;
  balance: number;
  priority: string;
  last_activities: Array<{ action: string; time: string }>;
}

const studentService = {
  getAll: async () => {
    const response = await api.get('/auth/students/');
    let students = [];
    if (Array.isArray(response.data)) {
      students = response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      students = response.data.results;
    } else {
      students = [];
    }
    return { ...response, data: students };
  },
  
  getById: (id: string) => api.get<Student>(`/auth/students/${id}/`),
  
  getDashboardData: async (id: string) => {
    try {
      const response = await api.get<StudentDashboard>(`/education/students/student-dashboard/${id}/`);
      return response;
    } catch (error) {
      // Return default data if endpoint doesn't exist yet
      return {
        data: {
          attendance_percentage: 85,
          fee_status: 'pending',
          balance: 5000,
          priority: 'normal',
          last_activities: []
        }
      };
    }
  },
  
  get360View: (studentId: string) => api.get(`/education/students/student-360/${studentId}/`),
  
  create: (data: Partial<Student>) => api.post('/auth/students/', data),
  
  update: (id: string, data: Partial<Student>) => api.put(`/auth/students/${id}/`, data),
  
  delete: (id: string) => api.delete(`/auth/students/${id}/`),
};

export default studentService;
