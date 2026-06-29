import api from './api';

export interface Section {
  id: string;
  name: string;
  class_ref: string;
  class_name?: string;
  is_active: boolean;
}

const sectionService = {
  getAll: () => api.get('/auth/sections/'),
  getById: (id: string) => api.get(`/auth/sections/${id}/`),
  create: (data: Partial<Section>) => api.post('/auth/sections/', data),
  update: (id: string, data: Partial<Section>) => api.patch(`/auth/sections/${id}/`, data),
  delete: (id: string) => api.delete(`/auth/sections/${id}/`),
};

export default sectionService;
