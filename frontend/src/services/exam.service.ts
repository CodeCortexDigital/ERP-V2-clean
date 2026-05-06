import api from './api';

export interface Exam {
  id: string;
  exam_code: string;
  title: string;
  exam_type: string;
  class_ref: string;
  class_name?: string;
  subject: string;
  subject_name?: string;
  total_marks: number;
  passing_marks: number;
  exam_date: string;
  term: string;
  description?: string;
  is_published: boolean;
}

export interface ExamResult {
  id: string;
  exam: string;
  exam_title?: string;
  student: string;
  student_name?: string;
  student_id?: string;
  obtained_marks: number;
  percentage?: number;
  grade?: string;
  is_pass?: boolean;
  remarks?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const examService = {
  // Exams
  getExams: (params?: any) => api.get('/auth/exams/', { params }),
  getExam: (id: string) => api.get(`/auth/exams/${id}/`),
  createExam: (data: Partial<Exam>) => api.post('/auth/exams/', data),
  updateExam: (id: string, data: Partial<Exam>) => api.put(`/auth/exams/${id}/`, data),
  deleteExam: (id: string) => api.delete(`/auth/exams/${id}/`),
  
  // Results - Using the working direct endpoint from backend
  getResults: () => {
    // Use the direct endpoint that we confirmed works
    return api.get('/exams-results/');
  },
  createResult: (data: { exam: string; student: string; obtained_marks: number }) => 
    api.post('/auth/exams/results/create/', data),
  deleteResult: (resultId: string) => api.delete(`/auth/exams/results/${resultId}/delete/`),
  
  // Bulk operations
  bulkEnterResults: (examId: string, results: any[]) => 
    api.post(`/auth/exams/${examId}/bulk-results/`, { results }),
  getExamSummary: (examId: string) => api.get(`/auth/exams/${examId}/summary/`),
};

export default examService;
