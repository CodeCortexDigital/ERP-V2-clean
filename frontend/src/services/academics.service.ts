import api, { extractListData } from './api';

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
  class_id?: string;
  class_name?: string;
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

// Helper to normalize class data
const normalizeClass = (cls: any): SchoolClass => ({
  ...cls,
  id: String(cls.id),
  name: cls.name || cls.class_name || '',
  code: cls.code || cls.class_code || '',
  is_active: cls.is_active ?? true,
  students_count: cls.students_count || cls.student_count || 0,
  sections_count: cls.sections_count || cls.section_count || 0,
});

const normalizeClasses = (classes: any[]): SchoolClass[] => classes.map(normalizeClass);

const academicsService = {
  // ==================== Academic Years ====================
  getAcademicYears: async () => {
    const response = await api.get('/academics/academic-years/');
    return response;
  },
  getAcademicYear: async (id: string) => {
    const response = await api.get(`/academics/academic-years/${id}/`);
    return response;
  },
  createAcademicYear: async (data: Partial<AcademicYear>) => {
    const response = await api.post('/academics/academic-years/', data);
    return response;
  },
  updateAcademicYear: async (id: string, data: Partial<AcademicYear>) => {
    const response = await api.patch(`/academics/academic-years/${id}/`, data);
    return response;
  },
  deleteAcademicYear: async (id: string) => {
    const response = await api.delete(`/academics/academic-years/${id}/`);
    return response;
  },

  // ==================== Classes ====================
  getClasses: async (params?: { academic_year_id?: string; is_active?: boolean }) => {
    const response = await api.get('/academics/classes/', { params });
    if (response.data) {
      const classes = extractListData<SchoolClass>(response.data);
      response.data = normalizeClasses(classes);
    }
    return response;
  },
  getClass: async (id: string) => {
    const response = await api.get(`/academics/classes/${id}/`);
    if (response.data) {
      response.data = normalizeClass(response.data);
    }
    return response;
  },
  createClass: async (data: Partial<SchoolClass>) => {
    const response = await api.post('/academics/classes/', data);
    if (response.data) {
      response.data = normalizeClass(response.data);
    }
    return response;
  },
  updateClass: async (id: string, data: Partial<SchoolClass>) => {
    const response = await api.patch(`/academics/classes/${id}/`, data);
    if (response.data) {
      response.data = normalizeClass(response.data);
    }
    return response;
  },
  deleteClass: async (id: string) => {
    const response = await api.delete(`/academics/classes/${id}/`);
    return response;
  },
  getClassByName: async (name: string) => {
    const response = await api.get('/academics/classes/', { params: { name } });
    if (response.data) {
      const classes = extractListData<SchoolClass>(response.data);
      response.data = normalizeClasses(classes);
    }
    return response;
  },
  getActiveClasses: async () => {
    const response = await api.get('/academics/classes/', { params: { is_active: true } });
    if (response.data) {
      const classes = extractListData<SchoolClass>(response.data);
      response.data = normalizeClasses(classes);
    }
    return response;
  },

  // ==================== Sections ====================
  getSections: async (params?: { class_id?: string; is_active?: boolean }) => {
    const response = await api.get('/academics/sections/', { params });
    return response;
  },
  getSectionsByClass: async (classId: string) => {
    const response = await api.get(`/academics/sections/by-class/${classId}/`);
    return response;
  },
  getSection: async (id: string) => {
    const response = await api.get(`/academics/sections/${id}/`);
    return response;
  },
  createSection: async (data: { class_id: string; name: string; code: string; capacity: number }) => {
    const response = await api.post('/academics/sections/', data);
    return response;
  },
  updateSection: async (id: string, data: Partial<Section>) => {
    const response = await api.patch(`/academics/sections/${id}/`, data);
    return response;
  },
  deleteSection: async (id: string) => {
    const response = await api.delete(`/academics/sections/${id}/`);
    return response;
  },

  // ==================== Courses ====================
  getCourses: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/academics/courses/', { params });
    return response;
  },
  getCourse: async (id: string) => {
    const response = await api.get(`/academics/courses/${id}/`);
    return response;
  },
  createCourse: async (data: Partial<Course>) => {
    const response = await api.post('/academics/courses/', data);
    return response;
  },
  updateCourse: async (id: string, data: Partial<Course>) => {
    const response = await api.patch(`/academics/courses/${id}/`, data);
    return response;
  },
  deleteCourse: async (id: string) => {
    const response = await api.delete(`/academics/courses/${id}/`);
    return response;
  },

  // ==================== Hierarchy ====================
  getHierarchy: async () => {
    const response = await api.get('/academics/hierarchy/');
    return response;
  },

  // ==================== Bulk Operations ====================
  bulkCreateClasses: async (classes: Partial<SchoolClass>[]) => {
    const response = await api.post('/academics/classes/bulk/', classes);
    return response;
  },

  // ==================== Search ====================
  searchClasses: async (query: string) => {
    const response = await api.get('/academics/classes/', { params: { search: query } });
    return response;
  },

  // ==================== Statistics ====================
  getStatistics: async () => {
    const response = await api.get('/academics/statistics/');
    return response;
  }
};

export default academicsService;