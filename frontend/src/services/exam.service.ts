import api, { extractListData } from './api';

export interface Exam {
  id: string;
  exam_code: string;
  title: string;
  exam_type: 'mid_term' | 'final_term' | 'quiz' | 'test' | 'practical' | 'others';
  class_ref: string;
  class_name?: string;
  subject: string;
  subject_name?: string;
  total_marks: number;
  passing_marks: number;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  term: string;
  academic_year?: string;
  description?: string;
  is_published: boolean;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface ExamResult {
  id: string;
  exam: string;
  exam_title?: string;
  student: string;
  student_name?: string;
  student_id?: string;
  class_name?: string;
  obtained_marks: number;
  percentage?: number;
  grade?: string;
  is_pass?: boolean;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExamSummary {
  total_students: number;
  total_passed: number;
  total_failed: number;
  pass_percentage: number;
  average_marks: number;
  highest_marks: number;
  lowest_marks: number;
  grade_distribution: {
    grade: string;
    count: number;
  }[];
}

// Helper to normalize exam data
const normalizeExam = (exam: any): Exam => ({
  ...exam,
  id: String(exam.id),
  exam_code: exam.exam_code || exam.code || '',
  title: exam.title || exam.name || '',
  class_ref: String(exam.class_ref || exam.class_id || ''),
  class_name: exam.class_name || exam.class__name || '',
  subject: String(exam.subject || ''),
  subject_name: exam.subject_name || exam.subject__name || '',
  total_marks: Number(exam.total_marks) || 0,
  passing_marks: Number(exam.passing_marks) || 0,
  is_published: exam.is_published ?? false,
  status: exam.status || 'scheduled',
});

const normalizeExamList = (exams: any[]): Exam[] => exams.map(normalizeExam);

// Helper to normalize exam result data
const normalizeResult = (result: any): ExamResult => ({
  ...result,
  id: String(result.id),
  exam: String(result.exam),
  exam_title: result.exam_title || result.exam__title || '',
  student: String(result.student),
  student_name: result.student_name || result.student__full_name || '',
  student_id: result.student_id || '',
  class_name: result.class_name || result.class__name || '',
  obtained_marks: Number(result.obtained_marks) || 0,
  percentage: result.percentage || (result.obtained_marks && result.total_marks ? 
    (result.obtained_marks / result.total_marks) * 100 : 0),
  grade: result.grade || '',
  is_pass: result.is_pass ?? (result.obtained_marks >= result.passing_marks),
});

const normalizeResultList = (results: any[]): ExamResult[] => results.map(normalizeResult);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const examService = {
  // ==================== Exams ====================
  getExams: async (params?: { 
    class_id?: string; 
    subject?: string; 
    term?: string;
    status?: string;
    academic_year?: string;
    is_published?: boolean;
    search?: string;
  }) => {
    const response = await api.get('/auth/exams/', { params });
    if (response.data) {
      const exams = extractListData<Exam>(response.data);
      response.data = normalizeExamList(exams);
    }
    return response;
  },
  
  getExam: async (id: string) => {
    const response = await api.get(`/auth/exams/${id}/`);
    if (response.data) {
      response.data = normalizeExam(response.data);
    }
    return response;
  },
  
  getExamByCode: async (code: string) => {
    const response = await api.get('/auth/exams/', { params: { exam_code: code } });
    if (response.data) {
      const exams = extractListData<Exam>(response.data);
      response.data = normalizeExamList(exams);
    }
    return response;
  },
  
  getExamsByClass: async (classId: string) => {
    const response = await api.get('/auth/exams/', { params: { class_ref: classId } });
    if (response.data) {
      const exams = extractListData<Exam>(response.data);
      response.data = normalizeExamList(exams);
    }
    return response;
  },
  
  createExam: async (data: Partial<Exam>) => {
    const response = await api.post('/auth/exams/', data);
    if (response.data) {
      response.data = normalizeExam(response.data);
    }
    return response;
  },
  
  updateExam: async (id: string, data: Partial<Exam>) => {
    const response = await api.patch(`/auth/exams/${id}/`, data);
    if (response.data) {
      response.data = normalizeExam(response.data);
    }
    return response;
  },
  
  deleteExam: async (id: string) => {
    const response = await api.delete(`/auth/exams/${id}/`);
    return response;
  },
  
  publishExam: async (id: string) => {
    const response = await api.post(`/auth/exams/${id}/publish/`);
    return response;
  },
  
  unpublishExam: async (id: string) => {
    const response = await api.post(`/auth/exams/${id}/unpublish/`);
    return response;
  },

  // ==================== Results ====================
  getResults: async (params?: { 
    exam_id?: string; 
    student_id?: string; 
    class_id?: string;
    grade?: string;
  }) => {
    const response = await api.get('/exams-results/', { params });
    if (response.data) {
      const results = extractListData<ExamResult>(response.data);
      response.data = normalizeResultList(results);
    }
    return response;
  },
  
  getResultsByExam: async (examId: string) => {
    const response = await api.get('/exams-results/', { params: { exam: examId } });
    if (response.data) {
      const results = extractListData<ExamResult>(response.data);
      response.data = normalizeResultList(results);
    }
    return response;
  },
  
  getResultsByStudent: async (studentId: string) => {
    const response = await api.get('/exams-results/', { params: { student: studentId } });
    if (response.data) {
      const results = extractListData<ExamResult>(response.data);
      response.data = normalizeResultList(results);
    }
    return response;
  },
  
  getResult: async (id: string) => {
    const response = await api.get(`/auth/exams/results/${id}/`);
    if (response.data) {
      response.data = normalizeResult(response.data);
    }
    return response;
  },
  
  createResult: async (data: { exam: string; student: string; obtained_marks: number; remarks?: string }) => {
    const response = await api.post('/auth/exams/results/create/', data);
    if (response.data) {
      response.data = normalizeResult(response.data);
    }
    return response;
  },
  
  updateResult: async (id: string, data: Partial<ExamResult>) => {
    const response = await api.patch(`/auth/exams/results/${id}/`, data);
    if (response.data) {
      response.data = normalizeResult(response.data);
    }
    return response;
  },
  
  deleteResult: async (resultId: string) => {
    const response = await api.delete(`/auth/exams/results/${resultId}/delete/`);
    return response;
  },

  // ==================== Bulk Operations ====================
  bulkEnterResults: async (examId: string, results: Array<{ student: string; obtained_marks: number; remarks?: string }>) => {
    const response = await api.post(`/auth/exams/${examId}/bulk-results/`, { results });
    return response;
  },
  
  bulkUpdateResults: async (examId: string, results: Array<{ id: string; obtained_marks: number; remarks?: string }>) => {
    const response = await api.post(`/auth/exams/${examId}/bulk-update/`, { results });
    return response;
  },

  // ==================== Summary & Reports ====================
  getExamSummary: async (examId: string) => {
    const response = await api.get(`/auth/exams/${examId}/summary/`);
    return response;
  },
  
  getClassExamSummary: async (classId: string, term?: string) => {
    const params: any = { class_id: classId };
    if (term) params.term = term;
    const response = await api.get('/auth/exams/summary/class/', { params });
    return response;
  },
  
  getStudentExamSummary: async (studentId: string, term?: string) => {
    const params: any = {};
    if (term) params.term = term;
    const response = await api.get(`/auth/exams/summary/student/${studentId}/`, { params });
    return response;
  },

  // ==================== Analytics ====================
  getExamAnalytics: async (params?: { 
    class_id?: string; 
    academic_year?: string; 
    term?: string 
  }) => {
    const response = await api.get('/auth/exams/analytics/', { params });
    return response;
  },
  
  getGradeDistribution: async (examId: string) => {
    const response = await api.get(`/auth/exams/${examId}/grade-distribution/`);
    return response;
  },
  
  getPerformanceTrends: async (studentId: string, classId?: string) => {
    const params: any = { student_id: studentId };
    if (classId) params.class_id = classId;
    const response = await api.get('/auth/exams/trends/', { params });
    return response;
  },

  // ==================== Export ====================
  exportExamResults: async (examId: string, format: 'csv' | 'pdf' = 'csv') => {
    const response = await api.get(`/auth/exams/${examId}/export/${format}/`, { 
      responseType: 'blob' 
    });
    return response;
  },
  
  exportClassResults: async (classId: string, term?: string, format: 'csv' | 'pdf' = 'csv') => {
    const params: any = { class_id: classId };
    if (term) params.term = term;
    const response = await api.get('/auth/exams/export/class/', { 
      params,
      responseType: 'blob' 
    });
    return response;
  },

  // ==================== Student Report Card ====================
  generateReportCard: async (studentId: string, term?: string, academicYear?: string) => {
    const params: any = {};
    if (term) params.term = term;
    if (academicYear) params.academic_year = academicYear;
    const response = await api.get(`/auth/exams/report-card/${studentId}/`, { 
      params,
      responseType: 'blob' 
    });
    return response;
  },

  // ==================== Grade Settings ====================
  getGradeScale: async (params?: { academic_year?: string }) => {
    const response = await api.get('/auth/exams/grade-scale/', { params });
    return response;
  },
  
  updateGradeScale: async (data: any) => {
    const response = await api.post('/auth/exams/grade-scale/', data);
    return response;
  }
};

export default examService;