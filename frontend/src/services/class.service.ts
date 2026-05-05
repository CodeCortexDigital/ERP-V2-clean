import api from './api';

export interface SchoolClass {
  id: string;
  code: string;
  name: string;
  capacity: number;
  is_active: boolean;
}

const classService = {
  getAll: () => api.get<SchoolClass[]>('/academics/classes/'),
  getById: (id: string) => api.get<SchoolClass>(`/academics/classes/${id}/`),
  create: (data: Partial<SchoolClass>) => api.post('/academics/classes/', data),
  update: (id: string, data: Partial<SchoolClass>) => api.put(`/academics/classes/${id}/`, data),
  delete: (id: string) => api.delete(`/academics/classes/${id}/`),
};

export default classService;
