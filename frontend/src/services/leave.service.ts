// frontend/src/services/leave.service.ts
import api, { extractListData } from './api';

export interface TeacherLeave {
  id: string;
  teacher?: string;
  teacher_name?: string;
  applicant_name?: string;
  applicant_email?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: string;
  created_at?: string;
}

export const leaveService = {
  /** GET /auth/academics/teacher-leaves/ — current employee's leave records */
  getLeaves: async (): Promise<TeacherLeave[]> => {
    try {
      const res = await api.get('/auth/academics/teacher-leaves/');
      return extractListData<TeacherLeave>(res.data);
    } catch {
      return [];
    }
  },
  /** POST /auth/academics/teacher-leaves/ — apply for leave */
  applyLeave: async (data: Partial<TeacherLeave>): Promise<TeacherLeave> => {
    const res = await api.post('/auth/academics/teacher-leaves/', data);
    return res.data;
  },
};

export default leaveService;
