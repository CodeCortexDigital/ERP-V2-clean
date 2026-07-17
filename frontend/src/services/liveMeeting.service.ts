import api from './api';

export interface LiveMeeting {
  id: string;
  code: string;
  title: string;
  meeting_with: 'all' | 'class' | 'teachers';
  class_ref: string | null;
  date: string;
  time: string;
  duration: string;
  message: string;
  is_active: boolean;
  created_by: string | null;
  created_by_name?: string;
  class_name?: string;
  created_at: string;
  updated_at: string;
}

class LiveMeetingService {
  private baseUrl = '/auth/academics/live-meetings/';

  async getMeetings(): Promise<LiveMeeting[]> {
    const res = await api.get(this.baseUrl);
    return res.data.results || res.data;
  }

  async getMeeting(id: string): Promise<LiveMeeting> {
    const res = await api.get(`${this.baseUrl}${id}/`);
    return res.data;
  }

  async createMeeting(data: Partial<LiveMeeting>): Promise<LiveMeeting> {
    const res = await api.post(this.baseUrl, data);
    return res.data;
  }

  async updateMeeting(id: string, data: Partial<LiveMeeting>): Promise<LiveMeeting> {
    const res = await api.put(`${this.baseUrl}${id}/`, data);
    return res.data;
  }

  async deleteMeeting(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}${id}/`);
  }
}

export const liveMeetingService = new LiveMeetingService();
