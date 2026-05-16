import api, { extractListData } from './api';

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
  getAll: async () => {
    const response = await api.get('/auth/academics/classes/');
    return { ...response, data: extractListData<SchoolClass>(response.data) };
  },
  getById: (id: string) => api.get(`/auth/academics/classes/${id}/`),
  create: (data: Partial<SchoolClass>) => api.post('/auth/academics/classes/', data),
  update: (id: string, data: Partial<SchoolClass>) => api.put(`/auth/academics/classes/${id}/`, data),
  delete: (id: string) => api.delete(`/auth/academics/classes/${id}/`),
  getSections: async (classId: string) => {
    const response = await api.get(`/auth/academics/classes/${classId}/sections/`);
    return { ...response, data: extractListData<Section>(response.data) };
  },
};

export default classService;
