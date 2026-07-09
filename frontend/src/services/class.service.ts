import api, { extractListData } from './api';

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  teacher_name: string;
  teacher_id?: string;
  academic_year: string;
  academic_year_id?: string;
  capacity: number;
  description?: string;
  is_active: boolean;
  sections_count?: number;
  students_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Section {
  id: string;
  class_ref: string;
  name: string;
  code: string;
  capacity: number;
  student_count?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Helper to normalize class data
const normalizeClass = (cls: any): SchoolClass => ({
  ...cls,
  id: String(cls.id),
  name: cls.name || cls.class_name || '',
  code: cls.code || cls.class_code || '',
  teacher_name: cls.teacher_name || cls.teacher__full_name || '',
  academic_year: cls.academic_year || cls.academic_year__name || '',
  is_active: cls.is_active ?? true,
  capacity: Number(cls.capacity) || 0,
});

const normalizeClasses = (classes: any[]): SchoolClass[] => classes.map(normalizeClass);

const classService = {
  // Get all classes with optional filters
  getAll: async (params?: { 
    academic_year_id?: string; 
    is_active?: boolean; 
    search?: string;
    page?: number;
  }) => {
    const response = await api.get('/auth/academics/classes/', { params });
    const classes = extractListData<SchoolClass>(response.data);
    return { ...response, data: normalizeClasses(classes) };
  },
  
  // Get a single class by ID
  getById: async (id: string) => {
    const response = await api.get(`/auth/academics/classes/${id}/`);
    if (response.data) {
      response.data = normalizeClass(response.data);
    }
    return response;
  },
  
  // Get class by name
  getByName: async (name: string) => {
    const response = await api.get('/auth/academics/classes/', { params: { name } });
    const classes = extractListData<SchoolClass>(response.data);
    return { ...response, data: normalizeClasses(classes) };
  },
  
  // Get active classes only
  getActive: async () => {
    const response = await api.get('/auth/academics/classes/', { params: { is_active: true } });
    const classes = extractListData<SchoolClass>(response.data);
    return { ...response, data: normalizeClasses(classes) };
  },
  
  // Create a new class
  create: async (data: Partial<SchoolClass>) => {
    const response = await api.post('/auth/academics/classes/', data);
    if (response.data) {
      response.data = normalizeClass(response.data);
    }
    return response;
  },
  
  // Update a class
  update: async (id: string, data: Partial<SchoolClass>) => {
    const response = await api.patch(`/auth/academics/classes/${id}/`, data);
    if (response.data) {
      response.data = normalizeClass(response.data);
    }
    return response;
  },
  
  // Delete a class (soft delete)
  delete: async (id: string) => {
    const response = await api.delete(`/auth/academics/classes/${id}/`);
    return response;
  },
  
  // Get sections for a class
  getSections: async (classId: string) => {
    const response = await api.get(`/auth/academics/classes/${classId}/sections/`);
    const sections = extractListData<Section>(response.data);
    return { ...response, data: sections };
  },
  
  // Get students for a class
  getStudents: async (classId: string) => {
    const response = await api.get('/auth/students/', { params: { class_id: classId } });
    return response;
  },
  
  // Get class statistics
  getStatistics: async (classId: string) => {
    const response = await api.get(`/auth/academics/classes/${classId}/statistics/`);
    return response;
  },
  
  // Bulk create classes
  bulkCreate: async (classes: Partial<SchoolClass>[]) => {
    const response = await api.post('/auth/academics/classes/bulk/', classes);
    return response;
  },
  
  // Search classes
  search: async (query: string) => {
    const response = await api.get('/auth/academics/classes/', { params: { search: query } });
    const classes = extractListData<SchoolClass>(response.data);
    return { ...response, data: normalizeClasses(classes) };
  }
};

export default classService;