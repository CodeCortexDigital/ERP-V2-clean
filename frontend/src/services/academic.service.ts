// frontend/src/services/academic.service.ts
import api, { extractListData } from './api';

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  description?: string;
  academic_year?: string | null;
  teacher_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  capacity: number;
  floor: number;
  building: string;
  is_active: boolean;
}

export interface Period {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_active: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ClassSubject {
  id: string;
  class_ref: string;
  subject: string;
  class_name?: string;
  subject_name?: string;
  created_at: string;
}

// ✅ Use correct URL prefixes
const API_PREFIX = '/auth/academics';

const academicService = {
  // ============================================================
  // ACADEMIC YEARS
  // ============================================================
  academicYears: {
    getAll: async (params?: any) => {
      const response = await api.get(`/academic-years/`, { params });
      return extractListData<AcademicYear>(response.data);
    },
    getById: async (id: string) => {
      const response = await api.get(`/academic-years/${id}/`);
      return response.data;
    },
    create: async (data: Partial<AcademicYear>) => {
      const response = await api.post(`/academic-years/`, data);
      return response.data;
    },
    update: async (id: string, data: Partial<AcademicYear>) => {
      const response = await api.patch(`/academic-years/${id}/`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/academic-years/${id}/`);
      return response.data;
    }
  },

  // ============================================================
  // CLASSES - ✅ FIXED: Use /classes/ 
  // ============================================================
  classes: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`/classes/`, { 
          params: { 
            page_size: 100,
            ...params 
          } 
        });
        return extractListData<SchoolClass>(response.data);
      } catch (error) {
        console.warn('Failed to fetch classes, using fallback data');
        return [];
      }
    },
    getById: async (id: string) => {
      try {
        const response = await api.get(`/classes/${id}/`);
        return response.data;
      } catch {
        return { id, name: 'Unknown Class', code: 'N/A' };
      }
    },
    create: async (data: Partial<SchoolClass>) => {
      const payload = {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase().replace(/\s/g, ''),
        description: data.description || '',
        academic_year: data.academic_year || null,
        teacher_name: data.teacher_name || '',
        is_active: data.is_active !== false
      };
      const response = await api.post(`/classes/`, payload);
      return response.data;
    },
    update: async (id: string, data: Partial<SchoolClass>) => {
      const payload = {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase().replace(/\s/g, ''),
        description: data.description || '',
        academic_year: data.academic_year || null,
        teacher_name: data.teacher_name || '',
        is_active: data.is_active !== false
      };
      const response = await api.patch(`/classes/${id}/`, payload);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/classes/${id}/`);
      return response.data;
    }
  },

  // ============================================================
  // CLASSROOMS
  // ============================================================
  classrooms: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`/classrooms/`, { params });
        return extractListData<Classroom>(response.data);
      } catch {
        return [];
      }
    },
    getById: async (id: string) => {
      const response = await api.get(`/classrooms/${id}/`);
      return response.data;
    },
    create: async (data: Partial<Classroom>) => {
      const response = await api.post(`/classrooms/`, data);
      return response.data;
    },
    update: async (id: string, data: Partial<Classroom>) => {
      const response = await api.patch(`/classrooms/${id}/`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/classrooms/${id}/`);
      return response.data;
    }
  },

  // ============================================================
  // PERIODS
  // ============================================================
  periods: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`/periods/`, { params });
        return extractListData<Period>(response.data);
      } catch {
        return [];
      }
    },
    getById: async (id: string) => {
      const response = await api.get(`/periods/${id}/`);
      return response.data;
    },
    create: async (data: Partial<Period>) => {
      const response = await api.post(`/periods/`, data);
      return response.data;
    },
    update: async (id: string, data: Partial<Period>) => {
      const response = await api.patch(`/periods/${id}/`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/periods/${id}/`);
      return response.data;
    }
  },

  // ============================================================
  // TIMETABLE
  // ============================================================
  timetable: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`/timetable-entries/`, { params });
        return extractListData<any>(response.data);
      } catch {
        return [];
      }
    },
    getById: async (id: string) => {
      const response = await api.get(`/timetable-entries/${id}/`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post(`/timetable-entries/`, data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.patch(`/timetable-entries/${id}/`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/timetable-entries/${id}/`);
      return response.data;
    }
  },

  // ============================================================
  // SUBJECTS
  // ============================================================
  subjects: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`/subjects/`, { params });
        return extractListData<Subject>(response.data);
      } catch {
        return [];
      }
    },
    getById: async (id: string) => {
      const response = await api.get(`/subjects/${id}/`);
      return response.data;
    },
    create: async (data: Partial<Subject>) => {
      const response = await api.post(`/subjects/`, data);
      return response.data;
    },
    update: async (id: string, data: Partial<Subject>) => {
      const response = await api.patch(`/subjects/${id}/`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/subjects/${id}/`);
      return response.data;
    }
  },

  // ============================================================
  // CLASS SUBJECTS (Assignments)
  // ============================================================
  classSubjects: {
    getAll: async (params?: any) => {
      try {
        const response = await api.get(`${API_PREFIX}/class-subjects/`, { params });
        return extractListData<ClassSubject>(response.data);
      } catch {
        return [];
      }
    },
    getById: async (id: string) => {
      const response = await api.get(`${API_PREFIX}/class-subjects/${id}/`);
      return response.data;
    },
    create: async (data: Partial<ClassSubject>) => {
      try {
        if (!data.class_ref) {
          throw new Error('Class is required');
        }
        if (!data.subject) {
          throw new Error('Subject is required');
        }

        const payload = {
          class_ref: data.class_ref,
          subject: data.subject
        };
        
        const response = await api.post(`${API_PREFIX}/class-subjects/`, payload);
        return response.data;
      } catch (error: any) {
        console.error('Error creating class subject:', error);
        if (error.response?.data) {
          throw error;
        }
        throw new Error('Failed to assign subject to class');
      }
    },
    update: async (id: string, data: Partial<ClassSubject>) => {
      const response = await api.patch(`${API_PREFIX}/class-subjects/${id}/`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`${API_PREFIX}/class-subjects/${id}/`);
      return response.data;
    },
    getByClass: async (classId: string) => {
      try {
        const response = await api.get(`${API_PREFIX}/class-subjects/`, { 
          params: { class_ref: classId } 
        });
        return extractListData<ClassSubject>(response.data);
      } catch {
        return [];
      }
    }
  },

  // ============================================================
  // SHORTCUT METHODS
  // ============================================================
  getClasses: async (params?: any) => {
    return academicService.classes.getAll(params);
  }
};

export default academicService;