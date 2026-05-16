import api, { extractListData } from './api';

export interface Teacher {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  qualifications: string[];
  specializations: string[];
  experience_years: number;
  joining_date: string;
  is_active: boolean;
  profile_picture: string | null;
}

const teacherService = {
  // Get current teacher's profile (for logged-in teacher)
  getMyProfile: async () => {
    const response = await api.get('/auth/my-teacher-profile/');
    return response;
  },

  // Get all teachers
  getAll: async () => {
    const response = await api.get('/auth/academics/teachers/');
    return { ...response, data: extractListData<Teacher>(response.data) };
  },

  // Get single teacher
  getById: async (id: string) => {
    const response = await api.get(`/auth/academics/teachers/${id}/`);
    return response;
  },

  // Create new teacher
  create: async (data: any) => {
    const response = await api.post('/auth/academics/teachers/', data);
    return response;
  },

  // Update teacher
  update: async (id: string, data: any) => {
    const response = await api.put(`/auth/academics/teachers/${id}/`, data);
    return response;
  },

  // Delete teacher (soft delete - set inactive)
  deleteTeacher: async (id: string) => {
    const response = await api.delete(`/auth/academics/teachers/${id}/`);
    return response;
  },
};

export default teacherService;