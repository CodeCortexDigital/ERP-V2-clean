import api from './api';

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  teacher_name: string;
  academic_year: string;
}

export interface Section {
  id: string;
  class_ref: string;
  name: string;
  capacity: number;
  student_count?: number;
}

const classService = {
  getAll: () => api.get('/auth/academics/classes/'),
  getById: (id: string) => api.get(`/auth/academics/classes/${id}/`),
  create: (data: Partial<SchoolClass>) => api.post('/auth/academics/classes/', data),
  update: (id: string, data: Partial<SchoolClass>) => api.put(`/auth/academics/classes/${id}/`, data),
  delete: (id: string) => api.delete(`/auth/academics/classes/${id}/`),
  getSections: (classId: string) => api.get(`/auth/academics/classes/${classId}/sections/`),
};

export default classService;
