import api from './api';

export interface Syllabus {
  id: string;
  title: string;
  description?: string;
  academic_year?: string;
  is_active: boolean;
}

export interface SyllabusUnit {
  id: string;
  syllabus: string;
  title: string;
  description?: string;
  order?: number;
  is_active: boolean;
}

export interface SyllabusTopic {
  id: string;
  unit: string;
  title: string;
  summary?: string;
  order?: number;
  is_active: boolean;
}

export interface SyllabusSubTopic {
  id: string;
  topic: string;
  title: string;
  summary?: string;
  is_active: boolean;
}

export interface LearningResource {
  id: string;
  title: string;
  resource_type: string;
  url?: string;
  file?: string;
  related_topic?: string;
  description?: string;
  is_active: boolean;
}

const curriculumService = {
  getSyllabi: () => api.get<Syllabus[]>('/auth/academics/syllabi/'),
  createSyllabus: (data: Partial<Syllabus>) => api.post('/auth/academics/syllabi/', data),
  updateSyllabus: (id: string, data: Partial<Syllabus>) => api.put(`/auth/academics/syllabi/${id}/`, data),
  deleteSyllabus: (id: string) => api.delete(`/auth/academics/syllabi/${id}/`),

  getSyllabusUnits: () => api.get<SyllabusUnit[]>('/auth/academics/syllabus-units/'),
  createSyllabusUnit: (data: Partial<SyllabusUnit>) => api.post('/auth/academics/syllabus-units/', data),
  updateSyllabusUnit: (id: string, data: Partial<SyllabusUnit>) => api.put(`/auth/academics/syllabus-units/${id}/`, data),
  deleteSyllabusUnit: (id: string) => api.delete(`/auth/academics/syllabus-units/${id}/`),

  getSyllabusTopics: () => api.get<SyllabusTopic[]>('/auth/academics/syllabus-topics/'),
  createSyllabusTopic: (data: Partial<SyllabusTopic>) => api.post('/auth/academics/syllabus-topics/', data),
  updateSyllabusTopic: (id: string, data: Partial<SyllabusTopic>) => api.put(`/auth/academics/syllabus-topics/${id}/`, data),
  deleteSyllabusTopic: (id: string) => api.delete(`/auth/academics/syllabus-topics/${id}/`),

  getSyllabusSubTopics: () => api.get<SyllabusSubTopic[]>('/auth/academics/syllabus-subtopics/'),
  createSyllabusSubTopic: (data: Partial<SyllabusSubTopic>) => api.post('/auth/academics/syllabus-subtopics/', data),
  updateSyllabusSubTopic: (id: string, data: Partial<SyllabusSubTopic>) => api.put(`/auth/academics/syllabus-subtopics/${id}/`, data),
  deleteSyllabusSubTopic: (id: string) => api.delete(`/auth/academics/syllabus-subtopics/${id}/`),

  getLearningResources: () => api.get<LearningResource[]>('/auth/academics/learning-resources/'),
  createLearningResource: (data: FormData | Partial<LearningResource>) => api.post('/auth/academics/learning-resources/', data),
  deleteLearningResource: (id: string) => api.delete(`/auth/academics/learning-resources/${id}/`),
};

export default curriculumService;
