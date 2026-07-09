import api, { extractListData } from './api';

export interface Section {
  id: string;
  name: string;
  code: string;
  class_ref: string;
  class_name?: string;
  class_code?: string;
  capacity: number;
  student_count?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const sectionService = {
  // Get all sections with optional filters
  getAll: async (params?: { 
    class_id?: string; 
    is_active?: boolean; 
    search?: string;
  }) => {
    const response = await api.get('/auth/sections/', { params });
    return response;
  },
  
  // Get a single section by ID
  getById: async (id: string) => {
    const response = await api.get(`/auth/sections/${id}/`);
    return response;
  },
  
  // Get sections by class
  getByClass: async (classId: string) => {
    const response = await api.get('/auth/sections/', { params: { class_ref: classId } });
    return response;
  },
  
  // Get active sections only
  getActive: async () => {
    const response = await api.get('/auth/sections/', { params: { is_active: true } });
    return response;
  },
  
  // Create a new section
  create: async (data: Partial<Section>) => {
    const response = await api.post('/auth/sections/', data);
    return response;
  },
  
  // Update a section
  update: async (id: string, data: Partial<Section>) => {
    const response = await api.patch(`/auth/sections/${id}/`, data);
    return response;
  },
  
  // Delete a section
  delete: async (id: string) => {
    const response = await api.delete(`/auth/sections/${id}/`);
    return response;
  },
  
  // Bulk create sections
  bulkCreate: async (sections: Partial<Section>[]) => {
    const response = await api.post('/auth/sections/bulk/', sections);
    return response;
  },
  
  // Get students in a section
  getStudents: async (sectionId: string) => {
    const response = await api.get('/auth/students/', { params: { section_id: sectionId } });
    return response;
  }
};

export default sectionService;