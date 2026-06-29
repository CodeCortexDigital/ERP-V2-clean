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

  // Class Subjects
  getClassSubjects: () => api.get('/auth/academics/class-subjects/'),

  // Periods
  getPeriods: () => api.get('/auth/academics/periods/'),
  createPeriod: (data: any) => api.post('/auth/academics/periods/', data),
  updatePeriod: (id: string, data: any) => api.put(`/auth/academics/periods/${id}/`, data),
  deletePeriod: (id: string) => api.delete(`/auth/academics/periods/${id}/`),

  // Classrooms
  getClassrooms: () => api.get('/auth/academics/classrooms/'),
  createClassroom: (data: any) => api.post('/auth/academics/classrooms/', data),
  updateClassroom: (id: string, data: any) => api.put(`/auth/academics/classrooms/${id}/`, data),
  deleteClassroom: (id: string) => api.delete(`/auth/academics/classrooms/${id}/`),

  // Timetable Entries
  getTimetableEntries: (params?: any) => api.get('/auth/academics/timetable-entries/', { params }),
  getAllTimetableEntries: async () => {
    let allEntries: any[] = [];
    let nextUrl = '/auth/academics/timetable-entries/?page_size=500';
    while (nextUrl) {
      const response = await api.get(nextUrl);
      const data = response.data;
      if (Array.isArray(data)) {
        allEntries = allEntries.concat(data);
        nextUrl = '';
      } else {
        allEntries = allEntries.concat(data.results || []);
        nextUrl = data.next ? data.next.replace(/^.*\/api\//, '/') : '';
      }
    }
    return { data: allEntries };
  },
  createTimetableEntry: (data: any) => api.post('/auth/academics/timetable-entries/', data),
  updateTimetableEntry: (id: string, data: any) => api.put(`/auth/academics/timetable-entries/${id}/`, data),
  deleteTimetableEntry: (id: string) => api.delete(`/auth/academics/timetable-entries/${id}/`),

  // Syllabus & Curriculum
  getSyllabi: (params?: any) => api.get('/auth/academics/syllabus/', { params }),
  getSyllabusUnits: (params?: any) => api.get('/auth/academics/syllabus-units/', { params }),
  getSyllabusTopics: (params?: any) => api.get('/auth/academics/syllabus-topics/', { params }),

  // Lesson Plans
  getLessonPlans: (params?: any) => api.get('/auth/academics/lesson-plans/', { params }),
  createLessonPlan: (data: any) => api.post('/auth/academics/lesson-plans/', data),
  updateLessonPlan: (id: string, data: any) => api.put(`/auth/academics/lesson-plans/${id}/`, data),
  deleteLessonPlan: (id: string) => api.delete(`/auth/academics/lesson-plans/${id}/`),

  // Topic Coverage
  getTopicCoverages: (params?: any) => api.get('/auth/academics/topic-coverage/', { params }),
  createTopicCoverage: (data: any) => api.post('/auth/academics/topic-coverage/', data),
  updateTopicCoverage: (id: string, data: any) => api.put(`/auth/academics/topic-coverage/${id}/`, data),
  deleteTopicCoverage: (id: string) => api.delete(`/auth/academics/topic-coverage/${id}/`),

  // Student Topic Progress
  getStudentTopicProgress: (params?: any) => api.get('/auth/academics/student-topic-progress/', { params }),
  createStudentTopicProgress: (data: any) => api.post('/auth/academics/student-topic-progress/', data),
  updateStudentTopicProgress: (id: string, data: any) => api.put(`/auth/academics/student-topic-progress/${id}/`, data),
  deleteStudentTopicProgress: (id: string) => api.delete(`/auth/academics/student-topic-progress/${id}/`),

  // Teacher Feedback
  getTeacherFeedbacks: (params?: any) => api.get('/auth/academics/teacher-feedback/', { params }),
  createTeacherFeedback: (data: any) => api.post('/auth/academics/teacher-feedback/', data),
  deleteTeacherFeedback: (id: string) => api.delete(`/auth/academics/teacher-feedback/${id}/`),
};

export default academicService;
