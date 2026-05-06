import api from './api';

const admissionService = {
  getApplications: () => api.get('/auth/admissions/applications/'),
  getApplicants: () => api.get('/auth/admissions/applicants/'),
  createApplicant: (data: any) => api.post('/auth/admissions/applicants/', data),
  createApplication: (applicantId: string) => api.post('/auth/admissions/applications/', { applicant_id: applicantId }),
  updateApplicationStatus: (id: string, status: string) => api.post(`/auth/admissions/applications/${id}/update-status/`, { status }),
  convertToStudent: (id: string) => api.post(`/auth/admissions/applications/${id}/convert-to-student/`),
};

export default admissionService;
