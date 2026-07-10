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
  // ✅ FIXED: Teacher routes are mounted under /auth/teachers/
  // NOT /auth/academics/teachers/
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
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getAll: async (params?: { 
    is_active?: boolean; 
    search?: string;
    page?: number;
    page_size?: number;
    specializations?: string;
  }) => {
    const response = await api.get('/auth/teachers/', { 
      params: { page_size: 100, ...params } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get a single teacher by ID
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getById: async (id: string) => {
    const response = await api.get(`/auth/teachers/${id}/`);
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Get teacher by employee_id
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getByEmployeeId: async (employeeId: string) => {
    const response = await api.get('/auth/teachers/', { 
      params: { employee_id: employeeId } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get active teachers only
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getActive: async () => {
    const response = await api.get('/auth/teachers/', { 
      params: { is_active: true, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get inactive teachers only
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getInactive: async () => {
    const response = await api.get('/auth/teachers/', { 
      params: { is_active: false, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Search teachers
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  search: async (query: string) => {
    const response = await api.get('/auth/teachers/', { 
      params: { search: query, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Create new teacher
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  create: async (data: Partial<Teacher>) => {
    const response = await api.post('/auth/teachers/', data);
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Update teacher
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  update: async (id: string, data: Partial<Teacher>) => {
    const response = await api.patch(`/auth/teachers/${id}/`, data);
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Delete teacher (soft delete - set inactive)
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  deleteTeacher: async (id: string) => {
    const response = await api.delete(`/auth/teachers/${id}/`, { 
      skipGlobalToast: true 
    } as any);
    return response;
  },

  // Toggle teacher active status
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  toggleStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/auth/teachers/${id}/`, { is_active: isActive });
    if (response.data) {
      response.data = normalizeTeacher(response.data);
    }
    return response;
  },

  // Get teachers by specialization
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getBySpecialization: async (specialization: string) => {
    const response = await api.get('/auth/teachers/', { 
      params: { specializations: specialization, page_size: 100 } 
    });
    const backendTeachers = extractListData<Teacher>(response.data);
    const normalized = normalizeTeachers(backendTeachers);
    return { ...response, data: normalized };
  },

  // Get teachers count
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getCount: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/auth/teachers/', { params: { ...params, page_size: 1000 } });
    return response.data;
  },

  // Bulk create teachers
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  bulkCreate: async (teachers: Partial<Teacher>[]) => {
    const response = await api.post('/auth/teachers/', teachers);
    if (response.data && Array.isArray(response.data)) {
      response.data = normalizeTeachers(response.data);
    }
    return response;
  },

  // Get teacher with assignments (subjects, classes, etc.)
  // ✅ FIXED: Changed from /auth/academics/teachers/ to /auth/teachers/
  getWithAssignments: async (id: string) => {
    const response = await api.get(`/auth/teachers/${id}/`);
    if (response.data) {
      response.data.teacher = normalizeTeacher(response.data.teacher);
    }
    return response;
  }
};

export default teacherService;