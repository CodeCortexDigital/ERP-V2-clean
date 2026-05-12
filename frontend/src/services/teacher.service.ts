import api from './api';

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
  // Get all teachers - using CORRECT endpoint
  getAll: async () => {
    // Correct URL: /api/auth/academics/teachers/
    const response = await api.get('/auth/academics/teachers/');
    console.log('Teachers API response:', response.data);
    return response;
  },

  // Get single teacher
  getById: async (id: string) => {
    const response = await api.get(`/auth/academics/teachers/${id}/`);
    return response;
  },
};

export default teacherService;
