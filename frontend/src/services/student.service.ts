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

const studentService = {
  // Get all students
  getAll: () => api.get('/auth/students/'),
  
  // Get single student
  getById: (id: string) => api.get(`/auth/students/${id}/`),
  
  // Get student 360 data
  get360View: (studentId: string) => api.get(`/education/students/student-360/${studentId}/`),
  
  // Create student
  create: (data: Partial<Student>) => api.post('/auth/students/', data),
  
  // Update student
  update: (id: string, data: Partial<Student>) => api.put(`/auth/students/${id}/`, data),
  
  // Delete student
  delete: (id: string) => api.delete(`/auth/students/${id}/`),
};

export default studentService;
