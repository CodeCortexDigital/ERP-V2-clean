import api from './api';

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  capacity: number;
  is_active: boolean;
  academic_year?: string;
}

export interface Section {
  id: string;
  name: string;
  code: string;
  class_ref: string;
}

const classService = {
  // Get all classes
  getAll: () => api.get<SchoolClass[]>('/auth/classes/'),
  
  // Get single class
  getById: (id: string) => api.get<SchoolClass>(`/auth/classes/${id}/`),
  
  // Create class
  create: (data: Partial<SchoolClass>) => api.post('/auth/classes/', data),
  
  // Update class
  update: (id: string, data: Partial<SchoolClass>) => api.put(`/auth/classes/${id}/`, data),
  
  // Delete class
  delete: (id: string) => api.delete(`/auth/classes/${id}/`),
  
  // Get sections for a class
  getSections: (classId: string) => api.get<Section[]>(`/auth/classes/${classId}/sections/`),
};

export default classService;
