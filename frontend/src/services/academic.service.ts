import api from './api';

const academicService = {
  // Academic Years
  getAcademicYears: () => api.get('/auth/academics/academic-years/'),
  getAcademicYear: (id: string) => api.get(`/auth/academics/academic-years/${id}/`),
  createAcademicYear: (data: any) => api.post('/auth/academics/academic-years/', data),
  updateAcademicYear: (id: string, data: any) => api.put(`/auth/academics/academic-years/${id}/`, data),
  deleteAcademicYear: (id: string) => api.delete(`/auth/academics/academic-years/${id}/`),
  
  // Classes
  getClasses: () => api.get('/auth/academics/classes/'),
  getClass: (id: string) => api.get(`/auth/academics/classes/${id}/`),
  createClass: (data: any) => api.post('/auth/academics/classes/', data),
  updateClass: (id: string, data: any) => api.put(`/auth/academics/classes/${id}/`, data),
  deleteClass: (id: string) => api.delete(`/auth/academics/classes/${id}/`),
  
  // Subjects
  getSubjects: () => api.get('/auth/academics/subjects/'),
  getSubject: (id: string) => api.get(`/auth/academics/subjects/${id}/`),
  createSubject: (data: any) => api.post('/auth/academics/subjects/', data),
  updateSubject: (id: string, data: any) => api.put(`/auth/academics/subjects/${id}/`, data),
  deleteSubject: (id: string) => api.delete(`/auth/academics/subjects/${id}/`),
};

export default academicService;
