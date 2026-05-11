import api from './api';

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  capacity: number;
  teacher_name: string;
  teacher_email: string;
  academic_year_id?: string;
  academic_year_name?: string;
  sections_count: number;
  students_count: number;
  is_active: boolean;
}

export interface Section {
  id: string;
  name: string;
  code: string;
  capacity: number;
  students_count: number;
  is_active: boolean;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  level: string;
  description: string;
  is_active: boolean;
}

const academicsService = {
  // Academic Years
  getAcademicYears: () => api.get<AcademicYear[] | { results: AcademicYear[] }>('/academics/academic-years/'),
  createAcademicYear: (data: Partial<AcademicYear>) => api.post('/academics/academic-years/create/', data),
  updateAcademicYear: (id: string, data: Partial<AcademicYear>) => api.put(`/academics/academic-years/${id}/`, data),
  
  // Classes
  getClasses: () => api.get<SchoolClass[] | { results: SchoolClass[] }>('/academics/classes/'),
  createClass: (data: Partial<SchoolClass>) => api.post('/academics/classes/create/', data),
  
  // Sections
  getSectionsByClass: (classId: string) => api.get<Section[] | { results: Section[] }>(`/academics/sections/by-class/${classId}/`),
  createSection: (data: { class_id: string; name: string; code: string; capacity: number }) => 
    api.post('/academics/sections/create/', data),
  
  // Courses
  getCourses: () => api.get<Course[] | { results: Course[] }>('/academics/courses/'),
  createCourse: (data: Partial<Course>) => api.post('/academics/courses/create/', data),
  
  // Hierarchy
  getHierarchy: () => api.get('/academics/hierarchy/'),
};

export default academicsService;
