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
  teacher_type?: 'regular' | 'relief';
  role?: string;
  department?: string;
  shift?: string;
  monthly_salary?: string | number | null;
  father_husband_name?: string;
  national_id?: string;
  religion?: string;
  education?: string;
  blood_group?: string;
  home_address?: string;
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
    include_inactive?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
    specializations?: string;
  }) => {
    const response = await api.get('/teachers/', { 
      params: { page_size: 100, include_inactive: true, ...params } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get a single teacher by ID
  getById: async (id: string) => {
    const response = await api.get(`/teachers/${id}/`);
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Get teacher by employee_id
  getByEmployeeId: async (employeeId: string) => {
    const response = await api.get('/teachers/', { 
      params: { employee_id: employeeId } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get active teachers only
  getActive: async () => {
    const response = await api.get('/teachers/', { 
      params: { is_active: true, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get inactive teachers only
  getInactive: async () => {
    const response = await api.get('/teachers/', { 
      params: { is_active: false, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Search teachers
  search: async (query: string) => {
    const response = await api.get('/teachers/', { 
      params: { search: query, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Create new teacher
  create: async (data: Partial<Teacher> | FormData) => {
    try {
      if (data instanceof FormData) {
        const response = await api.post('/auth/academics/teachers/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data) {
          response.data = normalizeTeacher(response.data);
        }
        return response;
      }

      const payload = {
        full_name: data.full_name || '',
        email: data.email || '',
        employee_id: data.employee_id || '',
        phone: data.phone || '',
        joining_date: data.joining_date || new Date().toISOString().split('T')[0],
        is_active: data.is_active !== false,
        qualifications: data.qualifications || [],
        specializations: data.specializations || [],
        experience_years: data.experience_years || 0,
      };
      
      const response = await api.post('/auth/academics/teachers/', payload);
      if (response.data) {
        response.data = normalizeTeacher(response.data);
      }
      return response;
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      throw error;
    }
  },

  // Update teacher
  update: async (id: string, data: Partial<Teacher> | FormData) => {
    try {
      let response;
      if (data instanceof FormData) {
        response = await api.patch(`/auth/academics/teachers/${id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(() => null);
        
        if (!response) {
          response = await api.patch(`/teachers/${id}/`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      } else {
        response = await api.patch(`/auth/academics/teachers/${id}/`, data).catch(() => null);
        if (!response) {
          response = await api.patch(`/teachers/${id}/`, data);
        }
      }
      
      if (response?.data) {
        response.data = normalizeTeacher(response.data);
      }
      return response;
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      throw error;
    }
  },

  // Delete teacher (calls backend destroy method - tries hard delete, falls back to soft delete)
  deleteTeacher: async (id: string) => {
    const response = await api.delete(`/teachers/${id}/`, { 
      skipGlobalToast: true 
    } as any);
    return response;
  },

  // Toggle teacher active status
  toggleStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/teachers/${id}/`, { is_active: isActive });
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Get teachers by specialization
  getBySpecialization: async (specialization: string) => {
    const response = await api.get('/teachers/', { 
      params: { specializations: specialization, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get teachers count
  getCount: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/teachers/', { params: { ...params, page_size: 1000 } });
    return response.data;
  },

  // Bulk create teachers
  bulkCreate: async (teachers: Partial<Teacher>[]) => {
    const response = await api.post('/teachers/', teachers);
    if (response.data && Array.isArray(response.data)) {
      response.data = normalizeTeachers(response.data);
    }
    return response;
  },

  // Get teacher with assignments (subjects, classes, etc.)
  getWithAssignments: async (id: string) => {
    const response = await api.get(`/teachers/${id}/`);
    if (response.data) {
      response.data.teacher = normalizeTeacher(response.data.teacher);
    }
    return response;
  },

  // ============================================================
  // LEAVE & SUBSTITUTION
  // ============================================================
  leaves: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`/auth/academics/teacher-leaves/`, { params });
        return extractListData<any>(response.data);
      } catch {
        return [];
      }
    },
    create: async (data: any) => {
      const response = await api.post(`/auth/academics/teacher-leaves/`, data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.patch(`/auth/academics/teacher-leaves/${id}/`, data);
      return response.data;
    },
    remove: async (id: string) => {
      const response = await api.delete(`/auth/academics/teacher-leaves/${id}/`);
      return response.data;
    }
  },

  substitutions: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`/auth/academics/timetable-substitutions/`, { params });
        return extractListData<any>(response.data);
      } catch {
        return [];
      }
    }
  },

  leaveBalances: {
    get: async (params?: any) => {
      try {
        const response = await api.get(`/auth/academics/leave-balances/`, { params });
        const data = response.data;
        if (Array.isArray(data)) return data[0] || null;
        return data || null;
      } catch {
        return null;
      }
    },
    update: async (id: string, data: any) => {
      const response = await api.patch(`/auth/academics/leave-balances/${id}/`, data);
      return response.data;
    }
  }
};

export default teacherService;
