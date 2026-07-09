import api, { extractListData } from './api';

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
  department?: string;
  prerequisites?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

class CourseService {
  private baseUrl = '/auth/courses/';

  // Get all courses with optional filters
  async getAll(params?: { 
    is_active?: boolean; 
    level?: string; 
    department?: string;
    search?: string;
  }): Promise<Course[]> {
    const response = await api.get(this.baseUrl, { params });
    return extractListData<Course>(response.data);
  }

  // Get a single course by ID
  async getById(id: string): Promise<Course> {
    const response = await api.get(`${this.baseUrl}${id}/`);
    return response.data;
  }

  // Get course by code
  async getByCode(code: string): Promise<Course[]> {
    const response = await api.get(this.baseUrl, { params: { code } });
    return extractListData<Course>(response.data);
  }

  // Get active courses only
  async getActive(): Promise<Course[]> {
    const response = await api.get(this.baseUrl, { params: { is_active: true } });
    return extractListData<Course>(response.data);
  }

  // Create a new course
  async create(data: Partial<Course>): Promise<Course> {
    const response = await api.post(this.baseUrl, data);
    return response.data;
  }

  // Update a course
  async update(id: string, data: Partial<Course>): Promise<Course> {
    const response = await api.patch(`${this.baseUrl}${id}/`, data);
    return response.data;
  }

  // Delete a course
  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}${id}/`);
  }

  // Bulk create courses
  async bulkCreate(courses: Partial<Course>[]): Promise<Course[]> {
    const response = await api.post(`${this.baseUrl}bulk/`, courses);
    return response.data;
  }

  // Search courses
  async search(query: string): Promise<Course[]> {
    const response = await api.get(this.baseUrl, { params: { search: query } });
    return extractListData<Course>(response.data);
  }

  // Get course statistics
  async getStatistics(): Promise<{ total: number; active: number; by_level: any }> {
    const response = await api.get(`${this.baseUrl}statistics/`);
    return response.data;
  }
}

export default new CourseService();