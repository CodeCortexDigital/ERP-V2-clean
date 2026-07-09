// frontend/src/services/teacher.service.ts
import api, { extractListData } from './api';

export interface Teacher {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  qualifications: string[];
  specializations: string[];
  experience_years: number;
  joining_date: string;
  is_active: boolean;
  profile_picture: string | null;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  emergency_contact?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper to normalize teacher data from backend
const normalizeTeacher = (teacher: any): Teacher => ({
  ...teacher,
  id: String(teacher.id),
  employee_id: teacher.employee_id || teacher.staff_id || teacher.teacher_id || '',
  full_name: teacher.full_name || teacher.name || 'Teacher',
  is_active: teacher.is_active ?? teacher.active ?? true,
  qualifications: Array.isArray(teacher.qualifications) ? teacher.qualifications : 
                  teacher.qualifications ? [teacher.qualifications] : [],
  specializations: Array.isArray(teacher.specializations) ? teacher.specializations : 
                   teacher.specializations ? [teacher.specializations] : [],
  profile_picture: teacher.profile_picture || teacher.avatar || null,
});

// Helper to normalize array of teachers
const normalizeTeachers = (teachers: any[]): Teacher[] => {
  return teachers.map(normalizeTeacher);
};

const teacherService = {
  // ============================================================
  // Teacher routes are mounted under /auth/academics/teachers/
  // and the profile route is /auth/my-teacher-profile/
  // ============================================================

  // Get current teacher's profile (for logged-in teacher)
  getMyProfile: async () => {
    const response = await api.get('/auth/my-teacher-profile/');
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Get all teachers with optional filters
  getAll: async (params?: { 
    is_active?: boolean; 
    search?: string;
    page?: number;
    page_size?: number;
    specializations?: string;
  }) => {
    const response = await api.get('/auth/academics/teachers/', { 
      params: { page_size: 100, ...params } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get a single teacher by ID
  getById: async (id: string) => {
    const response = await api.get(`/auth/academics/teachers/${id}/`);
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Get teacher by employee_id
  getByEmployeeId: async (employeeId: string) => {
    const response = await api.get('/auth/academics/teachers/', { 
      params: { employee_id: employeeId } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get active teachers only
  getActive: async () => {
    const response = await api.get('/auth/academics/teachers/', { 
      params: { is_active: true, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get inactive teachers only
  getInactive: async () => {
    const response = await api.get('/auth/academics/teachers/', { 
      params: { is_active: false, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Search teachers
  search: async (query: string) => {
    const response = await api.get('/auth/academics/teachers/', { 
      params: { search: query, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Create new teacher
  create: async (data: Partial<Teacher>) => {
    const response = await api.post('/auth/academics/teachers/', data);
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Update teacher
  update: async (id: string, data: Partial<Teacher>) => {
    const response = await api.patch(`/auth/academics/teachers/${id}/`, data);
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Delete teacher (soft delete - set inactive)
  deleteTeacher: async (id: string) => {
    const response = await api.delete(`/auth/academics/teachers/${id}/`, { 
      skipGlobalToast: true 
    } as any);
    return response;
  },

  // Toggle teacher active status
  toggleStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/auth/academics/teachers/${id}/`, { is_active: isActive });
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Get teachers by specialization
  getBySpecialization: async (specialization: string) => {
    const response = await api.get('/auth/academics/teachers/', { 
      params: { specializations: specialization, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get teachers count
  getCount: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/auth/academics/teachers/', { params: { ...params, page_size: 1000 } });
    return response.data;
  },

  // Bulk create teachers
  bulkCreate: async (teachers: Partial<Teacher>[]) => {
    const response = await api.post('/auth/academics/teachers/', teachers);
    if (response.data && Array.isArray(response.data)) {
      response.data = normalizeTeachers(response.data);
    }
    return response;
  },

  // Get teacher with assignments (subjects, classes, etc.)
  getWithAssignments: async (id: string) => {
    const response = await api.get(`/auth/academics/teachers/${id}/`);
    if (response.data) {
      response.data.teacher = normalizeTeacher(response.data.teacher);
    }
    return response;
  }
};

export default teacherService;