import api from './api';

export interface Applicant {
  id: string;
  applicant_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  applying_for: string;
  status: 'new' | 'reviewed' | 'accepted' | 'rejected' | 'enrolled';
  created_at: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  previous_institution?: string;
  previous_qualification?: string;
  previous_percentage?: number;
}

const admissionsService = {
  // Get all applicants
  getAll: () => api.get<Applicant[]>('/admissions/applicants/'),
  
  // Get single applicant
  getById: (id: string) => api.get<Applicant>(`/admissions/applicants/${id}/`),
  
  // Create new applicant (public)
  create: (data: Partial<Applicant>) => api.post('/admissions/applicants/create/', data),
  
  // Update applicant status
  updateStatus: (id: string, status: string) => api.put(`/admissions/applicants/${id}/status/`, { status }),
  
  // Convert to student
  convertToStudent: (id: string) => api.post(`/admissions/applicants/${id}/convert/`),
  
  // Delete applicant
  delete: (id: string) => api.delete(`/admissions/applicants/${id}/delete/`),
};

export default admissionsService;
