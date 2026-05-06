import api from './api';

export interface Applicant {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  previous_institution?: string;
  previous_qualification?: string;
  previous_percentage?: number;
  applying_for?: string;
  status?: string;
}

export interface Application {
  id?: string;
  applicant: string;
  program: string;
  semester: string;
  academic_year: string;
  documents?: any;
  notes?: string;
  status?: string;
}

const admissionsService = {
  // Alias for getApplicants (for compatibility)
  getAll: () => api.get('/auth/admissions/applicants/'),
  
  // Alias for create (for compatibility)
  create: (data: Partial<Applicant>) => api.post('/auth/admissions/applicants/', data),
  
  // Applicants
  getApplicants: () => api.get('/auth/admissions/applicants/'),
  getApplicant: (id: string) => api.get(`/auth/admissions/applicants/${id}/`),
  createApplicant: (data: Partial<Applicant>) => api.post('/auth/admissions/applicants/', data),
  updateApplicant: (id: string, data: Partial<Applicant>) => api.patch(`/auth/admissions/applicants/${id}/`, data),
  deleteApplicant: (id: string) => api.delete(`/auth/admissions/applicants/${id}/`),
  
  // Applications
  getApplications: () => api.get('/auth/admissions/applications/'),
  getApplication: (id: string) => api.get(`/auth/admissions/applications/${id}/`),
  createApplication: (data: Partial<Application>) => api.post('/auth/admissions/applications/', data),
  updateApplication: (id: string, data: Partial<Application>) => api.patch(`/auth/admissions/applications/${id}/`, data),
  convertToStudent: (id: string) => api.post(`/auth/admissions/applications/convert/${id}/`),
  
  // Additional helper methods
  submitApplication: (data: any) => api.post('/auth/admissions/applications/', data),
};

export default admissionsService;
