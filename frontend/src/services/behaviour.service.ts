import api, { extractListData } from './api';

export interface Skill {
  id: string;
  name: string;
  domain: 'affective' | 'psychomotor';
  description: string;
  max_rating: number;
  is_active: boolean;
  order: number;
}

export interface BehaviourRating {
  id: string;
  student: string;
  student_name?: string;
  student_id?: string;
  class_ref: string;
  class_name?: string;
  teacher?: string;
  teacher_name?: string;
  domain: 'affective' | 'psychomotor';
  term: string;
  month: string;
  academic_year: string;
  ratings: Record<string, number>;
  not_observed: Record<string, boolean>;
  rewards: string[];
  plans: string[];
  ai_teacher_rec: string;
  ai_parent_rec: string;
  comments: string;
  created_at?: string;
  updated_at?: string;
}

export interface Observation {
  id: string;
  observation_type: 'incident' | 'meeting' | 'counselling';
  student?: string;
  student_name?: string;
  class_ref?: string;
  class_name?: string;
  teacher?: string;
  teacher_name?: string;
  title: string;
  description: string;
  date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  parent_notified: boolean;
  action_taken: string;
  follow_up_date?: string;
  participants: string[];
  outcome: string;
  created_at?: string;
  updated_at?: string;
}

const behaviourService = {
  // ==================== Skills ====================
  getSkills: async (params?: { domain?: string }) => {
    const response = await api.get('/education/behaviour/skills/', { params });
    return { ...response, data: extractListData<Skill>(response.data) };
  },

  createSkill: async (data: Partial<Skill>) => {
    const response = await api.post('/education/behaviour/skills/', data);
    return response;
  },

  updateSkill: async (id: string, data: Partial<Skill>) => {
    const response = await api.patch(`/education/behaviour/skills/${id}/`, data);
    return response;
  },

  deleteSkill: async (id: string) => {
    const response = await api.delete(`/education/behaviour/skills/${id}/`);
    return response;
  },

  // ==================== Behaviour Ratings ====================
  getRatings: async (params?: { student?: string; student_id?: string; class_ref?: string; domain?: string; term?: string; month?: string; academic_year?: string }) => {
    const response = await api.get('/education/behaviour/ratings/', { params });
    return { ...response, data: extractListData<BehaviourRating>(response.data) };
  },

  createRating: async (data: Partial<BehaviourRating>) => {
    const response = await api.post('/education/behaviour/ratings/', data);
    return response;
  },

  updateRating: async (id: string, data: Partial<BehaviourRating>) => {
    const response = await api.patch(`/education/behaviour/ratings/${id}/`, data);
    return response;
  },

  deleteRating: async (id: string) => {
    const response = await api.delete(`/education/behaviour/ratings/${id}/`);
    return response;
  },

  bulkCreateRatings: async (ratings: Array<Partial<BehaviourRating>>) => {
    const response = await api.post('/education/behaviour/ratings/bulk_create/', { ratings });
    return response;
  },

  // ==================== Observations ====================
  getObservations: async (params?: { type?: string; student_id?: string; class_id?: string; severity?: string }) => {
    const response = await api.get('/education/behaviour/observations/', { params });
    return { ...response, data: extractListData<Observation>(response.data) };
  },

  createObservation: async (data: Partial<Observation>) => {
    const response = await api.post('/education/behaviour/observations/', data);
    return response;
  },

  updateObservation: async (id: string, data: Partial<Observation>) => {
    const response = await api.patch(`/education/behaviour/observations/${id}/`, data);
    return response;
  },

  deleteObservation: async (id: string) => {
    const response = await api.delete(`/education/behaviour/observations/${id}/`);
    return response;
  },
};

export default behaviourService;
